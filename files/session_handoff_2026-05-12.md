# Session Handoff — 2026-05-12

## Current state

- Branch: `main`
- Latest release-health status from this session: all four CI jobs green on `origin/main` (including `onchain`).
- Network posture: app and publish flow currently aligned to **devnet**.
- Program ID baseline in docs/code: `3zYyfExhUGd8dh3wZZP285iwdjdnSphpqWks4x8L1gvy`.

## What was completed

1. Program ID single-source-of-truth hardening across `make`, `onchain`, and `onchain/indexer`.
2. Onchain CI job added and hardened (`anchor build`, bankrun tests, full IDL drift guard).
3. `/api/generate` guardrails added (rate limit + optional daily caps) with tests.
4. Docs and release runbook refreshed; release smoke script added.
5. CI follow-up fixes applied for Ubuntu runners:
   - install `pkg-config` + `libudev-dev` before cache-miss Anchor install
   - Solana CLI pin bumped to `3.1.10`
   - `onchain` npm install uses `--legacy-peer-deps`

## Tomorrow quick start

From repo root:

```bash
git pull --ff-only
npm run vercel:check
node scripts/smoke-release.mjs
```

If doing code changes that touch onchain/make integration:

```bash
cd onchain && anchor build
cd ../make && npm test && npx tsc --noEmit
cd ../onchain/indexer && npx tsc --noEmit
```

## If CI fails again

- Check `files/solazzo_verification_runbook.md` section **9) CI Triage Quick Notes (2026-05 baseline)**.
- Most likely failure buckets:
  1. Anchor install native deps (`libudev`)
  2. Solana CLI pin vs Cargo lockfile format
  3. npm peer dependency install under `onchain/`
  4. Built-vs-bundled IDL drift

## Open strategic item (not urgent)

- Mainnet cutover plan remains pending by choice. Continue devnet validation + tiny trusted-user testing before public launch.
