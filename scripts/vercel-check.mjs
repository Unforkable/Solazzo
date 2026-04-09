#!/usr/bin/env node

/**
 * Vercel monorepo preflight check.
 * Run from repo root: node scripts/vercel-check.mjs
 */

import { execSync } from "node:child_process";

const run = (cmd) => {
  try {
    return execSync(cmd, { encoding: "utf-8" }).trim();
  } catch {
    return "(failed)";
  }
};

const branch = run("git rev-parse --abbrev-ref HEAD");

console.log(`
┌──────────────────────────────────────────────────────┐
│  Solazzo — Vercel Monorepo Preflight                 │
└──────────────────────────────────────────────────────┘

  Git branch:  ${branch}

  App          Vercel Project   Domain               Root Dir
  ───────────  ───────────────  ───────────────────  ────────
  solazzo/     solazzo          solazzo.fun          solazzo/
  make/        make             make.solazzo.fun     make/

  ⚠  Env vars are per-project. Setting a var on "solazzo"
     does NOT make it available on "make", and vice versa.

  ⚠  'vercel deploy --prod' fails from CLI due to Root Dir
     doubling. Use 'git push origin main' for production
     deploys, or 'npm run vercel:<app>:redeploy' to redeploy
     the latest existing deployment with fresh env vars.

  Quick commands (run from repo root):
    npm run vercel:check             # this preflight
    npm run vercel:solazzo:env       # list solazzo env vars
    npm run vercel:make:env          # list make env vars
    npm run vercel:solazzo:ls        # list solazzo deployments
    npm run vercel:make:ls           # list make deployments
    npm run vercel:solazzo:redeploy  # redeploy latest solazzo
    npm run vercel:make:redeploy    # redeploy latest make
`);
