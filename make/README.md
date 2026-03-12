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
