import { SolazzoDb, RawEvent, SlotBlockMeta, CONFIRMATION_DEPTH } from "./db";
import { SolazzoEvent, eventToPayload, payloadToEvent } from "./decoder";

export interface IngestResult {
  eventsIngested: number;
  eventsDuplicate: number;
  intervalsOpened: number;
  intervalsClosed: number;
  slotsRolledBack: number;
  reorgDetected: boolean;
}

export interface IngestOptions {
  /** Block identity per slot. Required for reorg detection. */
  blocks?: SlotBlockMeta[];
  /** Confirmation depth override. Default: CONFIRMATION_DEPTH (32). */
  confirmations?: number;
}

/** Thrown when a reorg targets a slot at or below the finalized boundary. */
export class DeepReorgError extends Error {
  constructor(
    public readonly forkSlot: number,
    public readonly finalizedBoundary: number
  ) {
    super(
      `Deep reorg detected at slot ${forkSlot} (finalized boundary: ${finalizedBoundary}). ` +
        `Refusing to auto-rollback finalized history. Manual intervention required.`
    );
    this.name = "DeepReorgError";
  }
}

/**
 * Process a batch of decoded events into the database.
 *
 * This is the core ingestion logic. It:
 * 1. Checks block metadata for forks (if provided via options.blocks)
 * 2. Stores raw events (idempotent via UNIQUE constraint)
 * 3. Translates SlotClaimed → open interval
 * 4. Translates SlotDisplaced → close old interval + open new interval
 * 5. Translates Settled → close all open intervals
 *
 * Reorg handling (when options.blocks provided):
 * - Read-only scan detects earliest blockhash mismatch (zero writes during detection).
 * - Finality boundary = max(persisted tip, incoming tip) - confirmations.
 * - Mismatch in non-finalized window → rollback from fork slot, rebuild, then ingest.
 * - Mismatch at or below finalized boundary → throws DeepReorgError with zero DB side effects.
 * - If options.blocks are omitted, no fork detection occurs (backward compatible).
 *
 * Safe to replay: duplicate events are skipped, intervals use UNIQUE(slot_id, start_ts).
 *
 * ORDERING ASSUMPTION: Events must be provided in on-chain order
 * (ascending slot, then ascending log_index within a slot).
 * This matches Solana's transaction ordering guarantees.
 */
export function ingestEvents(
  db: SolazzoDb,
  events: Array<{
    txSig: string;
    logIndex: number;
    slot: number;
    blockTime: number;
    event: SolazzoEvent;
  }>,
  options?: IngestOptions
): IngestResult {
  const result: IngestResult = {
    eventsIngested: 0,
    eventsDuplicate: 0,
    intervalsOpened: 0,
    intervalsClosed: 0,
    slotsRolledBack: 0,
    reorgDetected: false,
  };

  const confirmations = options?.confirmations ?? CONFIRMATION_DEPTH;

  // ── Phase 1: Fork detection via block metadata ──
  if (options?.blocks && options.blocks.length > 0) {
    const sortedBlocks = [...options.blocks].sort((a, b) => a.slot - b.slot);

    // Step 1: Read-only scan for earliest fork (zero DB writes)
    let forkSlot: number | null = null;
    for (const block of sortedBlocks) {
      const status = db.checkSlotBlock(block.slot, block.blockhash);
      if (status === "mismatch") {
        forkSlot = block.slot;
        break;
      }
    }

    // Step 2: If fork found, check finality using effective tip (persisted + incoming)
    if (forkSlot !== null) {
      const persistedTip = db.getLatestSlotBlock()?.slot ?? 0;
      const incomingTip = sortedBlocks[sortedBlocks.length - 1].slot;
      const effectiveTip = Math.max(persistedTip, incomingTip);
      const boundary = Math.max(0, effectiveTip - confirmations);

      if (forkSlot <= boundary) {
        // Deep reorg — throw immediately with zero DB writes
        throw new DeepReorgError(forkSlot, boundary);
      }

      // Step 3: Non-finalized fork — rollback + rebuild
      result.reorgDetected = true;
      const rollback = db.rollbackFromSlot(forkSlot);
      result.slotsRolledBack = rollback.blocksDeleted;
      rebuildDerivedState(db);
    }

    // Step 4: Persist all block metadata
    // Safe: deep reorg throws before here; non-finalized fork already rolled back.
    for (const block of sortedBlocks) {
      db.upsertSlotBlock(block);
    }
  }

  // ── Phase 2: Ingest events ──
  const transaction = db.db.transaction(() => {
    for (const item of events) {
      // 1. Store raw event (idempotent)
      const rawEvent: RawEvent = {
        txSig: item.txSig,
        logIndex: item.logIndex,
        slot: item.slot,
        blockTime: item.blockTime,
        eventType: item.event.type,
        payload: eventToPayload(item.event),
      };

      const inserted = db.insertRawEvent(rawEvent);
      if (!inserted) {
        result.eventsDuplicate++;
        continue; // Skip processing — already ingested
      }
      result.eventsIngested++;

      // 2. Process event into intervals
      applyEventToIntervals(db, item.event, item.txSig, result);
    }
  });

  transaction();
  return result;
}

