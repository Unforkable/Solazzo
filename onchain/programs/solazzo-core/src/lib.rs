use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_lang::AccountDeserialize;
use pyth_solana_receiver_sdk::price_update::PriceUpdateV2;

pub mod constants;
pub mod error;
pub mod state;

use constants::{
    CLAIMABLE_BALANCE_SEED, PROTOCOL_CONFIG_SEED, SLOT_BOOK_SEED, SLOT_SEED, VAULT_SEED,
};
use error::SolazzoError;
use state::{ClaimableBalance, ProtocolConfig, Slot, SlotBook, Vault};

declare_id!("52xHAYaQW1ywhdhNjxg1LvJvsEHpPBrK1J9Aud371hHC");

// ---------------------------------------------------------------------------
// Pyth oracle helper (outside #[program] — not an instruction)
// ---------------------------------------------------------------------------

struct OracleObservation {
    price_e8: i64,
}

/// Verify the oracle account owner is a canonical Pyth program.
/// Accepts both Pyth Receiver (pull) and Pyth Push Oracle programs,
/// as both create PriceUpdateV2 accounts.
fn is_pyth_program_owner(owner: &Pubkey) -> bool {
    *owner == pyth_solana_receiver_sdk::ID
        || *owner == pyth_solana_receiver_sdk::PYTH_PUSH_ORACLE_ID
}

/// Parse a Pyth PriceUpdateV2 account and validate the observation.
///
/// Returns `None` (invalid observation) if:
/// - Account owner is not a recognized Pyth program
/// - Data fails PriceUpdateV2 deserialization (wrong discriminator, too short, malformed)
/// - Exponent is not -8 (e8 format)
/// - Price is non-positive
/// - Observation is stale (exceeds max staleness)
/// - Confidence band is too wide (exceeds max confidence BPS)
fn parse_pyth_price(
    oracle_info: &AccountInfo,
    config: &ProtocolConfig,
    now: i64,
) -> Option<OracleObservation> {
    // Owner verification: must be the Pyth Receiver program
    if !is_pyth_program_owner(oracle_info.owner) {
        return None;
    }

    // Deserialize via official Pyth SDK (checks Anchor discriminator)
    let data = oracle_info.try_borrow_data().ok()?;
    let mut data_ref: &[u8] = &data;
    let price_update = PriceUpdateV2::try_deserialize(&mut data_ref).ok()?;

    let msg = &price_update.price_message;

    // Exponent must match expected e8 format
    if msg.exponent != constants::PYTH_EXPECTED_EXPO {
        return None;
    }

    // Price must be positive
    if msg.price <= 0 {
        return None;
    }

    // Staleness check
    let age = now.checked_sub(msg.publish_time)?;
    if age < 0 || age > config.oracle_max_staleness_sec as i64 {
        return None;
    }

    // Confidence ratio: conf_bps = (conf * 10000) / price
    let conf_bps = (msg.conf as u128)
        .checked_mul(10_000)?
        .checked_div(msg.price as u128)?;
    if conf_bps > config.oracle_max_conf_bps as u128 {
        return None;
    }

    Some(OracleObservation {
        price_e8: msg.price,
    })
}

#[program]
pub mod solazzo_core {
    use super::*;

