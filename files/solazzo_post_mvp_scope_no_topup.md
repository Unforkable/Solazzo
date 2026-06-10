# Solazzo Post-MVP Scope (No Top-Up)

Date: 2026-03-11  
Owner: CTO scope draft (for implementation via Claude Code)

## Goal

Improve onboarding clarity and portfolio visibility without changing core on-chain economics.

This scope explicitly excludes "add more SOL to an existing slot" (top-up).

---

## Included Initiatives

## 1) Guided User Flow (Onboarding + Claim Journey)

Objective: make the product self-explanatory for non-technical users from selfie to on-chain claim.

Deliverables:
- clearer step-by-step journey states (capture -> generate -> auto-assigned claim -> publish),
- stronger CTA/status copy for wallet signing and confirmation stages,
- explicit next actions on error and retry paths,
- persistent draft behavior so users do not lose generated portraits.

Acceptance criteria:
- first-time users can complete claim without external help,
- no dead-end buttons in claim/displace paths,
- error states always provide a clear next action.

---

## 2) Multi-Slot / Multi-Portrait Ownership UX

Objective: support users claiming multiple slots across multiple portrait sets with clear per-slot ownership.

Deliverables:
- no frontend assumptions of "single slot per wallet",
- each claimed collection consistently linked to its slot and wallet,
- claim flow remains repeatable for additional slots.

Acceptance criteria:
- same wallet can complete multiple claims,
- each claim preserves correct slot linkage and publish metadata.

---

## 3) "My Positions" Dashboard

Objective: provide one wallet-centric view of all user positions and totals.

Deliverables:
- dedicated page showing all slots owned by connected wallet,
- per-slot summary (slot id, lock amount, tx reference, portrait preview, publish status),
- aggregate metrics (total SOL locked, slot count, claimable balance),
- clear wallet mismatch warning if local/client state differs.

Acceptance criteria:
- dashboard loads from chain-backed data (not fragile local-only assumptions),
- totals reconcile with underlying slot records,
- user can quickly understand "what I own" and "what I can claim".

---

## Explicitly Out of Scope (for this phase)

- top-up/additional lock into existing slot,
- new on-chain instructions that alter economic rules,
- slot numbering remap or dual numbering systems,
- points token transfer/reward model changes.

---

## Why Top-Up Is Deferred

Top-up materially changes competitive dynamics and requires separate economics + security review:
- changes displacement behavior and capital concentration effects,
- increases on-chain surface area and invariant complexity,
- requires dedicated test matrix and audit pass.

Decision: treat top-up as a later protocol extension (v1.1+), not part of this scope.

---

## Engineering Phases (Fast Sequence)

Phase 1 (low risk):
- guided flow polish and copy hardening,
- remove dead-end interactions.

Phase 2 (medium):
- My Positions dashboard,
- aggregate totals and wallet-level views.

Phase 3 (medium):
- multi-slot UX hardening and repeated-claim polish.

Suggested release gate:
- ship once Phase 1 + Phase 2 pass devnet smoke tests and no critical regressions.

