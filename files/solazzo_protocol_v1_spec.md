# Solazzo Protocol v1 Specification

Version: 0.1 (Draft)  
Status: Internal Canonical Draft  
Date: 2026-03-11

---

## 1. Purpose

This document defines Solazzo Protocol v1: a custody-safe, conviction-based slot system on Solana.

The protocol enables users to:

- lock SOL to claim one of 1,000 slots,
- compete for ownership after all slots are full by displacing the current lowest slot,
- reclaim principal via a unified claim mechanism,
- settle the system when SOL/USD reaches $1,000 under strict oracle conditions, or at a fixed timeout deadline.

v1 prioritizes safety, simplicity, and verifiability over feature breadth.

---

## 2. Scope (What v1 Includes / Excludes)

### 2.1 Included in v1

- 1,000 on-chain slots (`0..999`) with wallet-bound ownership.
- Lock/claim mechanics for unfilled slots.
- Lowest-slot-only displacement once full.
- Unified claim ledger for all principal payouts.
- Settlement mechanism using Pyth SOL/USD sustained-window checks OR a fixed timeout deadline.
- Internal points leaderboard (off-chain indexer from on-chain events).
- Server-side portrait storage and user download support.

### 2.2 Excluded from v1

- Staking-yield deployment of locked capital.
- NFT minting.
- Transferable points token launch.

---

## 3. Protocol Decisions v1 (Final)

### 3.1 Slot topology and ownership

- Total slots: exactly `1000`.
- Slot IDs: `0..999`.
- Before full occupancy: users may claim any unfilled slot ID.
- After full occupancy: only `displace_lowest` is allowed; direct targeted challenges are disallowed.
- Lowest-slot tie break: lowest slot ID wins.
- Ownership rights and principal withdrawal rights are wallet-bound (non-transferable in protocol state).

### 3.2 Economic constants

- Minimum lock amount: `1 SOL`.
- Minimum displacement increment: `+1 SOL`.
- Displacement fee: `0.1 SOL` (to protocol treasury).

Displacement must satisfy:

- `new_lock >= 1 SOL`
- `new_lock >= current_lowest_lock + 1 SOL`

### 3.3 Payout model

- Unified wallet-level `claimable_balance`.
- Displacement refunds and settlement unlock payouts both credit claimable balance.
- Users withdraw through `claim()`.
- Frontend may auto-trigger claim for displacement UX, but manual claim must always remain available.

### 3.4 Settlement model

- Oracle source: Pyth SOL/USD feed.
- Settlement threshold: `price >= 1000`.
- Must satisfy freshness and confidence safety limits.
- Must remain valid for `>= 3600 seconds`.
- Fixed timeout deadline: `2030-03-16T00:00:00Z` (`1899849600` Unix seconds).
- Settlement trigger is OR logic: sustained threshold condition OR timeout deadline, whichever occurs first.
- Settlement is one-way and irreversible.

### 3.5 Operational controls

- Emergency pause may disable new claims/displacements.
- Emergency pause must never block `claim()`.
- Treasury and admin authority are multisig-controlled at launch.

---

## 4. On-Chain State Model

All values are tracked in lamports and integer timestamps.

### 4.1 `ProtocolConfig` (PDA)

Fields:

- `admin_multisig: Pubkey`
- `treasury_account: Pubkey`
- `slot_count: u16` (must be 1000)
- `slots_filled: u16`
- `min_lock_lamports: u64` (1 SOL)
- `min_increment_lamports: u64` (+1 SOL)
- `displacement_fee_lamports: u64` (0.1 SOL)
- `is_paused: bool` (pauses new claims/displacements only)
- `is_settled: bool`
- `oracle_feed_pubkey: Pubkey` (Pyth SOL/USD)
- `oracle_max_staleness_sec: u32` (recommended 90)
- `oracle_max_conf_bps: u16` (recommended 100 = 1%)
- `settle_threshold_price_e8: i64` (1000 * 1e8)
- `settle_window_sec: u32` (3600)
- `first_valid_settle_ts: i64` (0 if inactive)
- `settle_deadline_ts: i64` (`1899849600`, fixed v1 timeout)

### 4.2 `Slot` (PDA per slot ID)

Fields:

- `slot_id: u16`
- `owner: Pubkey` (default `Pubkey::default()` when empty)
- `locked_lamports: u64`
- `lock_started_at: i64`
- `is_occupied: bool`

### 4.3 `ClaimableBalance` (PDA per wallet)

Fields:

- `owner: Pubkey`
- `claimable_lamports: u64`
- `last_updated_at: i64`

### 4.4 Vault and treasury