    /// Initialize the Solazzo protocol with canonical v1 parameters.
    ///
    /// Creates the singleton protocol config PDA, vault PDA, and slot book PDA.
    /// Can only be called once (PDA init enforces singleton).
    pub fn initialize_protocol(
        ctx: Context<InitializeProtocol>,
        params: InitializeProtocolParams,
    ) -> Result<()> {
        // --- Enforce canonical v1 numeric params ---
        require!(
            params.slot_count == constants::SLOT_COUNT,
            SolazzoError::NonCanonicalSlotCount
        );
        require!(
            params.min_lock_lamports == constants::MIN_LOCK_LAMPORTS,
            SolazzoError::NonCanonicalMinLock
        );
        require!(
            params.min_increment_lamports == constants::MIN_INCREMENT_LAMPORTS,
            SolazzoError::NonCanonicalMinIncrement
        );
        require!(
            params.displacement_fee_lamports == constants::DISPLACEMENT_FEE_LAMPORTS,
            SolazzoError::NonCanonicalDisplacementFee
        );
        require!(
            params.settle_window_sec == constants::SETTLE_WINDOW_SEC,
            SolazzoError::NonCanonicalSettleWindow
        );
        require!(
            params.settle_threshold_price_e8 == constants::SETTLE_THRESHOLD_PRICE_E8,
            SolazzoError::NonCanonicalSettleThreshold
        );
        require!(
            params.oracle_max_staleness_sec == constants::ORACLE_MAX_STALENESS_SEC,
            SolazzoError::NonCanonicalOracleStaleness
        );
        require!(
            params.oracle_max_conf_bps == constants::ORACLE_MAX_CONF_BPS,
            SolazzoError::NonCanonicalOracleConfidence
        );
        require!(
            params.settle_deadline_ts == constants::SETTLE_DEADLINE_TS,
            SolazzoError::NonCanonicalSettleDeadline
        );

        // --- Validate pubkeys are not default (zero address) ---
        require!(
            params.admin_multisig != Pubkey::default(),
            SolazzoError::InvalidAdminMultisig
        );
        require!(
            params.treasury_account != Pubkey::default(),
            SolazzoError::InvalidTreasuryAccount
        );
        require!(
            params.oracle_feed_pubkey != Pubkey::default(),
            SolazzoError::InvalidOracleFeed
        );

        // --- Persist config ---
        let config = &mut ctx.accounts.protocol_config;
        config.admin_multisig = params.admin_multisig;
        config.treasury_account = params.treasury_account;
        config.oracle_feed_pubkey = params.oracle_feed_pubkey;
        config.slot_count = params.slot_count;
        config.slots_filled = 0;
        config.min_lock_lamports = params.min_lock_lamports;
        config.min_increment_lamports = params.min_increment_lamports;
        config.displacement_fee_lamports = params.displacement_fee_lamports;
        config.is_paused = false;
        config.is_settled = false;
        config.oracle_max_staleness_sec = params.oracle_max_staleness_sec;
        config.oracle_max_conf_bps = params.oracle_max_conf_bps;
        config.settle_threshold_price_e8 = params.settle_threshold_price_e8;
        config.settle_window_sec = params.settle_window_sec;
        config.first_valid_settle_ts = 0;
        config.settle_deadline_ts = params.settle_deadline_ts;
        config.bump = ctx.bumps.protocol_config;

        // --- Persist vault bump ---
        ctx.accounts.vault.bump = ctx.bumps.vault;

        // --- Initialize slot book ---
        let slot_book = &mut ctx.accounts.slot_book;
        slot_book.locks = vec![0u64; 1000];
        slot_book.occupied = vec![0u8; 1000];
        slot_book.bump = ctx.bumps.slot_book;

        msg!("Solazzo protocol initialized");
        Ok(())
    }

