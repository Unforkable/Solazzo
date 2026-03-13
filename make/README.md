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
