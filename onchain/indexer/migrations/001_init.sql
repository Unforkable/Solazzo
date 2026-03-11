-- Solazzo Indexer Schema v1 — requires fresh DB (no migration from prior versions).
-- All timestamps are unix seconds (INTEGER).
-- Bigint fields (lamports, lampsec) are stored as TEXT (decimal strings)
-- to avoid SQLite's 64-bit INTEGER overflow at extreme scale.
-- All arithmetic on these fields happens in TypeScript BigInt.

-- Ingestion cursor: tracks which Solana slots have been processed.
-- Used for incremental ingestion and safe restart.
CREATE TABLE IF NOT EXISTS cursor (
  id         INTEGER PRIMARY KEY CHECK (id = 1),  -- singleton row
  last_slot  INTEGER NOT NULL DEFAULT 0,           -- last fully processed Solana slot
  updated_at INTEGER NOT NULL DEFAULT 0            -- unix timestamp of last update
);
INSERT OR IGNORE INTO cursor (id, last_slot, updated_at) VALUES (1, 0, 0);

-- Raw events: immutable append-only log for replay and audit.
-- Unique constraint on (tx_sig, log_index) ensures idempotent ingestion.
CREATE TABLE IF NOT EXISTS raw_events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  tx_sig     TEXT    NOT NULL,                     -- base58 transaction signature
  log_index  INTEGER NOT NULL,                     -- position within tx logs (0-based)
  slot       INTEGER NOT NULL,                     -- Solana slot number
  block_time INTEGER NOT NULL,                     -- unix timestamp from block
  event_type TEXT    NOT NULL,                     -- e.g. 'SlotClaimed', 'SlotDisplaced'
  payload    TEXT    NOT NULL,                     -- JSON-encoded event fields
  UNIQUE(tx_sig, log_index)
);
CREATE INDEX IF NOT EXISTS idx_raw_events_slot ON raw_events(slot);
CREATE INDEX IF NOT EXISTS idx_raw_events_type ON raw_events(event_type);

-- Slot ownership intervals: each row is one continuous period of ownership.
-- An open interval has end_ts = NULL (holder is still active).
-- Closed intervals have end_ts set (holder was displaced or protocol settled).
CREATE TABLE IF NOT EXISTS slot_intervals (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  slot_id        INTEGER NOT NULL,                 -- conviction slot 0..999
  owner          TEXT    NOT NULL,                  -- wallet pubkey base58
  lock_lamports  TEXT    NOT NULL,                  -- SOL locked (in lamports), decimal string
  start_ts       INTEGER NOT NULL,                 -- unix timestamp when interval began
  end_ts         INTEGER,                          -- unix timestamp when interval ended (NULL = active)
  points_lampsec TEXT    NOT NULL DEFAULT '0',      -- lamport-seconds accrued in this interval, decimal string
  source_tx      TEXT    NOT NULL,                  -- tx_sig that opened this interval
  close_tx       TEXT,                              -- tx_sig that closed this interval (NULL = active)
  UNIQUE(slot_id, start_ts)                        -- a slot can only have one owner at a given start time
);
CREATE INDEX IF NOT EXISTS idx_intervals_owner ON slot_intervals(owner);
CREATE INDEX IF NOT EXISTS idx_intervals_open ON slot_intervals(end_ts) WHERE end_ts IS NULL;

-- Wallet points ledger: aggregated points per wallet.
-- Updated incrementally as intervals are closed or recomputed.
CREATE TABLE IF NOT EXISTS wallet_points (
  wallet           TEXT    PRIMARY KEY,             -- pubkey base58
  total_lampsec    TEXT    NOT NULL DEFAULT '0',     -- sum of all closed interval lamport-seconds, decimal string
  active_lampsec   TEXT    NOT NULL DEFAULT '0',     -- lamport-seconds from open intervals, decimal string
  active_lamports  TEXT    NOT NULL DEFAULT '0',     -- sum of lock_lamports in open intervals, decimal string
  active_start_ts  INTEGER NOT NULL DEFAULT 0,      -- earliest open interval start_ts (for live calc)
  updated_at       INTEGER NOT NULL DEFAULT 0       -- last recomputation timestamp
);

-- Block identity per Solana slot: used for reorg/fork detection.
-- A mismatch in blockhash for a non-finalized slot triggers rollback.
-- Finalized slots (older than tip - CONFIRMATION_DEPTH) reject reorg attempts.
CREATE TABLE IF NOT EXISTS slot_blocks (
  slot        INTEGER PRIMARY KEY,                   -- Solana slot number
  blockhash   TEXT    NOT NULL,                      -- base58 blockhash
  parent_slot INTEGER,                               -- parent slot for chain continuity
  block_time  INTEGER,                               -- unix timestamp from block
  ingested_at INTEGER NOT NULL                       -- unix timestamp when we first indexed this slot
);