    /// Claim an unfilled slot during the fill phase.
    ///
    /// Transfers `lock_lamports` from the claimer to the vault PDA,
    /// marks the slot as occupied, and updates the slot book.
    pub fn claim_unfilled_slot(
        ctx: Context<ClaimUnfilledSlot>,
        slot_id: u16,
        lock_lamports: u64,
    ) -> Result<()> {
        let clock = Clock::get()?;

        // --- Protocol state guards ---
        require!(
            !ctx.accounts.protocol_config.is_paused,
            SolazzoError::ProtocolPaused
        );
        require!(
            !ctx.accounts.protocol_config.is_settled,
            SolazzoError::ProtocolSettled
        );
        require!(
            ctx.accounts.protocol_config.slots_filled < ctx.accounts.protocol_config.slot_count,
            SolazzoError::SlotsAlreadyFull
        );

        // --- Param validation ---
        require!(
            slot_id < ctx.accounts.protocol_config.slot_count,
            SolazzoError::InvalidSlotId
        );
        require!(
            lock_lamports >= ctx.accounts.protocol_config.min_lock_lamports,
            SolazzoError::LockBelowMinimum
        );

        // --- Transfer SOL from claimer to vault ---
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.claimer.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                },
            ),
            lock_lamports,
        )?;

        // --- Populate slot ---
        let slot = &mut ctx.accounts.slot;
        slot.slot_id = slot_id;
        slot.owner = ctx.accounts.claimer.key();
        slot.locked_lamports = lock_lamports;
        slot.lock_started_at = clock.unix_timestamp;
        slot.is_occupied = true;
        slot.bump = ctx.bumps.slot;

        // --- Update slot book ---
        let slot_book = &mut ctx.accounts.slot_book;
        slot_book.locks[slot_id as usize] = lock_lamports;
        slot_book.occupied[slot_id as usize] = 1;

        // --- Increment filled counter ---
        let new_filled = ctx
            .accounts
            .protocol_config
            .slots_filled
            .checked_add(1)
            .ok_or(SolazzoError::ArithmeticOverflow)?;
        ctx.accounts.protocol_config.slots_filled = new_filled;

        // --- Emit event ---
        emit!(SlotClaimed {
            slot_id,
            owner: ctx.accounts.claimer.key(),
            lock_lamports,
            ts: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Displace the lowest-conviction slot holder.
    ///
    /// Deterministically scans the SlotBook for the lowest lock (tie-break: lowest slot_id).
    /// Uses optimistic concurrency via `expected_slot_id` and `expected_lowest_lamports`.
    /// Credits the displaced owner's ClaimableBalance with their principal.
    /// Routes the displacement fee to the treasury.
    pub fn displace_lowest(
        ctx: Context<DisplaceLowest>,
        expected_slot_id: u16,
        expected_lowest_lamports: u64,
        new_lock_lamports: u64,
    ) -> Result<()> {
        let clock = Clock::get()?;
        let config = &ctx.accounts.protocol_config;

        // --- Protocol state guards ---
        require!(!config.is_paused, SolazzoError::ProtocolPaused);
        require!(!config.is_settled, SolazzoError::ProtocolSettled);
        require!(
            config.slots_filled == config.slot_count,
            SolazzoError::CollectionNotFull
        );

        // --- Scan SlotBook for deterministic lowest ---
        let slot_book = &ctx.accounts.slot_book;
        let mut lowest_id: u16 = 0;
        let mut lowest_lock: u64 = u64::MAX;

        for i in 0..config.slot_count as usize {
            if slot_book.occupied[i] == 1 && slot_book.locks[i] < lowest_lock {
                lowest_lock = slot_book.locks[i];
                lowest_id = i as u16;
            }
        }

        // --- Optimistic concurrency guards ---
        require!(
            expected_slot_id == lowest_id,
            SolazzoError::ExpectedLowestMismatch
        );
        require!(
            expected_lowest_lamports == lowest_lock,
            SolazzoError::ExpectedLowestLockMismatch
        );

        // --- Validate displacement increment ---
        let min_required = lowest_lock
            .checked_add(config.min_increment_lamports)
            .ok_or(SolazzoError::ArithmeticOverflow)?;
        require!(
            new_lock_lamports >= min_required,
            SolazzoError::InsufficientDisplacementIncrement
        );
        require!(
            new_lock_lamports >= config.min_lock_lamports,
            SolazzoError::LockBelowMinimum
        );

        // --- Self-displacement check ---
        let displaced_owner = ctx.accounts.slot.owner;
        require!(
            ctx.accounts.challenger.key() != displaced_owner,
            SolazzoError::SelfDisplacementNotAllowed
        );

        let fee = config.displacement_fee_lamports;

        // --- Transfer new_lock_lamports from challenger to vault ---
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.challenger.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                },
            ),
            new_lock_lamports,
        )?;

        // --- Transfer displacement fee from challenger to treasury ---
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.challenger.to_account_info(),
                    to: ctx.accounts.treasury.to_account_info(),
                },
            ),
            fee,
        )?;

        // --- Credit displaced owner's ClaimableBalance ---
        let cb = &mut ctx.accounts.claimable_balance;
        cb.claimable_lamports = cb
            .claimable_lamports
            .checked_add(lowest_lock)
            .ok_or(SolazzoError::ArithmeticOverflow)?;
        cb.last_updated_at = clock.unix_timestamp;

        // --- Update slot ---
        let slot = &mut ctx.accounts.slot;
        slot.owner = ctx.accounts.challenger.key();
        slot.locked_lamports = new_lock_lamports;
        slot.lock_started_at = clock.unix_timestamp;

        // --- Update slot book ---
        let slot_book_mut = &mut ctx.accounts.slot_book;
        slot_book_mut.locks[expected_slot_id as usize] = new_lock_lamports;

        // --- Emit events ---
        emit!(SlotDisplaced {
            slot_id: expected_slot_id,
            old_owner: displaced_owner,
            new_owner: ctx.accounts.challenger.key(),
            old_lock_lamports: lowest_lock,
            new_lock_lamports,
            fee_lamports: fee,
            ts: clock.unix_timestamp,
        });

        emit!(ClaimCredited {
            owner: displaced_owner,
            amount_lamports: lowest_lock,
            ts: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Withdraw claimable balance from the vault.
    ///
    /// Always available (not blocked by pause or settlement).
    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        let clock = Clock::get()?;
        let cb = &mut ctx.accounts.claimable_balance;

        require!(cb.claimable_lamports > 0, SolazzoError::NoClaimableBalance);

        let amount = cb.claimable_lamports;

        // --- Zero out balance BEFORE transfer (CEI pattern) ---
        cb.claimable_lamports = 0;
        cb.last_updated_at = clock.unix_timestamp;

        // --- Transfer from vault to owner ---
        **ctx
            .accounts
            .vault
            .to_account_info()
            .try_borrow_mut_lamports()? -= amount;
        **ctx
            .accounts
            .owner
            .to_account_info()
            .try_borrow_mut_lamports()? += amount;

        // --- Emit event ---
        emit!(Claimed {
            owner: ctx.accounts.owner.key(),
            amount_lamports: amount,
            ts: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Create a claimable balance account for a wallet.
    ///
    /// Anyone can call this (and pay rent) for any owner.
    /// Must be created before the owner can be displaced.
    pub fn init_claimable_balance(ctx: Context<InitClaimableBalance>) -> Result<()> {
        let cb = &mut ctx.accounts.claimable_balance;
        cb.owner = ctx.accounts.owner.key();
        cb.claimable_lamports = 0;
        cb.last_updated_at = 0;
        cb.bump = ctx.bumps.claimable_balance;
        Ok(())
    }

    /// Toggle emergency pause (admin-only, spec §5.7).
    ///
    /// Pausing blocks new claims and displacements but never blocks claim().
    pub fn set_paused(ctx: Context<AdminAction>, paused: bool) -> Result<()> {
        ctx.accounts.protocol_config.is_paused = paused;
        Ok(())
    }

    /// Attempt settlement via oracle price threshold OR global timeout deadline.
    ///
    /// Permissionless: anyone can call. Two settlement paths:
    /// 1. **Timeout**: if current timestamp >= config.settle_deadline_ts, settles immediately.
    /// 2. **Price**: reads the external Pyth oracle account, validates freshness/confidence,
    ///    and runs the sustained-window state machine.
    ///
    /// Any invalid observation (stale, non-positive, wide confidence, below threshold,
    /// bad data format) resets the window and returns Ok — errors would revert state
    /// on Solana, preventing the reset from persisting.
    ///
    /// Only AlreadySettled is a hard error (no state to revert).
    pub fn settle_if_threshold_met(ctx: Context<SettleIfThresholdMet>) -> Result<()> {
        let clock = Clock::get()?;
        let config = &mut ctx.accounts.protocol_config;

        // Already settled — hard error (idempotency guard, no state to revert)
        require!(!config.is_settled, SolazzoError::AlreadySettled);

        let now = clock.unix_timestamp;

        // --- Fast path: global timeout deadline ---
        if now >= config.settle_deadline_ts {
            config.is_settled = true;
            emit!(Settled {
                ts: now,
                cause: SettlementCause::Timeout,
            });
            return Ok(());
        }

        // --- Standard path: oracle price threshold ---

        // Parse and validate. Any invalid observation resets the window.
        let observation =
            match parse_pyth_price(&ctx.accounts.oracle_feed.to_account_info(), config, now) {
                Some(obs) => obs,
                None => {
                    if config.first_valid_settle_ts != 0 {
                        config.first_valid_settle_ts = 0;
                        emit!(SettlementWindowReset { ts: now });
                    }
                    return Ok(());
                }
            };

        if observation.price_e8 >= config.settle_threshold_price_e8 {
            if config.first_valid_settle_ts == 0 {
                // Start the sustained window
                config.first_valid_settle_ts = now;
                emit!(SettlementWindowStarted { ts: now });
            } else {
                // Check if window has elapsed
                let elapsed = now
                    .checked_sub(config.first_valid_settle_ts)
                    .ok_or(SolazzoError::ArithmeticOverflow)?;
                if elapsed >= config.settle_window_sec as i64 {
                    // Settlement triggered — irreversible latch
                    config.is_settled = true;
                    emit!(Settled {
                        ts: now,
                        cause: SettlementCause::Price,
                    });
                }
                // else: still accumulating, no-op
            }
        } else {
            // Below threshold — reset window
            if config.first_valid_settle_ts != 0 {
                config.first_valid_settle_ts = 0;
                emit!(SettlementWindowReset { ts: now });
            }
        }

        Ok(())
    }
}

// ---------------------------------------------------------------------------
// Instruction parameter types
// ---------------------------------------------------------------------------

/// Parameters for `initialize_protocol`.
#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitializeProtocolParams {
    pub admin_multisig: Pubkey,
    pub treasury_account: Pubkey,
    pub oracle_feed_pubkey: Pubkey,
    pub slot_count: u16,
    pub min_lock_lamports: u64,
    pub min_increment_lamports: u64,
    pub displacement_fee_lamports: u64,
    pub oracle_max_staleness_sec: u32,
    pub oracle_max_conf_bps: u16,
    pub settle_threshold_price_e8: i64,
    pub settle_window_sec: u32,
    pub settle_deadline_ts: i64,
}

// ---------------------------------------------------------------------------
// Account structs
// ---------------------------------------------------------------------------

#[derive(Accounts)]
pub struct InitializeProtocol<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = 8 + ProtocolConfig::INIT_SPACE,
        seeds = [PROTOCOL_CONFIG_SEED],
        bump,
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,

    #[account(
        init,
        payer = admin,
        space = 8 + Vault::INIT_SPACE,
        seeds = [VAULT_SEED],
        bump,
    )]
    pub vault: Account<'info, Vault>,

    #[account(
        init,
        payer = admin,
        space = 8 + SlotBook::INIT_SPACE,
        seeds = [SLOT_BOOK_SEED],
        bump,
    )]
    pub slot_book: Account<'info, SlotBook>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(slot_id: u16)]
