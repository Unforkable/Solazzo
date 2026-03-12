//! Canonical v1 protocol constants (from spec Section 15).

/// Total number of conviction slots.
pub const SLOT_COUNT: u16 = 1000;

/// Minimum SOL to lock into a slot (1 SOL in lamports).
pub const MIN_LOCK_LAMPORTS: u64 = 1_000_000_000;

/// Minimum additional SOL above current lowest to displace (1 SOL in lamports).
pub const MIN_INCREMENT_LAMPORTS: u64 = 1_000_000_000;

/// Fee paid to treasury on each displacement (0.1 SOL in lamports).
pub const DISPLACEMENT_FEE_LAMPORTS: u64 = 100_000_000;

/// Price threshold for settlement: $1000 SOL/USD in Pyth e8 format.
pub const SETTLE_THRESHOLD_PRICE_E8: i64 = 100_000_000_000;

/// Sustained oracle window required before settlement (seconds).
pub const SETTLE_WINDOW_SEC: u32 = 3600;

/// Maximum oracle staleness before rejecting price data (seconds).
pub const ORACLE_MAX_STALENESS_SEC: u32 = 90;

/// Maximum oracle confidence band as basis points of price (100 = 1%).
pub const ORACLE_MAX_CONF_BPS: u16 = 100;

/// Global settlement deadline: 2030-03-16T00:00:00Z (Unix timestamp).
/// Protocol settles unconditionally at or after this time, regardless of oracle price.
pub const SETTLE_DEADLINE_TS: i64 = 1_899_849_600;

// PDA seeds
pub const PROTOCOL_CONFIG_SEED: &[u8] = b"protocol_config";
pub const VAULT_SEED: &[u8] = b"vault";
pub const SLOT_SEED: &[u8] = b"slot";
pub const CLAIMABLE_BALANCE_SEED: &[u8] = b"claimable_balance";
pub const SLOT_BOOK_SEED: &[u8] = b"slot_book";

/// Expected Pyth price exponent for SOL/USD (e8 format).
pub const PYTH_EXPECTED_EXPO: i32 = -8;
