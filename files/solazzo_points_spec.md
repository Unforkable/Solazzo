# Solazzo Points — Conviction Leaderboard Specification

## Overview

Solazzo Points are a time-weighted conviction score assigned to every wallet that has ever locked SOL into the Solazzo collection. They represent the accumulated weight of belief over time — denominated not in price, but in commitment.

Points are permanent. They are never reset, burned, or forfeited — regardless of displacement, withdrawal, or settlement. A wallet's Solazzo Points score is a historical record of conviction. It cannot be erased.

For v1, settlement is triggered by OR logic: SOL/USD sustained threshold ($1,000) or the fixed protocol timeout at `2030-03-16T00:00:00Z` (`1899849600`), whichever comes first.

---

## Formula

```
Solazzo Points = SOL Locked × Time Held (in hours)
```

Points accrue continuously while a wallet holds a slot. Accrual stops upon displacement. The historical total is preserved indefinitely.

**Example:**
- Wallet A locks 5 SOL and holds for 720 hours (30 days) → 3,600 points
- Wallet A is then displaced
- Wallet A later locks 10 SOL on a new slot and holds for 360 hours → 3,600 additional points
- Wallet A's total: **7,200 points** — permanently

---

## Core Properties

**Permanence**
Points are never reset upon displacement. When an owner is displaced, accrual halts at that moment. All points accumulated up to displacement are preserved in full. This transforms displacement from a pure loss into a partial record of achievement.

**Continuous Accrual**
Points accrue block-by-block (or hour-by-hour as a practical approximation) while a wallet holds a slot. There are no accrual caps per slot or per wallet.

**Multi-Slot Support**
A wallet holding multiple slots accrues points across all positions simultaneously. Total points = sum of accrual across all held slots at any given time.

**Non-Transferable**
Solazzo Points are tied to the originating wallet. They cannot be transferred, sold, or delegated. They are a record of behavior, not an asset.

---

## The Leaderboard

The Solazzo Points leaderboard is a public, real-time ranking of all wallets by accumulated points. It is the conviction index of the Solana ecosystem — a ranked record of who believed earliest, longest, and most.

The leaderboard surfaces three naturally emergent archetypes:

**The OG**
Locked early, possibly displaced multiple times, but accumulated points when SOL was cheap and competition was low. Their score reflects historical courage more than current capital. Untouchable in a specific way — you can take their slot but you can never erase their history.

**The Whale**
Locks a large amount, climbs the leaderboard fast through volume. Respected, but legible. The community can distinguish capital from conviction.

**The Grinder**
Modest SOL, locked since early days, never displaced. Slow and steady accumulation. High legitimacy. The tortoise. This archetype creates organic community heroes and is sympathetic to observers who couldn't afford large positions.

The leaderboard makes all three stories visible simultaneously and gives participants a competitive axis entirely separate from SOL price or portrait stage.

---

## Relationship to Displacement

Displacement does not erase points. It only stops accrual on that slot.

This has a meaningful psychological effect: being displaced is no longer a pure loss. It is the closing of a chapter. The points earned during that ownership cycle are banked permanently. Participants who are displaced can immediately begin accruing again by claiming or competing for another slot.

This mechanic encourages re-engagement rather than churn. Displaced wallets have a clear incentive to return — not to recover what was lost, but to continue building a score that no one can take from them.

---

## Early Advantage — Mathematically Honest

Because points are never reset and accrue from the moment of first lock, early participants have a compounding head start that cannot be fully erased by later capital.

A whale who joins at $500 SOL locking 50 SOL will never outscore an OG who locked 10 SOL at $150 and held uninterrupted. This is not manufactured scarcity — it is a mathematical consequence of time being irreversible.

This makes the best time to participate always right now, and makes the leaderboard a genuine record of who was early rather than who was rich.

---

## Tokenization Optionality

Solazzo Points are currently a non-transferable reputation system. They may be considered for tokenization at a future date, subject to community maturity, regulatory context, and collection growth.

No tokenization is promised. The optionality is intentional. Implied future value is not a commitment — it is a reflection of the system's potential, to be realized only if and when conditions support it responsibly.

Points should be treated as a measure of standing within the Solazzo community, not as a financial instrument.

---

## Implementation Notes (for Claude Code)

The points system requires the following components:

1. **On-chain timestamp tracking** — each slot account should store `lock_timestamp` (when current owner locked) and `cumulative_points` (points accrued by all previous owners of that slot, broken out per wallet in an event log).

2. **Points indexer** — an off-chain indexer (or Solana program event log) that computes `SOL × hours` for every ownership interval per wallet and aggregates lifetime totals.

3. **Leaderboard API** — a read endpoint that returns ranked wallet scores, refreshed on a reasonable cadence (e.g. every 10 minutes or per block finality).

4. **Leaderboard UI** — a dedicated page or panel in the frontend displaying top wallets by total points, with wallet address, points total, current rank, and archetype badge (OG / Whale / Grinder, determined by point composition — time-weighted vs. volume-weighted ratio).

Points do **not** need to be stored on-chain in real time. They can be computed off-chain from on-chain event logs (lock events, displacement events) and served via API. This avoids unnecessary compute costs.

---

*Section added: March 2026*
*Status: Canonical — include in whitepaper v2 and implementation plan update*