pub struct ClaimUnfilledSlot<'info> {
    #[account(mut)]
    pub claimer: Signer<'info>,

    #[account(
        mut,
        seeds = [PROTOCOL_CONFIG_SEED],
        bump = protocol_config.bump,
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,

    #[account(
        mut,
        seeds = [VAULT_SEED],
        bump = vault.bump,
    )]
    pub vault: Account<'info, Vault>,

    #[account(
        mut,
        seeds = [SLOT_BOOK_SEED],
        bump = slot_book.bump,
    )]
    pub slot_book: Account<'info, SlotBook>,

    #[account(
        init,
        payer = claimer,
        space = 8 + Slot::INIT_SPACE,
        seeds = [SLOT_SEED, &slot_id.to_le_bytes()],
        bump,
    )]
    pub slot: Account<'info, Slot>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(expected_slot_id: u16)]
pub struct DisplaceLowest<'info> {
    #[account(mut)]
    pub challenger: Signer<'info>,

    #[account(
        seeds = [PROTOCOL_CONFIG_SEED],
        bump = protocol_config.bump,
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,

    #[account(
        mut,
        seeds = [SLOT_BOOK_SEED],
        bump = slot_book.bump,
    )]
    pub slot_book: Account<'info, SlotBook>,

    #[account(
        mut,
        seeds = [VAULT_SEED],
        bump = vault.bump,
    )]
    pub vault: Account<'info, Vault>,

    #[account(
        mut,
        seeds = [SLOT_SEED, &expected_slot_id.to_le_bytes()],
        bump = slot.bump,
    )]
    pub slot: Account<'info, Slot>,

    /// CHECK: Validated against protocol_config.treasury_account.
    #[account(
        mut,
        constraint = treasury.key() == protocol_config.treasury_account @ SolazzoError::InvalidTreasuryAccount,
    )]
    pub treasury: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [CLAIMABLE_BALANCE_SEED, slot.owner.as_ref()],
        bump = claimable_balance.bump,
        constraint = claimable_balance.owner == slot.owner @ SolazzoError::ClaimableBalanceOwnerMismatch,
    )]
    pub claimable_balance: Account<'info, ClaimableBalance>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitClaimableBalance<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: Any wallet to create a claimable balance for.
    pub owner: UncheckedAccount<'info>,

    #[account(
        init,
        payer = payer,
        space = 8 + ClaimableBalance::INIT_SPACE,
        seeds = [CLAIMABLE_BALANCE_SEED, owner.key().as_ref()],
        bump,
    )]
    pub claimable_balance: Account<'info, ClaimableBalance>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [VAULT_SEED],
        bump = vault.bump,
    )]
    pub vault: Account<'info, Vault>,

    #[account(
        mut,
        seeds = [CLAIMABLE_BALANCE_SEED, owner.key().as_ref()],
        bump = claimable_balance.bump,
        constraint = claimable_balance.owner == owner.key() @ SolazzoError::Unauthorized,
    )]
    pub claimable_balance: Account<'info, ClaimableBalance>,
}

