# Vercel Ops Runbook

## Monorepo Setup

One GitHub repo (`Unforkable/Solazzo`), two independent Vercel projects:

| App       | Vercel Project | Domain             | Root Directory | Auto-deploy |
|-----------|----------------|--------------------|----------------|-------------|
| `solazzo/` | solazzo        | solazzo.fun        | `solazzo/`     | main branch |
| `make/`    | make           | make.solazzo.fun   | `make/`        | main branch |

Both projects deploy automatically on every push to `main`. Each project only sees files under its own Root Directory.

**Env vars are completely separate.** A variable set on the `solazzo` project does not exist on `make`, and vice versa.

## Daily Commands

All commands run from the **repo root** (`/Users/jonas/Repo/Solazzo`).

### List env vars
```sh
npm run vercel:solazzo:env    # solazzo project
npm run vercel:make:env       # make project
```

### List recent deployments
```sh
npm run vercel:solazzo:ls
npm run vercel:make:ls
```

### Redeploy with fresh env vars
```sh
npm run vercel:solazzo:redeploy
npm run vercel:make:redeploy
```

This redeploys the latest existing deployment, picking up any env var changes. It does NOT rebuild from source — use `git push` for that.

### Production deploy (new build)
```sh
git push origin main
```

Both apps rebuild automatically. There is no working `vercel --prod` from CLI due to the Root Directory doubling bug (see Common Mistakes below).

### Preflight check
```sh
npm run vercel:check
```

Prints app-to-project mapping, current branch, and available commands.

## Common Mistakes

### 1. Running Vercel CLI from the wrong directory
The Vercel CLI picks the project from `.vercel/project.json` in the current directory. Running `vercel env ls` from the repo root targets `solazzo`, not `make`.

**Fix:** Use the npm scripts (they `cd` into the right directory) or explicitly `cd make && vercel env ls`.

### 2. Setting an env var on the wrong project
`GITHUB_TOKEN` is only needed on `make` (for the trait editor). Setting it on `solazzo` does nothing.

**Fix:** Always `cd` into the correct app directory before running `vercel env add`.

### 3. Assuming one project's env applies to both
They are completely independent. If both apps need the same variable, you must set it on both projects separately.

### 4. `vercel --prod` fails with "path does not exist"
The Vercel CLI appends the project's Root Directory setting to the current working directory. If you're already inside `make/` and Root Directory is `make`, it looks for `make/make/` which doesn't exist.

**Fix:** Don't use `vercel deploy --prod` from CLI. Use `git push origin main` for production deploys, or `npm run vercel:<app>:redeploy` to redeploy with updated env vars.

### 5. Fine-grained PATs expiring silently
GitHub fine-grained tokens default to 30-day expiry. When `GITHUB_TOKEN` expires, the trait editor shows a 401 error. The improved diagnostics in `make/src/app/api/traits/route.ts` now tell you exactly what to fix.

**Fix:** Set token expiry to 90 days when generating. Add a calendar reminder to rotate before expiry.

## 60-Second Preflight: Before Changing Env Vars

1. **Which app needs this var?** `solazzo` or `make`?
2. **`cd` into the right directory** (`cd make` or `cd solazzo`).
3. **Check existing value:** `vercel env ls` — is it already set?
4. **Which environments?** Production, Preview, Development — or all three?
5. **Set the var:** `vercel env add VAR_NAME production` (pipe value via stdin or paste when prompted).
6. **Redeploy** to pick up the change: `npm run vercel:<app>:redeploy` from repo root.
7. **Verify** the var is live by checking app behavior or logs.