- `vault_pda`: stores user principal liabilities.
- `treasury_account`: receives only displacement fees in v1.

In v1, treasury funds are accounting-separated from principal liabilities.

---

## 5. Instruction Set (v1)

## 5.1 `initialize_protocol(...)`

Creates protocol config and initializes static parameters.

Checks:

- slot count must equal 1000,
- multisig and treasury addresses must be valid,
- economic params non-zero and internally consistent.

### 5.2 `claim_unfilled_slot(slot_id, lock_lamports)`

Allowed only when `slots_filled < 1000`.

Checks:

- protocol not settled,
- protocol not paused,
- target slot not occupied,
- `lock_lamports >= min_lock_lamports`.

Effects:

- transfers lock amount from signer to vault,
- marks slot occupied by signer,
- sets lock amount and timestamp,
- increments `slots_filled`.

### 5.3 `displace_lowest(expected_slot_id, expected_lowest_lamports, new_lock_lamports)`

Allowed only when `slots_filled == 1000`.

Checks:

- protocol not settled,
- protocol not paused,
- signer is not current owner of the target lowest slot (no self-displacement),
- target slot equals current deterministic lowest slot,
- expected values match on-chain values (optimistic concurrency guard),
- `new_lock_lamports >= lowest + min_increment_lamports`,
- `new_lock_lamports >= min_lock_lamports`.

Payment flow:

- signer pays `new_lock_lamports + displacement_fee_lamports`,
- fee moves to treasury,
- previous owner principal (`lowest.locked_lamports`) is credited to their `ClaimableBalance`.

State updates:

- slot owner becomes signer,
- slot locked amount becomes `new_lock_lamports`,
- slot timestamp resets.

### 5.4 `claim()`

Checks:

- signer owns corresponding `ClaimableBalance`,
- `claimable_lamports > 0`.

Effects:

- set `claimable_lamports = 0`,
- transfer amount from vault to signer,
- emit claim event.

If transfer fails, transaction reverts atomically.

### 5.5 `settle_if_threshold_met()`

Checks:

- not already settled,
- timeout reached OR oracle threshold path valid.

Timeout path:

- if `now >= settle_deadline_ts`, settle immediately (no oracle requirement).

Oracle threshold path (pre-timeout):

- oracle data is fresh (`age <= max_staleness`),
- oracle confidence ratio is valid (`conf/price <= max_conf_bps`),
- oracle price >= threshold.

Window logic:

- on first valid observation, set `first_valid_settle_ts`,
- require continuous valid condition until `now - first_valid_settle_ts >= settle_window_sec`,
- if condition breaks at any point, reset `first_valid_settle_ts = 0`.

Effects:

- set `is_settled = true` permanently.

### 5.6 `withdraw_after_settlement()`

Optional convenience instruction. Semantically equivalent to crediting then claiming principal for current owners.

Recommended implementation in v1:

- route through same internal claim-credit path used elsewhere to preserve one payout primitive.

### 5.7 `set_pause(is_paused)`

Multisig-controlled emergency control.

Constraint:

- cannot disable `claim()`.

---

## 6. Deterministic Lowest-Slot Selection

When full, lowest slot is selected by:

1. minimal `locked_lamports`,
2. if tied, minimal `slot_id`.

This rule must be deterministic and identical across program and indexer.

---

## 7. Invariants (Non-Negotiable)

1. Principal cannot be slashed by protocol logic.
2. Displaced owner principal is fully credited to claim ledger.
3. No wallet may claim another wallet's balance.
4. Fees are never paid out of displaced principal.
5. Post-settlement, no new claims/displacements can execute.
6. Settlement is irreversible.
7. `claim()` remains callable during emergency pause.
8. Arithmetic uses checked integer lamport math only.

---

## 8. Threat Model and Mitigations

### 8.1 Self-replacement / wash displacement

Threat:

- owner displaces own slot to create noise or exploit accounting.

Mitigation:

- reject displacement if challenger equals current slot owner.

### 8.2 Claim abuse / double-claim

Threat:

- race/replay attempts to withdraw more than balance.

Mitigation:

- zero-out claimable before transfer in the same atomic tx,
- revert on transfer failure,
- strict signer ownership checks.

### 8.3 MEV / race conditions

Threat:

- front-run displacement with higher priority tx.

Mitigation:

- include expected slot + expected lowest lock arguments,
- fail on stale state mismatch,
- deterministic rules and clean retry behavior in client UX.

### 8.4 Oracle manipulation / stale data

Threat:

- settle on stale/noisy spike data.

Mitigation:

