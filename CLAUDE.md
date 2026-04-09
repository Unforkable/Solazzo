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
- Next.js 16, React 19, Tailwind, Google Gemini (`@google/genai`), `@vercel/blob`, `jszip`
- AI portrait generator: selfie -> Baroque oil painting with dynamic trait system
- API routes: `/api/generate`, `/api/gallery`, `/api/gallery/publish`
- Env vars (on Vercel): `GEMINI_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `BLOB_READ_WRITE_TOKEN`
- Trait system: `make/src/lib/traits/` (data, roller, assembler, types)
- Gemini integration: `make/src/lib/gemini.ts`
- Reference images: `Gemini-Reference/{stage}/`

### `onchain/` — Solana Programs (Anchor)
- Anchor 0.32, Solana SDK v2
- Program: `onchain/programs/solazzo-core/` (scaffold only, no business logic yet)
- Tests: `onchain/tests/solazzo-core.ts`
- Build: `cd onchain && anchor build`
- Test: `cd onchain && anchor test`
- Rust toolchain pinned in `onchain/rust-toolchain.toml`

## Key Files

- `files/solazzo_trait_system_spec.md` — Authoritative trait spec (stages, weights, fragments, coupling rules)
- `make/src/lib/traits/data.ts` — Trait implementation (86KB, all definitions + weights)
- `make/src/app/page.tsx` — Portrait studio UI
- `make/src/app/api/generate/route.ts` — Generation endpoint

## Deployment

Both apps auto-deploy from `main` branch on push. Single branch workflow (no feature branches).

When adding new files to `make/`, they must be committed and pushed — untracked files won't exist on Vercel.

Vercel ops scripts live in root `package.json` — run `npm run vercel:check` for a preflight summary. Full runbook: `files/vercel-ops.md`.

## Conventions

- TypeScript strict mode in both apps
- Path alias `@/*` maps to `src/*` in both apps
- Telegram notifications for generation reports (async via `after()`)
- Seed-based PRNG for reproducible trait rolls
- Gallery API returns one canonical entry per slot (read-time dedup + slot canonicalization). Legacy entries hidden by default; `?includeLegacy=true` for debug. UI has a "Show legacy" toggle.
