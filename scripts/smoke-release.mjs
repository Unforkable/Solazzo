#!/usr/bin/env node
/**
 * Solazzo release smoke — read-only, non-wallet checks.
 *
 * Runs the four automated checks documented in
 * `files/solazzo_verification_runbook.md` § 8.2:
 *   1. Bundled IDL canonically equals built IDL.
 *   2. Program account exists on the configured RPC and is executable.
 *   3. ProtocolConfig PDA exists with the expected Anchor discriminator.
 *   4. SlotBook PDA exists with the expected Anchor discriminator.
 *
 * Inputs (all optional — defaults are devnet / bundled IDL):
 *   SOLANA_RPC_URL                  RPC endpoint (default: https://api.devnet.solana.com)
 *   NEXT_PUBLIC_SOLAZZO_PROGRAM_ID  Program ID override (default: bundled IDL .address)
 *   SOLAZZO_PROGRAM_ID              Same as above; checked second.
 *
 * Exit codes: 0 = all pass, 1 = any failure.
 *
 * Run from repo root:
 *   node scripts/smoke-release.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = resolve(dirname(__filename), "..");

const BUILT_IDL = join(REPO_ROOT, "onchain", "target", "idl", "solazzo_core.json");
const BUNDLED_IDL = join(
  REPO_ROOT,
  "make",
  "src",
  "lib",
  "onchain",
  "idl",
  "solazzo_core.json",
);

// Anchor discriminators (sha256("account:<name>")[..8]) — same values the
// make client uses in `src/lib/onchain/client.ts`. Hard-coded here so the
// script can validate without importing TS.
const PROTOCOL_CONFIG_DISC = [207, 91, 250, 28, 152, 179, 215, 209];
const SLOT_BOOK_DISC = [174, 179, 156, 123, 56, 7, 117, 186];

const RPC_URL =
  process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

// ── tiny styling ───────────────────────────────────────────────────────
const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";

const results = [];
function pass(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`  ${GREEN}✓${RESET} ${name}${detail ? ` ${DIM}— ${detail}${RESET}` : ""}`);
}
function fail(name, detail) {
  results.push({ name, ok: false, detail });
  console.log(`  ${RED}✗${RESET} ${name} ${DIM}— ${detail}${RESET}`);
}

// ── helpers ────────────────────────────────────────────────────────────

function canon(x) {
  if (Array.isArray(x)) return x.map(canon);
  if (x && typeof x === "object") {
    const o = {};
    for (const k of Object.keys(x).sort()) o[k] = canon(x[k]);
    return o;
  }
  return x;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

async function rpc(method, params, timeoutMs = 10_000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(RPC_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: ctrl.signal,
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    if (j.error) throw new Error(`${j.error.code}: ${j.error.message}`);
    return j.result;
  } finally {
    clearTimeout(t);
  }
}

// ── lazy dependency loading ────────────────────────────────────────────
// No package.json under scripts/ — reuse @solana/web3.js already vendored
// by make/. PDA checks are skipped (with a clear failure) if make/node_modules
// isn't present yet.
let _web3 = null;
try {
  _web3 = await import(
    join(REPO_ROOT, "make", "node_modules", "@solana", "web3.js", "lib", "index.cjs.js")
  );
} catch {
  try {
    _web3 = await import(
      join(REPO_ROOT, "make", "node_modules", "@solana", "web3.js", "lib", "index.mjs")
    );
  } catch {
    _web3 = null;
  }
}

// ── checks ─────────────────────────────────────────────────────────────

console.log(`\n  Solazzo release smoke — RPC: ${RPC_URL}\n`);

// (1) IDL canonical equality
let bundledIdl;
let builtIdlMissing = false;
try {
  bundledIdl = readJson(BUNDLED_IDL);
} catch (e) {
  fail("Bundled IDL readable", `cannot read ${BUNDLED_IDL}: ${e.message}`);
}
if (bundledIdl) {
  if (!existsSync(BUILT_IDL)) {
    fail(
      "Built IDL exists (onchain/target/idl/solazzo_core.json)",
      "run `cd onchain && anchor build` first; skipping canonical compare",
    );
    builtIdlMissing = true;
  } else {
    try {
      const built = readJson(BUILT_IDL);
      const a = JSON.stringify(canon(built));
      const b = JSON.stringify(canon(bundledIdl));
      if (a === b) {
        pass(
          "Bundled IDL canonically equals built IDL",
          `errors=${built.errors?.length}, ix=${built.instructions?.length}, address=${built.address}`,
        );
      } else {
        fail(
          "Bundled IDL canonically equals built IDL",
          `drift detected (built errors=${built.errors?.length}, bundled errors=${bundledIdl.errors?.length}). Run: cp onchain/target/idl/solazzo_core.json make/src/lib/onchain/idl/solazzo_core.json`,
        );
      }
    } catch (e) {
      fail("Built IDL parseable", e.message);
    }
  }
}

// (2) Program account on RPC
const programIdStr =
  process.env.NEXT_PUBLIC_SOLAZZO_PROGRAM_ID ??
  process.env.SOLAZZO_PROGRAM_ID ??
  bundledIdl?.address;

if (!programIdStr) {
  fail("Resolve program ID", "no env override and bundled IDL is missing .address");
} else {
  try {
    const info = await rpc("getAccountInfo", [
      programIdStr,
      { encoding: "base64", commitment: "confirmed" },
    ]);
    if (!info?.value) {
      fail(
        `Program account exists on ${RPC_URL}`,
        `getAccountInfo returned null for ${programIdStr}`,
      );
    } else if (!info.value.executable) {
      fail(
        `Program account is executable`,
        `${programIdStr} found but executable=false (owner=${info.value.owner})`,
      );
    } else {
      pass(
        `Program account executable at ${programIdStr}`,
        `owner=${info.value.owner}`,
      );
    }
  } catch (e) {
    fail(`Program account exists on ${RPC_URL}`, e.message);
  }
}

// (3) + (4) PDA discriminator checks
if (programIdStr && _web3) {
  let programIdBytes;
  try {
    // Use web3.js's vetted base58 decoder rather than reimplementing it.
    programIdBytes = new _web3.PublicKey(programIdStr).toBytes();
    if (programIdBytes.length !== 32)
      throw new Error(`decoded length ${programIdBytes.length} ≠ 32`);
  } catch (e) {
    fail("Program ID is a 32-byte base58 pubkey", e.message);
    programIdBytes = null;
  }

  const PDAS = [
    {
      label: "ProtocolConfig",
      seeds: [new TextEncoder().encode("protocol_config")],
      expectedDisc: PROTOCOL_CONFIG_DISC,
    },
    {
      label: "SlotBook",
      seeds: [new TextEncoder().encode("slot_book")],
      expectedDisc: SLOT_BOOK_DISC,
    },
  ];

  for (const { label, seeds, expectedDisc } of PDAS) {
    if (!programIdBytes) break;
    let pdaStr;
    try {
      const [pda] = _web3.PublicKey.findProgramAddressSync(
        seeds,
        new _web3.PublicKey(programIdStr),
      );
      pdaStr = pda.toBase58();
    } catch (e) {
      fail(`${label} PDA derivable`, e.message);
      continue;
    }
    try {
      const info = await rpc("getAccountInfo", [
        pdaStr,
        { encoding: "base64", commitment: "confirmed" },
      ]);
      if (!info?.value) {
        fail(
          `${label} PDA exists on ${RPC_URL}`,
          `${pdaStr} not found — protocol may not be initialized on this cluster`,
        );
        continue;
      }
      if (info.value.owner !== programIdStr) {
        fail(
          `${label} PDA owned by program`,
          `${pdaStr} owner=${info.value.owner} (expected ${programIdStr})`,
        );
        continue;
      }
      const data = Buffer.from(info.value.data[0], "base64");
      const actualDisc = [...data.subarray(0, 8)];
      const match =
        actualDisc.length === 8 &&
        expectedDisc.every((b, i) => actualDisc[i] === b);
      if (!match) {
        fail(
          `${label} discriminator matches client`,
          `built=[${actualDisc.join(",")}] expected=[${expectedDisc.join(",")}]`,
        );
      } else {
        pass(`${label} PDA exists with expected discriminator`, pdaStr);
      }
    } catch (e) {
      fail(`${label} PDA fetch`, e.message);
    }
  }
} else if (programIdStr && !_web3) {
  fail(
    "PDA checks",
    "make/node_modules/@solana/web3.js not found — run `cd make && npm ci` to enable",
  );
}

// ── summary ────────────────────────────────────────────────────────────

const failed = results.filter((r) => !r.ok);
console.log("");
if (failed.length === 0) {
  console.log(`  ${GREEN}All ${results.length} checks passed.${RESET}`);
  console.log(
    `  ${DIM}Manual wallet step (browser): see files/solazzo_verification_runbook.md § 8.4${RESET}\n`,
  );
  process.exit(0);
} else {
  console.log(
    `  ${RED}${failed.length} of ${results.length} checks failed.${RESET}`,
  );
  for (const r of failed) console.log(`    - ${r.name}: ${r.detail}`);
  console.log(
    `  ${DIM}Remediation hints: files/solazzo_verification_runbook.md § 8.6${RESET}\n`,
  );
  // Built IDL missing is informational (depends on local anchor build state)
  // but still surfaces as a failure so release pipelines fail-loud.
  process.exit(builtIdlMissing && failed.length === 1 ? 2 : 1);
}
