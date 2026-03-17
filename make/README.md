# make/ — Portrait Generation Studio

## Production Testing Mode

Sensitive API routes are gated by a shared test key during testing.

### Required env vars

| Variable | Values | Purpose |
|---|---|---|
| `INTERNAL_TEST_KEY` | any secret string | Server-side gate for all sensitive API routes |
| `NEXT_PUBLIC_INTERNAL_TEST_KEY` | same value as above | Client-side — lets the browser UI send the key automatically |
| `TEST_MODE` | `true` / `false` | `true` = testing flow (trait editor accessible). `false` = trait editor blocked in prod unless `ENABLE_TRAIT_EDITOR_IN_PROD=true` |
| `GENERATION_ENABLED` | `true` / `false` | `false` = kill switch, `/api/generate` returns 503 |
| `ENABLE_TRAIT_EDITOR_IN_PROD` | `true` / `false` | Override to keep trait editor open when `TEST_MODE=false` |
| `TRAIT_EDITOR_PASSWORD` | any secret string | Additional password for trait editor access |

### Auth flow (per route)

```
POST /api/generate         -> test gate -> generation kill switch -> handler
POST /api/gallery/publish  -> test gate -> handler
GET  /api/traits           -> test gate -> trait editor gate -> editor password -> handler
PUT  /api/traits           -> test gate -> trait editor gate -> editor password -> handler
```

In local dev (`NODE_ENV !== "production"`): all gates fail open when env vars are unset.

## Claim UX Policy (v1)

### No manual slot selection

There is no slot browser grid, slot input field, or any other manual slot-picking UI. Users cannot choose a slot ID. The only path is auto-assignment.

### Auto-assignment

The client reads the on-chain `SlotBook` and assigns the first open slot (`findIndex` on the occupied array). The user sees a compact card showing their assigned slot number (0-based, matching on-chain `slot_id`).

### Race-condition reassignment

If the assigned slot gets claimed by another user between assignment and transaction confirmation:
1. The pre-flight check detects the slot is occupied.
2. The app re-fetches `SlotBook` and assigns the next open slot.
3. The user sees an error message with the new assignment and is prompted to click "Claim" again.

If no open slots remain, the user is told no slots are available.

### 0-based numbering consistency

All slot IDs are `0..999` everywhere: on-chain program, backend API payloads, frontend state, and UI display text. There is no 1-based display mapping. This prevents off-by-one bugs between layers.

## Pre-Launch Verification

Use the canonical runbook before release:

- `files/solazzo_verification_runbook.md`

Required gate:

- Do not proceed toward mainnet launch unless the runbook passes end-to-end (claim, displacement credit, withdraw-to-zero, network alignment checks).

## Notification Signups (MVP)

- `POST /api/notifications/subscribe` stores email notification preferences in Blob (`notify-subscribers/*.json`).
- Supported preferences:
  - Launch announcements
  - Slot replaced alerts (requires wallet)
  - SOL claimable alerts (requires wallet)
- This endpoint stores subscriptions only. Delivery is handled by the dispatch pipeline below.

## Email Notification Delivery

Cron-driven pipeline that sends email notifications via Resend. Runs every 15 minutes via Vercel Cron (`vercel.json`).

### Required env vars

| Variable | Purpose |
|---|---|
| `RESEND_API_KEY` | Resend API key for sending emails |
| `RESEND_FROM_EMAIL` | Sender address, e.g. `Solazzo <notify@solazzo.fun>` |
| `NOTIFY_DISPATCH_SECRET` | Bearer token for the dispatch endpoint |

### Event types

| Event | Trigger | Idempotency key |
|---|---|---|
| **Launch** | `notifyLaunch=true` | `launch-v1__<email>` |
| **Replaced** | Historical gallery slot no longer active on-chain | `replaced__<wallet>__slot-<id>` |
| **Claimable** | `ClaimableBalance` PDA has lamports > 0 | `claimable__<wallet>__<lastUpdatedAt>_<lamports>` |

### Auth flow

```
POST /api/notifications/dispatch -> Bearer token check -> runDispatch() -> JSON summary
```

Vercel Cron invokes the route automatically. Manual trigger:

```bash
curl -X POST https://make.solazzo.fun/api/notifications/dispatch \
  -H "authorization: Bearer YOUR_DISPATCH_SECRET"
```

### Architecture

- `src/lib/email.ts` — Resend SDK wrapper
- `src/lib/notify-dispatch.ts` — event detection + email send loop
- `src/lib/notify-delivery-log.ts` — idempotency via Vercel Blob (`notify-deliveries/`)
- `src/lib/notify-store.ts` — subscriber listing from Blob (`notify-subscribers/`)
- `vercel.json` — cron schedule (every 15 min)

Delivery is idempotent: each event is keyed so re-running dispatch never sends duplicate emails. The claimable key includes `lastUpdatedAt` and `claimableLamports` so a new notification fires when the balance changes.

### curl examples

Generate a portrait:
```bash
curl -X POST https://make.solazzo.fun/api/generate \
  -H "x-internal-test-key: YOUR_KEY" \
  -F "image=@selfie.jpg" \
  -F "stage=1"
```

Publish to gallery:
```bash
curl -X POST https://make.solazzo.fun/api/gallery/publish \
  -H "x-internal-test-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"portraits": ["data:image/jpeg;base64,..."], "traits": [...]}'
```

Read traits:
```bash
curl https://make.solazzo.fun/api/traits \
  -H "x-internal-test-key: YOUR_KEY" \
  -H "x-editor-password: YOUR_EDITOR_PW"
```