- freshness cap, confidence cap, sustained window, irreversible settle latch.

### 8.5 Social/phishing attacks

Threat:

- malicious frontend/signature tricking users.

Mitigation (product/ops):

- clear tx intent text in UI,
- no-seed-phrase support policy,
- signed announcements + status channel,
- multisig and hardware key discipline.

---

## 9. Points and Leaderboard (v1)

### 9.1 Data source

- Derived from on-chain events (`SlotClaimed`, `SlotDisplaced`, `SettlementTriggered`).

### 9.2 Accrual formula

- `points = locked_SOL * time_held`.
- Backend calculates using second-level precision; UI may round for readability.

### 9.3 Tokenization

- No token launch in v1.
- Transferable token, if launched later, must not be required for protocol correctness.

---

## 10. Portrait and Storage Policy (v1)

- v1 has no NFT minting.
- Portrait outputs are stored server-side and downloadable.
- Portrait finalization rights are gated by current slot ownership in app/backend logic.
- If ownership changes before finalization, prior session becomes invalid.

---

## 11. Event Schema (Minimum)

Emit structured events for every state change:

- `SlotClaimed { slot_id, owner, lock_lamports, ts }`
- `SlotDisplaced { slot_id, old_owner, new_owner, old_lock_lamports, new_lock_lamports, fee_lamports, ts }`
- `ClaimCredited { owner, amount_lamports, reason, ts }`
- `Claimed { owner, amount_lamports, ts }`
- `SettlementWindowStarted { started_at }`
- `SettlementWindowReset { at }`
- `Settled { at, price_e8, conf_e8 }`
- `PauseChanged { is_paused, at }`

---

## 12. Testing Requirements

### 12.1 Unit tests

- min lock and min increment validation,
- deterministic lowest-slot resolution with ties,
- self-displacement rejection,
- fee routing correctness,
- claim zeroing and transfer atomicity,
- settlement state transition correctness.

### 12.2 Property/invariant tests

- total liabilities remain consistent across random claim/displacement sequences,
- no unauthorized claims possible under adversarial input permutations,
- settlement irreversibility under random call order.

### 12.3 Integration tests

- full lifecycle:
  - fill slots,
  - displace lowest,
  - claim displaced principal,
  - sustain oracle threshold,
  - settle and withdraw.

### 12.4 Failure-path tests

- stale oracle data,
- confidence too wide,
- mismatched expected lowest values,
- paused state behavior (`claim()` still works).

---

## 13. Rollout Plan (Recommended)

1. Internal localnet + devnet simulation.
2. Public test phase with capped value.
3. External audit.
4. Mainnet launch with conservative operational controls.
5. Post-launch observation window before any v2 scope (staking deployment, NFT, tokenization).

---

## 14. Open Items for v2 (Explicitly Deferred)

- Yield deployment strategy and liquidity buffer policy.
- NFT model (soulbound representation options).
- Transferable points tokenomics and launch mechanics.
- Governance hardening path (timelock/freeze policy once stable).

---

## 15. Canonical Parameters Snapshot (v1)

- `SLOT_COUNT = 1000`
- `MIN_LOCK = 1 SOL`
- `MIN_INCREMENT = 1 SOL`
- `DISPLACEMENT_FEE = 0.1 SOL`
- `SETTLE_THRESHOLD = $1000 SOL/USD`
- `SETTLE_WINDOW = 3600 sec`
- `SETTLE_DEADLINE_TS = 1899849600` (`2030-03-16T00:00:00Z`)
- `LOWEST_TIE_BREAK = lowest slot id`
- `CLAIM_MODEL = unified wallet claim ledger`

---

## 16. MVP Scope Gate (What Is Required vs Deferred)

This section is normative for execution priority.

### 16.1 Must-have before mainnet beta

Contract and security:

- `initialize_protocol`, `claim_unfilled_slot`, `displace_lowest`, `claim`, `settle_if_threshold_met`, `set_pause`.
- Deterministic lowest-slot logic with tie-break by slot ID.
- No self-displacement.
- Unified claim ledger with atomic zero-then-transfer claim flow.
- Settlement checks: timeout OR (threshold + freshness + confidence + sustained window).
- `claim()` callable even when paused.
- Multisig-controlled admin and treasury paths.

Indexing and data correctness:

- Event emission for all state transitions in Section 11.
- Indexer that can rebuild state from chain events idempotently.
- Leaderboard points computed from chain-derived ownership intervals.

Application and UX:

- Wallet-based lock/displace/claim flows wired to on-chain instructions.
- Clear fee + lock disclosure before signing.
- Retry-safe UX for failed displacement due to state race.
- Portrait finalization permission tied to current slot ownership.