#[derive(Accounts)]
pub struct AdminAction<'info> {
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [PROTOCOL_CONFIG_SEED],
        bump = protocol_config.bump,
        constraint = protocol_config.admin_multisig == admin.key() @ SolazzoError::Unauthorized,
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,
}

#[derive(Accounts)]
pub struct SettleIfThresholdMet<'info> {
    pub caller: Signer<'info>,

    #[account(
        mut,
        seeds = [PROTOCOL_CONFIG_SEED],
        bump = protocol_config.bump,
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,

    /// CHECK: External oracle (Pyth). Key validated against protocol_config.oracle_feed_pubkey.
    /// Data parsed as Pyth v2 price account in the handler.
    #[account(
        constraint = oracle_feed.key() == protocol_config.oracle_feed_pubkey @ SolazzoError::InvalidOracleFeedAccount,
    )]
    pub oracle_feed: UncheckedAccount<'info>,
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

#[event]
pub struct SlotClaimed {
    pub slot_id: u16,
    pub owner: Pubkey,
    pub lock_lamports: u64,
    pub ts: i64,
}

#[event]
pub struct SlotDisplaced {
    pub slot_id: u16,
    pub old_owner: Pubkey,
    pub new_owner: Pubkey,
    pub old_lock_lamports: u64,
    pub new_lock_lamports: u64,
    pub fee_lamports: u64,
    pub ts: i64,
}

#[event]
pub struct ClaimCredited {
    pub owner: Pubkey,
    pub amount_lamports: u64,
    pub ts: i64,
}

#[event]
pub struct Claimed {
    pub owner: Pubkey,
    pub amount_lamports: u64,
    pub ts: i64,
}

#[event]
pub struct SettlementWindowStarted {
    pub ts: i64,
}

#[event]
pub struct SettlementWindowReset {
    pub ts: i64,
}

/// Cause of protocol settlement.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum SettlementCause {
    /// Oracle price sustained above threshold for required window.
    Price,
    /// Global timeout deadline reached.
    Timeout,
}

#[event]
pub struct Settled {
    pub ts: i64,
    pub cause: SettlementCause,
}
