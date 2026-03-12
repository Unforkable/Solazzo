use anchor_lang::prelude::*;

#[error_code]
pub enum SolazzoError {
    // ── Canonical v1 numeric param mismatches ──
    #[msg("Slot count must equal 1000")]
    NonCanonicalSlotCount,

    #[msg("Minimum lock must equal 1_000_000_000 lamports (1 SOL)")]
    NonCanonicalMinLock,

    #[msg("Minimum increment must equal 1_000_000_000 lamports (1 SOL)")]
    NonCanonicalMinIncrement,

    #[msg("Displacement fee must equal 100_000_000 lamports (0.1 SOL)")]
    NonCanonicalDisplacementFee,

    #[msg("Settle window must equal 3600 seconds")]
    NonCanonicalSettleWindow,

    #[msg("Settlement threshold must equal 100_000_000_000 (Pyth e8 for $1000)")]
    NonCanonicalSettleThreshold,

    #[msg("Oracle max staleness must equal 90 seconds")]
    NonCanonicalOracleStaleness,

    #[msg("Oracle max confidence must equal 100 BPS (1%)")]
    NonCanonicalOracleConfidence,

    #[msg("Settlement deadline must equal 1899849600 (2030-03-16T00:00:00Z)")]
    NonCanonicalSettleDeadline,

    // ── Pubkey validation ──
    #[msg("Admin multisig pubkey must not be the default address")]
    InvalidAdminMultisig,

    #[msg("Treasury account pubkey must not be the default address")]
    InvalidTreasuryAccount,

    #[msg("Oracle feed pubkey must not be the default address")]
    InvalidOracleFeed,

    // ── claim_unfilled_slot ──
    #[msg("Protocol is paused")]
    ProtocolPaused,

    #[msg("Protocol is already settled")]
    ProtocolSettled,

    #[msg("All slots are already filled")]
    SlotsAlreadyFull,

    #[msg("Slot ID is out of range (must be < slot_count)")]
    InvalidSlotId,

    #[msg("Slot is already occupied")]
    SlotAlreadyOccupied,

    #[msg("Lock amount is below the minimum")]
    LockBelowMinimum,

    // ── Admin ──
    #[msg("Signer is not the admin authority")]
    Unauthorized,

    // ── displace_lowest ──
    #[msg("All slots must be filled before displacement")]
    CollectionNotFull,

    #[msg("Expected lowest slot_id does not match actual lowest")]
    ExpectedLowestMismatch,

    #[msg("Expected lowest lock_lamports does not match actual lowest")]
    ExpectedLowestLockMismatch,

    #[msg("New lock must exceed lowest lock + min_increment")]
    InsufficientDisplacementIncrement,

    #[msg("Cannot displace yourself")]
    SelfDisplacementNotAllowed,

    #[msg("Claimable balance owner does not match displaced slot owner")]
    ClaimableBalanceOwnerMismatch,

    // ── claim ──
    #[msg("No claimable balance to withdraw")]
    NoClaimableBalance,

    // ── settle_if_threshold_met ──
    #[msg("Protocol is already settled")]
    AlreadySettled,

    #[msg("Oracle feed account does not match protocol config")]
    InvalidOracleFeedAccount,

    // ── General ──
    #[msg("Displacement fee must be less than minimum lock amount")]
    FeeTooHigh,

    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
}
