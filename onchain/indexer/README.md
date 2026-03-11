# Solazzo Indexer

Replay-safe, idempotent event indexer for the Solazzo on-chain protocol. Computes conviction points from SlotClaimed/SlotDisplaced/Settled events.

## Setup

```bash
cd onchain/indexer
npm install
```

## Run Tests

```bash
npm test
```

## CLI

```bash
# Show leaderboard (top 10)
npx ts-node src/cli.ts leaderboard --db ./solazzo-indexer.db

# Show DB status
npx ts-node src/cli.ts status --db ./solazzo-indexer.db

# Rebuild intervals + points from raw events
npx ts-node src/cli.ts rebuild --db ./solazzo-indexer.db

# Reset (wipe all data)
npx ts-node src/cli.ts reset --db ./solazzo-indexer.db
```

## Points Format

**Internal:** lamport-seconds (`lock_lamports * duration_seconds`)
- Integer-safe, no floating point
- Maximum precision: 1 lamport held for 1 second = 1 lampsec

**Display:** SOL-hours (`lampsec / 3.6e12`)
- 1 SOL-hour = 1 SOL locked for 1 hour = 3,600,000,000,000 lampsec

**Rationale:** lamport-seconds is the natural unit that avoids all rounding. Every other representation (SOL-hours, SOL-days) is a lossy display conversion. Using bigint throughout ensures no precision loss even at extreme scale (1000 slots * 1000 SOL * years).

## Architecture

```
src/
  decoder.ts    — Anchor event log parser (IDL-based discriminator matching)
  db.ts         — SQLite persistence (better-sqlite3, WAL mode)
  ingest.ts     — Event → interval transitions + reorg detection + idempotent ingestion
  cli.ts        — CLI commands (leaderboard, rebuild, status, reset)
migrations/
  001_init.sql  — Schema: cursor, raw_events, slot_intervals, wallet_points, slot_blocks
test/
  indexer.test.ts — Unit + idempotency + replay + reorg tests
```

## Ordering Assumptions

Events must be ingested in on-chain order: ascending Solana slot, then ascending log_index within a slot. This matches Solana's transaction ordering guarantees. The ingestion engine does not reorder events.

## Idempotency

- Raw events have `UNIQUE(tx_sig, log_index)` — duplicates are silently skipped
- Slot intervals have `UNIQUE(slot_id, start_ts)` — duplicate opens are no-ops
- Re-ingesting the same event batch produces identical DB state
- `rebuild` command replays all raw events from scratch, producing the same derived state

## Finality & Reorg Handling

### Finality Policy

The indexer uses a confirmation-depth model (default: 32 slots). The finality boundary is computed using the **effective tip**:

```
effectiveTip = max(persisted tip in DB, max slot in incoming batch)
finalizedBoundary = max(0, effectiveTip - CONFIRMATION_DEPTH)
```

This ensures that a batch containing a high slot number correctly classifies older slots as finalized, even if the DB hasn't caught up yet.

Non-finalized slots are tracked in the `slot_blocks` table with their blockhash for fork detection. To enable reorg detection, pass `options.blocks` (array of `SlotBlockMeta`) to `ingestEvents()`. Without block metadata, no fork detection occurs (backward compatible).

### Rollback Semantics

When a non-finalized slot is re-ingested with a **different blockhash**:

1. **Detect**: read-only scan finds earliest mismatching slot (zero DB writes during scan)
2. **Finality check**: if fork slot <= finalized boundary, throw `DeepReorgError` with zero side effects
3. **Rollback**: all data from fork slot onward deleted atomically (raw_events, slot_blocks, slot_intervals, wallet_points)
4. **Rebuild**: derived state (intervals) reconstructed from remaining raw_events
5. **Persist**: block metadata written only after rollback succeeds
6. **Replay**: new canonical events ingested normally

Cursor is reset to `forkSlot - 1` during rollback.

### Deep Reorg Protection

If a blockhash mismatch is detected for a **finalized** slot (at or below the finality boundary), the indexer throws `DeepReorgError` with **zero DB side effects** — no slot_blocks inserted, no raw_events modified, no cursor change. Manual intervention is required:

```bash
# Nuclear option: wipe and re-index from scratch
npx ts-node src/cli.ts reset --db ./solazzo-indexer.db
```

### Schema Version

Schema v1 (`001_init.sql`) requires a fresh database. There is no migration path from prior versions. Delete the DB file and re-index from genesis if the schema changes.