/** Apply a single event to interval state. Mutates result counters. */
function applyEventToIntervals(
  db: SolazzoDb,
  event: SolazzoEvent,
  txSig: string,
  result: { intervalsOpened: number; intervalsClosed: number }
): void {
  switch (event.type) {
    case "SlotClaimed": {
      const opened = db.openInterval({
        slotId: event.slotId,
        owner: event.owner,
        lockLamports: event.lockLamports,
        startTs: event.ts,
        sourceTx: txSig,
      });
      if (opened) result.intervalsOpened++;
      break;
    }

    case "SlotDisplaced": {
      const closed = db.closeInterval(event.slotId, event.ts, txSig);
      if (closed) result.intervalsClosed++;

      const opened = db.openInterval({
        slotId: event.slotId,
        owner: event.newOwner,
        lockLamports: event.newLockLamports,
        startTs: event.ts,
        sourceTx: txSig,
      });
      if (opened) result.intervalsOpened++;
      break;
    }

    case "Settled": {
      const closed = db.closeAllIntervals(event.ts, txSig);
      result.intervalsClosed += closed.length;
      break;
    }

    // ClaimCredited, Claimed, SettlementWindowStarted, SettlementWindowReset:
    // Stored in raw_events for audit, but don't affect intervals or points.
    default:
      break;
  }
}

/** Rebuild slot_intervals from raw_events. Used internally after rollback. */
function rebuildDerivedState(db: SolazzoDb): void {
  db.db.exec("DELETE FROM wallet_points");
  db.db.exec("DELETE FROM slot_intervals");

  const rawEvents = db.getRawEvents();
  const counter = { intervalsOpened: 0, intervalsClosed: 0 };

  const transaction = db.db.transaction(() => {
    for (const raw of rawEvents) {
      const event = payloadToEvent(raw.payload) as SolazzoEvent;
      applyEventToIntervals(db, event, raw.txSig, counter);
    }
  });

  transaction();
}

/**
 * Rebuild the entire database from raw events.
 * Wipes intervals and wallet points, then replays all raw events.
 */
export function rebuildFromRawEvents(db: SolazzoDb): IngestResult {
  // Clear derived data but keep raw events
  db.db.exec("DELETE FROM wallet_points");
  db.db.exec("DELETE FROM slot_intervals");

  // Re-read all raw events in order
  const rawEvents = db.getRawEvents();

  const result: IngestResult = {
    eventsIngested: 0,
    eventsDuplicate: 0,
    intervalsOpened: 0,
    intervalsClosed: 0,
    slotsRolledBack: 0,
    reorgDetected: false,
  };

  const transaction = db.db.transaction(() => {
    for (const raw of rawEvents) {
      const event = payloadToEvent(raw.payload) as SolazzoEvent;
      result.eventsIngested++;
      applyEventToIntervals(db, event, raw.txSig, result);
    }
  });

  transaction();
  return result;
}
