import Database from "better-sqlite3";
import * as fs from "fs";
import * as path from "path";

export interface RawEvent {
  txSig: string;
  logIndex: number;
  slot: number;
  blockTime: number;
  eventType: string;
  payload: Record<string, unknown>;
}

export interface SlotInterval {
  id?: number;
  slotId: number;
  owner: string;
  lockLamports: bigint;
  startTs: number;
  endTs: number | null;
  pointsLampsec: bigint;
  sourceTx: string;
  closeTx: string | null;
}

export interface WalletPoints {
  wallet: string;
  totalLampsec: bigint;
  activeLampsec: bigint;
  activeLamports: bigint;
  activeStartTs: number;
  updatedAt: number;
}

export interface SlotBlockMeta {
  slot: number;
  blockhash: string;
  parentSlot?: number;
  blockTime?: number;
  ingestedAt?: number;
}

/** Default confirmation depth. Slots older than tip - CONFIRMATION_DEPTH are considered finalized. */
export const CONFIRMATION_DEPTH = 32;

export class SolazzoDb {
  readonly db: Database.Database;

  constructor(dbPath: string = ":memory:") {
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.migrate();
  }

  private migrate(): void {
    const migrationPath = path.join(__dirname, "..", "migrations", "001_init.sql");
    const sql = fs.readFileSync(migrationPath, "utf-8");
    this.db.exec(sql);
  }

  // ── Cursor ──

  getCursor(): { lastSlot: number; updatedAt: number } {
    const row = this.db
      .prepare("SELECT last_slot, updated_at FROM cursor WHERE id = 1")
      .get() as { last_slot: number; updated_at: number };
    return { lastSlot: row.last_slot, updatedAt: row.updated_at };
  }

  setCursor(lastSlot: number, updatedAt: number): void {
    this.db
      .prepare("UPDATE cursor SET last_slot = ?, updated_at = ? WHERE id = 1")
      .run(lastSlot, updatedAt);
  }

  // ── Raw Events ──

