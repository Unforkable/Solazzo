use anchor_lang::prelude::*;

/// Global protocol configuration (singleton PDA).
///
/// Seeds: ["protocol_config"]
/// Size: 8 (discriminator) + 161 = 169 bytes
#[account]
#[derive(InitSpace)]
pub struct ProtocolConfig {
    /// Multisig authority for admin operations (pause, parameter changes).
    pub admin_multisig: Pubkey, // 32
    /// Treasury account that receives displacement fees.
    pub treasury_account: Pubkey, // 32
    /// Pyth SOL/USD oracle feed address.
    pub oracle_feed_pubkey: Pubkey, // 32
    /// Total slot count (must be 1000 in v1).
    pub slot_count: u16, // 2
    /// Number of currently occupied slots.
    pub slots_filled: u16, // 2
    /// Minimum lamports to lock when claiming a slot.
    pub min_lock_lamports: u64, // 8
    /// Minimum lamports above current lowest required for displacement.
    pub min_increment_lamports: u64, // 8
    /// Fee in lamports paid to treasury on each displacement.
    pub displacement_fee_lamports: u64, // 8
    /// Emergency pause flag (blocks new claims/displacements, never blocks claim()).
    pub is_paused: bool, // 1
    /// Settlement latch (irreversible once set).
    pub is_settled: bool, // 1
    /// Max seconds an oracle observation can be stale.
    pub oracle_max_staleness_sec: u32, // 4
    /// Max oracle confidence as basis points of price.
    pub oracle_max_conf_bps: u16, // 2
    /// Settlement price threshold in Pyth e8 format ($1000 = 100_000_000_000).
    pub settle_threshold_price_e8: i64, // 8
    /// Seconds oracle must sustain threshold before settlement triggers.
    pub settle_window_sec: u32, // 4
    /// Timestamp when oracle first met threshold (0 if inactive).
    pub first_valid_settle_ts: i64, // 8
    /// Global settlement deadline (Unix timestamp). Protocol settles unconditionally at/after this time.
    pub settle_deadline_ts: i64, // 8
    /// PDA bump seed.
    pub bump: u8, // 1
}

/// Vault account for principal custody (singleton PDA).
///
/// Seeds: ["vault"]
/// Size: 8 (discriminator) + 1 = 9 bytes
#[account]
#[derive(InitSpace)]
pub struct Vault {
    /// PDA bump seed (needed for signing transfers out).
    pub bump: u8, // 1
}

/// Per-slot conviction account (PDA per slot ID).
///
/// Seeds: ["slot", slot_id.to_le_bytes()]
/// Size: 8 (discriminator) + 52 = 60 bytes
#[account]
#[derive(InitSpace)]
pub struct Slot {
    /// Slot index (0..999).
    pub slot_id: u16, // 2
    /// Current owner wallet (Pubkey::default() when empty).
    pub owner: Pubkey, // 32
    /// SOL locked in this slot (lamports).
    pub locked_lamports: u64, // 8
    /// Unix timestamp when current lock began.
    pub lock_started_at: i64, // 8
    /// Whether this slot is currently occupied.
    pub is_occupied: bool, // 1
    /// PDA bump seed.
    pub bump: u8, // 1
}

/// Singleton slot book tracking all slot lock amounts and occupancy.
///
/// Seeds: ["slot_book"]
/// Size: 8 (discriminator) + 4 + 8*1000 + 4 + 1*1000 + 1 = 9017 bytes
#[account]
#[derive(InitSpace)]
pub struct SlotBook {
    /// Lock amount (lamports) for each slot. 0 = empty.
    #[max_len(1000)]
    pub locks: Vec<u64>,
    /// 1 = occupied, 0 = empty for each slot.
    #[max_len(1000)]
    pub occupied: Vec<u8>,
    /// PDA bump seed.
    pub bump: u8,
}

/// Per-wallet claimable balance ledger (PDA per owner).
///
/// Seeds: ["claimable_balance", owner.as_ref()]
/// Size: 8 (discriminator) + 49 = 57 bytes
#[account]
#[derive(InitSpace)]
pub struct ClaimableBalance {
    /// Wallet that owns this balance.
    pub owner: Pubkey, // 32
    /// Lamports available to withdraw via claim().
    pub claimable_lamports: u64, // 8
    /// Last time this balance was updated.
    pub last_updated_at: i64, // 8
    /// PDA bump seed.
    pub bump: u8, // 1
}
