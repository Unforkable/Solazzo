# Solazzo

Monorepo with two Next.js apps and an Anchor (Solana) workspace, deployed on Vercel from the same GitHub repo (Unforkable/Solazzo).

## Apps

### `solazzo/` — Landing Page & Whitepaper
- **URL:** solazzo.fun
- **Vercel project:** `solazzo` (prj_N0C32hDyevLhYL5vk8gAFMF1Dcet)
- **Root Directory on Vercel:** must be `solazzo`
- Next.js 16, React 19, Tailwind
- Single-page app: `solazzo/src/app/page.tsx` (whitepaper + FAQ)

### `make/` — Portrait Generation Studio
- **URL:** make.solazzo.fun
- **Vercel project:** `make` (prj_wwnTnd4o18FCMaN1b4jaJ7Xeb4tD)
- **Root Directory on Vercel:** `make`
- Next.js 16, React 19, Tailwind, Google Gemini (`@google/genai`), `@vercel/blob`, `jszip`, `@solana/web3.js` + `tweetnacl` for wallet-signed publish
- API routes: `/api/generate`, `/api/gallery`, `/api/gallery/publish` (+ challenge), `/api/notifications/*`, `/api/traits`
- Trait system: `make/src/lib/traits/` (data, roller, assembler, types). Spec: `files/solazzo_trait_system_spec.md`
- On-chain client: `make/src/lib/onchain/` (program-id SoT, PDAs, discriminators, Borsh deserializers, ix builders)
- Reference images: `Gemini-Reference/{stage}/`

#### make env vars

**Required (Vercel: production + preview + development).** Misconfiguration consequences in italics.