  /** Insert a raw event. Returns true if inserted, false if duplicate (idempotent). */
  insertRawEvent(event: RawEvent): boolean {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO raw_events (tx_sig, log_index, slot, block_time, event_type, payload)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      event.txSig,
      event.logIndex,
      event.slot,
      event.blockTime,
      event.eventType,
      JSON.stringify(event.payload)
    );
    return result.changes > 0;
  }

  getRawEvents(fromSlot?: number, toSlot?: number): RawEvent[] {
    let sql = "SELECT * FROM raw_events";
    const params: number[] = [];
    if (fromSlot !== undefined && toSlot !== undefined) {
      sql += " WHERE slot >= ? AND slot <= ?";
      params.push(fromSlot, toSlot);
    }
    sql += " ORDER BY slot ASC, log_index ASC";
    const rows = this.db.prepare(sql).all(...params) as Array<{
      tx_sig: string;
      log_index: number;
      slot: number;
      block_time: number;
      event_type: string;
      payload: string;
    }>;
    return rows.map((r) => ({
      txSig: r.tx_sig,
      logIndex: r.log_index,
      slot: r.slot,
      blockTime: r.block_time,
      eventType: r.event_type,
      payload: JSON.parse(r.payload),
    }));
  }

  getRawEventCount(): number {
    const row = this.db
      .prepare("SELECT COUNT(*) as cnt FROM raw_events")
      .get() as { cnt: number };
    return row.cnt;
  }

  // ── Slot Intervals ──

  /** Open a new ownership interval for a slot. Idempotent via UNIQUE(slot_id, start_ts). */
  openInterval(interval: Omit<SlotInterval, "id" | "endTs" | "pointsLampsec" | "closeTx">): boolean {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO slot_intervals (slot_id, owner, lock_lamports, start_ts, end_ts, points_lampsec, source_tx, close_tx)
      VALUES (?, ?, ?, ?, NULL, 0, ?, NULL)
    `);
    const result = stmt.run(
      interval.slotId,
      interval.owner,
      interval.lockLamports.toString(),
      interval.startTs,
      interval.sourceTx
    );
    return result.changes > 0;
  }

  /** Close an open interval for a slot. Returns the closed interval or null if not found. */
  closeInterval(slotId: number, endTs: number, closeTx: string): SlotInterval | null {
    // Find the open interval for this slot
    const row = this.db
      .prepare(
        "SELECT * FROM slot_intervals WHERE slot_id = ? AND end_ts IS NULL ORDER BY start_ts DESC LIMIT 1"
      )
      .get(slotId) as any;
    if (!row) return null;

    const lockLamports = BigInt(row.lock_lamports);
    const duration = BigInt(endTs - row.start_ts);
    const pointsLampsec = lockLamports * duration;

    this.db
      .prepare(
        "UPDATE slot_intervals SET end_ts = ?, points_lampsec = ?, close_tx = ? WHERE id = ?"
      )
      .run(endTs, pointsLampsec.toString(), closeTx, row.id);

    return {
      id: row.id,
      slotId: row.slot_id,
      owner: row.owner,
      lockLamports,
      startTs: row.start_ts,
      endTs: endTs,
      pointsLampsec,
      sourceTx: row.source_tx,
      closeTx,
    };
  }

  /** Close ALL open intervals (used on settlement). Returns closed intervals. */
  closeAllIntervals(endTs: number, closeTx: string): SlotInterval[] {
    const rows = this.db
      .prepare("SELECT * FROM slot_intervals WHERE end_ts IS NULL")
      .all() as any[];

    const closed: SlotInterval[] = [];
    const stmt = this.db.prepare(
      "UPDATE slot_intervals SET end_ts = ?, points_lampsec = ?, close_tx = ? WHERE id = ?"
    );

    for (const row of rows) {
      const lockLamports = BigInt(row.lock_lamports);
      const duration = BigInt(endTs - row.start_ts);
      const pointsLampsec = lockLamports * duration;
      stmt.run(endTs, pointsLampsec.toString(), closeTx, row.id);
      closed.push({
        id: row.id,
        slotId: row.slot_id,
        owner: row.owner,
        lockLamports,
        startTs: row.start_ts,
        endTs,
        pointsLampsec,
        sourceTx: row.source_tx,
        closeTx,
      });
    }
    return closed;
  }

  getOpenIntervals(): SlotInterval[] {
    const rows = this.db
      .prepare("SELECT * FROM slot_intervals WHERE end_ts IS NULL ORDER BY slot_id ASC")
      .all() as any[];
    return rows.map(this.mapInterval);
  }

  getAllIntervals(): SlotInterval[] {
    const rows = this.db
      .prepare("SELECT * FROM slot_intervals ORDER BY slot_id ASC, start_ts ASC")
      .all() as any[];
    return rows.map(this.mapInterval);
  }

  private mapInterval(row: any): SlotInterval {
    return {
      id: row.id,
      slotId: row.slot_id,
      owner: row.owner,
      lockLamports: BigInt(row.lock_lamports),
      startTs: row.start_ts,
      endTs: row.end_ts,
      pointsLampsec: BigInt(row.points_lampsec),
      sourceTx: row.source_tx,
      closeTx: row.close_tx,
    };
  }

  // ── Wallet Points ──

  /** Recompute wallet_points from all closed intervals. Wipes and rebuilds. */
  recomputeWalletPoints(nowTs?: number): void {
    const now = nowTs ?? Math.floor(Date.now() / 1000);

    this.db.exec("DELETE FROM wallet_points");

    // Sum closed interval points per wallet in JS (not SQL) to avoid SQLite numeric overflow
    const closedRows = this.db
      .prepare(`
        SELECT owner, points_lampsec
        FROM slot_intervals
        WHERE end_ts IS NOT NULL
      `)
      .all() as Array<{ owner: string; points_lampsec: string }>;

    const walletMap = new Map<
      string,
      { totalLampsec: bigint; activeLampsec: bigint; activeLamports: bigint; activeStartTs: number }
    >();

    for (const row of closedRows) {
      const existing = walletMap.get(row.owner);
      const pts = BigInt(row.points_lampsec);
      if (existing) {
        existing.totalLampsec += pts;
      } else {
        walletMap.set(row.owner, {
          totalLampsec: pts,
          activeLampsec: 0n,
          activeLamports: 0n,
          activeStartTs: 0,
        });
      }
    }

    // Add active interval contributions
    const openRows = this.db
      .prepare("SELECT * FROM slot_intervals WHERE end_ts IS NULL")
      .all() as any[];

    for (const row of openRows) {
      const owner = row.owner as string;
      const lockLamports = BigInt(row.lock_lamports);
      const duration = BigInt(now - row.start_ts);
      const activePts = lockLamports * duration;

      const existing = walletMap.get(owner) ?? {
        totalLampsec: 0n,
        activeLampsec: 0n,
        activeLamports: 0n,
        activeStartTs: 0,
      };
      existing.activeLampsec += activePts;
      existing.activeLamports += lockLamports;
      if (existing.activeStartTs === 0 || row.start_ts < existing.activeStartTs) {
        existing.activeStartTs = row.start_ts;
      }
      walletMap.set(owner, existing);
    }

    // Insert into wallet_points
    const stmt = this.db.prepare(`
      INSERT INTO wallet_points (wallet, total_lampsec, active_lampsec, active_lamports, active_start_ts, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const [wallet, pts] of walletMap) {
      stmt.run(
        wallet,
        pts.totalLampsec.toString(),
        pts.activeLampsec.toString(),
        pts.activeLamports.toString(),
        pts.activeStartTs,
        now
      );
    }
  }

  /** Get leaderboard: wallets ranked by total points (closed + active at given time). */
  getLeaderboard(limit: number = 10, nowTs?: number): Array<{
    rank: number;
    wallet: string;
    totalLampsec: bigint;
    activeLampsec: bigint;
    combinedLampsec: bigint;
    solHours: string;
  }> {
    this.recomputeWalletPoints(nowTs);

    // Load all rows and sort in JS using BigInt to avoid SQLite numeric overflow
    const rows = this.db
      .prepare("SELECT wallet, total_lampsec, active_lampsec FROM wallet_points")
      .all() as Array<{
      wallet: string;
      total_lampsec: string;
      active_lampsec: string;
    }>;

    const ranked = rows
      .map((r) => {
        const total = BigInt(r.total_lampsec);
        const active = BigInt(r.active_lampsec);
        const combined = total + active;
        return { wallet: r.wallet, totalLampsec: total, activeLampsec: active, combinedLampsec: combined };
      })
      .sort((a, b) => {
        if (b.combinedLampsec > a.combinedLampsec) return 1;
        if (b.combinedLampsec < a.combinedLampsec) return -1;
        return a.wallet < b.wallet ? -1 : a.wallet > b.wallet ? 1 : 0; // deterministic tie-break
      })
      .slice(0, limit);

    return ranked.map((r, i) => ({
      rank: i + 1,
      wallet: r.wallet,
      totalLampsec: r.totalLampsec,
      activeLampsec: r.activeLampsec,
      combinedLampsec: r.combinedLampsec,
      solHours: formatSolHours(r.combinedLampsec),
    }));
  }

  // ── Slot Blocks (reorg detection) ──

  /** Read-only block status check. Does NOT write to DB. */
  checkSlotBlock(slot: number, blockhash: string): "new" | "match" | "mismatch" {
    const existing = this.db
      .prepare("SELECT blockhash FROM slot_blocks WHERE slot = ?")
      .get(slot) as { blockhash: string } | undefined;
    if (!existing) return "new";
    return existing.blockhash === blockhash ? "match" : "mismatch";
  }

  /** Insert or check block identity for a slot. Returns 'new' | 'match' | 'mismatch'. */
  upsertSlotBlock(meta: SlotBlockMeta): "new" | "match" | "mismatch" {
    const existing = this.db
      .prepare("SELECT blockhash FROM slot_blocks WHERE slot = ?")
      .get(meta.slot) as { blockhash: string } | undefined;

    if (!existing) {
      this.db
        .prepare(
          "INSERT INTO slot_blocks (slot, blockhash, parent_slot, block_time, ingested_at) VALUES (?, ?, ?, ?, ?)"
        )
        .run(
          meta.slot,
          meta.blockhash,
          meta.parentSlot ?? null,
          meta.blockTime ?? null,
          meta.ingestedAt ?? Math.floor(Date.now() / 1000)
        );
      return "new";
    }

    return existing.blockhash === meta.blockhash ? "match" : "mismatch";
  }

  getSlotBlock(slot: number): SlotBlockMeta | null {
    const row = this.db
      .prepare("SELECT * FROM slot_blocks WHERE slot = ?")
      .get(slot) as any;
    if (!row) return null;
    return {
      slot: row.slot,
      blockhash: row.blockhash,
      parentSlot: row.parent_slot ?? undefined,
      blockTime: row.block_time ?? undefined,
      ingestedAt: row.ingested_at,
    };
  }

  getLatestSlotBlock(): SlotBlockMeta | null {
    const row = this.db
      .prepare("SELECT * FROM slot_blocks ORDER BY slot DESC LIMIT 1")
      .get() as any;
    if (!row) return null;
    return {
      slot: row.slot,
      blockhash: row.blockhash,
      parentSlot: row.parent_slot ?? undefined,
      blockTime: row.block_time ?? undefined,
      ingestedAt: row.ingested_at,
    };
  }

  getSlotBlockCount(): number {
    const row = this.db
      .prepare("SELECT COUNT(*) as cnt FROM slot_blocks")
      .get() as { cnt: number };
    return row.cnt;
  }

  /** Finalized slot boundary: latest tracked slot minus confirmation depth. */
  getFinalizedBoundary(confirmationDepth: number = CONFIRMATION_DEPTH): number {
    const latest = this.getLatestSlotBlock();
    if (!latest) return 0;
    return Math.max(0, latest.slot - confirmationDepth);
  }

  /**
   * Rollback all data from forkSlot onward (inclusive).
   * Deletes raw_events, slot_blocks, and wipes derived state (intervals + wallet_points).
   * Cursor is reset to forkSlot - 1.
   * Caller must rebuild derived state from remaining raw_events afterward.
   */
  rollbackFromSlot(forkSlot: number): { eventsDeleted: number; blocksDeleted: number } {
    const txn = this.db.transaction(() => {
      const eventsResult = this.db
        .prepare("DELETE FROM raw_events WHERE slot >= ?")
        .run(forkSlot);
      const blocksResult = this.db
        .prepare("DELETE FROM slot_blocks WHERE slot >= ?")
        .run(forkSlot);

      // Wipe derived state — will be rebuilt by caller
      this.db.exec("DELETE FROM wallet_points");
      this.db.exec("DELETE FROM slot_intervals");

      // Reset cursor to just before the fork
      const newCursor = forkSlot > 0 ? forkSlot - 1 : 0;
      this.db
        .prepare("UPDATE cursor SET last_slot = ?, updated_at = ? WHERE id = 1")
        .run(newCursor, Math.floor(Date.now() / 1000));

      return {
        eventsDeleted: eventsResult.changes,
        blocksDeleted: blocksResult.changes,
      };
    });
    return txn();
  }

  /** Reset entire DB for rebuild from scratch. */
  reset(): void {
    this.db.exec("DELETE FROM wallet_points");
    this.db.exec("DELETE FROM slot_intervals");
    this.db.exec("DELETE FROM raw_events");
    this.db.exec("DELETE FROM slot_blocks");
    this.db.exec("UPDATE cursor SET last_slot = 0, updated_at = 0 WHERE id = 1");
  }

  close(): void {
    this.db.close();
  }
}

/**
 * Convert lamport-seconds to human-readable SOL-hours.
 * 1 SOL = 1e9 lamports, 1 hour = 3600 seconds.
 * SOL-hours = lamport-seconds / (1e9 * 3600)
 */
export function formatSolHours(lampsec: bigint): string {
  const LAMPORTS_PER_SOL = 1_000_000_000n;
  const SECONDS_PER_HOUR = 3600n;
  const divisor = LAMPORTS_PER_SOL * SECONDS_PER_HOUR;

  const whole = lampsec / divisor;
  const remainder = lampsec % divisor;
  // 2 decimal places
  const frac = (remainder * 100n) / divisor;
  return `${whole}.${frac.toString().padStart(2, "0")}`;
}