Ops:

- Devnet soak test with adversarial simulation.
- External audit completed or equivalent independent security review.
- Incident runbook and signer key-management SOP.

### 16.2 Can defer to v1.x / v2

- Staking/yield deployment and treasury optimization.
- NFT minting/soulbound representation.
- Transferable points token and tokenomics.
- Advanced governance hardening (timelock freeze/final immutability path).
- MEV-specialized routing improvements (e.g., private relay defaults).

### 16.3 Explicitly out-of-scope for v1

- Any feature that weakens claim safety or introduces principal transfer complexity.
- Any principal-claim tokenization.

---

## 17. Implementation Checklist (Build Order)

Use this as the execution sequence. Do not start later phases before prior phase exit criteria are met.

### Phase A — Contract skeleton and state safety

Tasks:

- Define account structs and PDA derivations.
- Implement initialization and read-only helpers.
- Encode canonical constants and validation guards.

Exit criteria:

- Local tests pass for initialization, account derivation, and state shape.
- No unchecked arithmetic warnings.

### Phase B — Core economic instructions

Tasks:

- Implement `claim_unfilled_slot`.
- Implement deterministic lowest-slot resolver.
- Implement `displace_lowest` with expected-state args.
- Implement fee routing and claim crediting.
- Implement `claim`.

Exit criteria:

- Unit tests cover min lock/increment, self-displacement rejection, tie-break behavior.
- Invariant tests confirm principal accounting and claim safety under random sequences.

### Phase C — Settlement and pause controls

Tasks:

- Integrate Pyth checks (freshness/confidence/threshold).
- Implement sustained-window state machine.
- Implement irreversible settle latch.
- Implement pause control that never blocks `claim()`.

Exit criteria:

- Failure-path tests pass for stale feed, wide confidence, reset/restart of settle window.
- Post-settlement all lock/displace calls fail and claims remain functional.

### Phase D — Event schema and indexer

Tasks:

- Emit events from all core instructions.
- Build indexer pipeline and replay-safe storage model.
- Compute leaderboard points from ownership intervals.

Exit criteria:

- Fresh sync and full replay produce identical state and scores.
- Reorg/finality handling strategy documented and tested.

### Phase E — Backend and frontend integration

Tasks:

- Replace mock lock flow with wallet tx flow.
- Add displacement and claim UX with clear user confirmations.
- Add optimistic concurrency retry UX for displacement races.
- Enforce slot ownership checks for portrait finalization.

Exit criteria:

- End-to-end devnet flow works: claim -> displace -> claim refund -> settle -> claim settlement principal.
- UX copy accurately reflects protocol rules and fees.

### Phase F — Security hardening and launch readiness

Tasks:

- Complete independent security review/audit.
- Run adversarial test scenarios (spam/race/replay/front-run simulations).
- Finalize multisig signer setup and operational runbooks.
- Execute capped-value public beta.

Exit criteria:

- No unresolved critical/high findings.
- Runbook tested in tabletop incident drill.
- Go-live checklist signed by engineering + security owner.

---

## 18. Execution Status (Checkpoint)

Date: 2026-03-11  
Status: Internal build in progress, security-gated by phased acceptance.

### 18.1 Completed and accepted

- **Phase A (contract skeleton/state safety):** complete and accepted.
- **Phase B (core economics):** complete and accepted.
- **Phase C (settlement/pause controls):** complete and accepted.
- **Phase D (events/indexer):** complete and accepted, including:
  - bigint-safe storage/arithmetic for lamports/lampsec,
  - deterministic BigInt leaderboard ordering,
  - reorg/finality handling with effective-tip boundary,
  - deep-reorg rejection with zero side effects.

### 18.2 Security notes from latest acceptance

- Finality boundary is computed using:
  - `effective_tip = max(persisted_tip, incoming_tip)`
  - `finalized_boundary = max(0, effective_tip - confirmations)`
- Deep reorg (`fork_slot <= finalized_boundary`) must fail hard with no DB mutation.
- Non-finalized reorg must rollback from fork slot, rebuild derived state, then replay canonical events.

### 18.3 Next gate (Task 8)

Proceed to **Phase E — Backend and frontend integration**:

- replace mock lock flow with real wallet tx flow,
- add displacement and claim UX with clear signing disclosures,
- add optimistic concurrency retry UX for displacement races,
- enforce ownership checks for portrait finalization against on-chain state.

### 18.4 Resume protocol

When resuming work, start from:

- "Task 7.1 accepted."
- "Begin Task 8 (Phase E) prompt and implementation."

