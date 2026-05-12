#!/usr/bin/env node

/**
 * Vercel monorepo doctor — read-only diagnostics.
 * Run from repo root: node scripts/vercel-doctor.mjs
 *
 * Checks:
 *  A) Git context (current branch)
 *  B) Vercel project reachability + latest deployment per app
 *  C) Required env var presence (names only, never values)
 *  D) Action hints for anything that looks wrong
 *
 * Exit 0 = all checks pass, exit 1 = something needs attention.
 */

import { execSync } from "node:child_process";

// ── helpers ────────────────────────────────────────────────────────

const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";

const ok = (msg) => console.log(`  ${GREEN}✓${RESET} ${msg}`);
const fail = (msg) => console.log(`  ${RED}✗${RESET} ${msg}`);
const warn = (msg) => console.log(`  ${YELLOW}!${RESET} ${msg}`);
const dim = (msg) => console.log(`  ${DIM}${msg}${RESET}`);

let failures = 0;

function run(cmd) {
  try {
    return execSync(cmd, { encoding: "utf-8", timeout: 15_000 }).trim();
  } catch {
    return null;
  }
}

// ── A) Git context ─────────────────────────────────────────────────

console.log("\n  Solazzo — Vercel Doctor\n");
console.log("  A) Git context");

const branch = run("git rev-parse --abbrev-ref HEAD");
if (branch) {
  ok(`Branch: ${branch}`);
  if (branch !== "main") {
    warn("Not on main — Vercel auto-deploys only trigger from main.");
  }
} else {
  fail("Could not determine git branch.");
  failures++;
}

// ── B) Vercel project context ──────────────────────────────────────

console.log("\n  B) Vercel project context");

const APPS = [
  { name: "solazzo", domain: "solazzo.fun", cwd: "solazzo" },
  { name: "make", domain: "make.solazzo.fun", cwd: "make" },
];

for (const app of APPS) {
  const raw = run(`vercel ls --cwd ${app.cwd} 2>&1`);
  if (!raw) {
    fail(`${app.name}: vercel ls failed — is Vercel CLI authenticated?`);
    dim(`  Run: vercel login`);
    failures++;
    continue;
  }
  if (raw.includes("Error")) {
    fail(`${app.name}: ${raw.split("\n").find((l) => l.includes("Error"))}`);
    failures++;
    continue;
  }

  const deployLine = raw.split("\n").find((l) => l.includes("Ready"));
  if (deployLine) {
    const age = deployLine.match(/^\s*(\S+)/)?.[1] ?? "?";
    ok(`${app.name} (${app.domain}): latest deploy ${age} ago — Ready`);
  } else {
    warn(`${app.name}: no Ready deployment found.`);
  }
}

// ── C) Env var presence checks ─────────────────────────────────────

console.log("\n  C) Env var presence (names only)");

/**
 * Returns Set of env var names found on a Vercel project.
 * Parses the table output of `vercel env ls`.
 */
function getEnvNames(cwd) {
  const raw = run(`vercel env ls --cwd ${cwd} 2>&1`);
  if (!raw) return null;

  const names = new Set();
  for (const line of raw.split("\n")) {
    // Table rows start with a space then the var name
    const match = line.match(/^\s+(\w[\w_]*)\s+Encrypted/);
    if (match) names.add(match[1]);
  }
  return names;
}

// make — required vars (failure = degraded or broken user flow)
// See CLAUDE.md `#### make env vars` for what breaks if any of these are missing.
const MAKE_REQUIRED = [
  "GEMINI_API_KEY",
  "BLOB_READ_WRITE_TOKEN",
  "NEXT_PUBLIC_SOLAZZO_PROGRAM_ID",
  "SOLANA_RPC_URL",
  "NEXT_PUBLIC_SOLANA_RPC_URL",
  "PUBLISH_CHALLENGE_SECRET",
  "INTERNAL_TEST_KEY",
  "NEXT_PUBLIC_INTERNAL_TEST_KEY",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
  "GITHUB_TOKEN",
  "TRAIT_EDITOR_PASSWORD",
];

// make — optional vars (informational; doctor reports presence but never fails on absence)
const MAKE_OPTIONAL = [
  "GENERATE_RATE_LIMIT_MAX",
  "GENERATE_RATE_LIMIT_WINDOW_MS",
  "GENERATE_DAILY_MAX_REQUESTS",
  "GENERATE_GLOBAL_DAILY_MAX",
];

const makeEnv = getEnvNames("make");
if (makeEnv === null) {
  fail("make: could not list env vars.");
  dim("  Run: npm run vercel:make:env");
  failures++;
} else {
  let makeOk = true;
  for (const v of MAKE_REQUIRED) {
    if (makeEnv.has(v)) {
      ok(`make: ${v}`);
    } else {
      fail(`make: ${v} — MISSING`);
      makeOk = false;
      failures++;
    }
  }
  for (const v of MAKE_OPTIONAL) {
    if (makeEnv.has(v)) {
      dim(`make (optional): ${v} present`);
    }
  }
  if (!makeOk) {
    dim("  Inspect: npm run vercel:make:env");
    dim("  Fix:     cd make && vercel env add <VAR_NAME> production");
    dim("  See CLAUDE.md for what each var does and what breaks if missing.");
  }
}

// solazzo — no strict requirements, just report
const solazzoEnv = getEnvNames("solazzo");
if (solazzoEnv === null) {
  fail("solazzo: could not list env vars.");
  failures++;
} else if (solazzoEnv.size === 0) {
  ok("solazzo: no env vars configured (none required).");
} else {
  ok(`solazzo: ${solazzoEnv.size} env var(s) present.`);
}

// ── D) Summary ─────────────────────────────────────────────────────

console.log("");
if (failures > 0) {
  console.log(
    `  ${RED}${failures} issue(s) found.${RESET} See hints above.\n`,
  );
  process.exit(1);
} else {
  console.log(`  ${GREEN}All checks passed.${RESET}\n`);
  process.exit(0);
}