| Var | Purpose | What breaks if wrong/missing |
| --- | --- | --- |
| `GEMINI_API_KEY` | Gemini image generation | *`/api/generate` returns 500 on every request* |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob (gallery storage) | *Publish writes 500; gallery reads stale or fail* |
| `NEXT_PUBLIC_SOLAZZO_PROGRAM_ID` | Override of bundled IDL `.address` | *If set to a base58 string that's not the deployed program, claims+publishes silently target a non-existent account. SoT module logs `[solazzo] ... differs from bundled IDL` on cold start when env ≠ IDL. Validated; invalid base58 throws at module load.* |
| `SOLANA_RPC_URL` + `NEXT_PUBLIC_SOLANA_RPC_URL` | Server- and client-side RPC | *Wrong cluster → `Slot not found on-chain` from publish; UI shows network mismatch* |
| `PUBLISH_CHALLENGE_SECRET` (≥ 32 chars) | HMAC over publish challenges | *`/api/gallery/publish/challenge` 500s; all publishes fail "Challenge token integrity check failed"* |
| `INTERNAL_TEST_KEY` + `NEXT_PUBLIC_INTERNAL_TEST_KEY` | testGate header check | *In prod: any /api/* call without the matching header returns 401* |
| `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` | Generation reports | *Generation still works; reports drop silently* |
| `GITHUB_TOKEN` + `TRAIT_EDITOR_PASSWORD` | Trait editor (`/traits`) auth | *Trait editor unusable; user-facing studio unaffected* |

**Optional generation guardrails** (in-memory, per Fluid Compute instance; defaults preserve current behavior).

| Var | Default | Purpose |
| --- | --- | --- |
| `GENERATE_RATE_LIMIT_MAX` | `15` | Per-IP max requests inside the window |
| `GENERATE_RATE_LIMIT_WINDOW_MS` | `3600000` (1 h) | Window length for the sliding limit |
| `GENERATE_DAILY_MAX_REQUESTS` | `0` (disabled) | Per-IP daily cap, UTC |
| `GENERATE_GLOBAL_DAILY_MAX` | `0` (disabled) | Global daily Gemini-cost ceiling, UTC. Pair with a billing alert — single-instance state is best-effort. |

Invalid values fall back to defaults rather than crash. Blocked requests return `429` and emit `[generate] blocked …` warnings.

**Notifications** (only required if launch-notifications campaign is active): `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `NOTIFY_DISPATCH_SECRET`, `NOTIFY_TOKEN_SECRET`, `NOTIFY_BLOB_READ_WRITE_TOKEN`, `NOTIFY_LAUNCH_ENABLED`, `NOTIFY_LAUNCH_CAMPAIGN`, `CRON_SECRET`.

### `onchain/` — Solana Programs (Anchor)
- **Program ID (devnet, current):** `3zYyfExhUGd8dh3wZZP285iwdjdnSphpqWks4x8L1gvy`
- **Status:** in-flight conviction protocol, **not** a scaffold. Implements all v1 instructions and events end-to-end.
- **Crate:** `onchain/programs/solazzo-core/` (Anchor 0.32.1, Rust 1.89, Pyth Receiver SDK 1.1)
- **Instructions:** `initialize_protocol`, `claim_unfilled_slot`, `displace_lowest`, `claim`, `init_claimable_balance`, `set_paused` (admin), `settle_if_threshold_met`
- **State:** `ProtocolConfig`, `SlotBook`, `Slot`, `Vault`, `ClaimableBalance` (all PDAs, `INIT_SPACE`-sized)
- **Settlement:** dual-path — Pyth price threshold sustained over `settle_window_sec`, OR global timeout `settle_deadline_ts`. Idempotent latch on `is_settled`.
- **Oracle:** Pyth `PriceUpdateV2` with owner check (Receiver + Push), exponent match, staleness + confidence-BPS validation. Invalid observation resets the window without erroring.
- **Tests:**
  - `tests/solazzo-core.ts` — 40 cases, validator-backed (`AnchorProvider.env()`); run via `anchor test`
  - `tests/events.ts` — 6 bankrun cases, all four events end-to-end
  - `tests/zz-settlement.ts` — 17 bankrun cases, full settlement state machine + oracle validation
- **Toolchain pin:** `onchain/rust-toolchain.toml` (1.89.0). Anchor.toml + `declare_id!` + bundled IDL `.address` must match — CI enforces full-IDL canonical equality.
- **CI coverage:** `.github/workflows/ci.yml` `onchain` job runs `cargo fmt/clippy` + `anchor build` + IDL drift guard + the two bankrun suites (the validator-backed suite is exercised via the manual runbook, not CI — see "tradeoff" in `files/solazzo_verification_runbook.md`).

### `onchain/indexer/` — Event indexer (replay-safe SQLite)
- Better-sqlite3, WAL mode; schema v1 in `migrations/001_init.sql`
- Lamport fields stored as TEXT, arithmetic in `bigint`
- Reorg detection via `slot_blocks` + effective-tip finality boundary
- `DeepReorgError`: zero side effects on rejected deep reorgs
- 29 tests passing (`cd onchain/indexer && npm test`)

## Key Files

- `files/solazzo_protocol_v1_spec.md` — Protocol spec (canonical numeric params live here)
- `files/solazzo_trait_system_spec.md` — Trait system spec
- `files/solazzo_verification_runbook.md` — Localnet/devnet rehearsal + release smoke flow
- `files/vercel-ops.md` — Vercel CLI + deploy runbook
- `make/src/lib/onchain/program-id.ts` — Single source of truth for the Solazzo program ID at runtime. The bundled IDL's `address` is canonical; `NEXT_PUBLIC_SOLAZZO_PROGRAM_ID` can override (validated; mismatch warns). The SoT test `make/src/lib/__tests__/program-id.test.ts` asserts equality across `declare_id!`, `Anchor.toml`, bundled IDL, and runtime export.
- `make/src/lib/onchain/client.ts` — Borsh deserializers + ix builders + discriminator map (`DISCRIMINATORS` is exercised by `discriminators.test.ts`).
- `scripts/smoke-release.mjs` — read-only release-readiness checker (IDL canonical compare, program executable, ProtocolConfig PDA discriminator). Run from repo root: `node scripts/smoke-release.mjs`.

## Deployment

Both apps auto-deploy from `main` on push. Single branch workflow (no feature branches). New files in `make/` **must** be committed and pushed — untracked files won't exist on Vercel. Vercel ops runbook: `files/vercel-ops.md`. Preflight: `npm run vercel:check` from repo root.

## CI (`.github/workflows/ci.yml`)

Four jobs, all hard gates:
- `solazzo` — typecheck + lint
- `make` — typecheck + lint + 93-case test suite
- `indexer` — lint + 29-case test suite
- `onchain` — Rust fmt/clippy, anchor build (with cached Solana + Anchor CLIs), full canonical IDL drift guard, bankrun tests

## Conventions

- TypeScript strict mode in both apps
- Path alias `@/*` maps to `src/*` in both apps
- Telegram notifications for generation reports run via `after()` to keep response-time fast
- Seed-based PRNG for reproducible trait rolls
- Gallery API returns one canonical entry per slot (read-time dedup + slot canonicalization); legacy entries hidden unless `?includeLegacy=true`
- Generation guardrails are env-driven; defaults match the pre-Ticket-3 behavior so changing nothing is safe
