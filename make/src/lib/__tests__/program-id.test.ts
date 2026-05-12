/**
 * Program ID source-of-truth test.
 *
 * Asserts that the canonical Solazzo program ID is identical across:
 *   1. declare_id! in onchain/programs/solazzo-core/src/lib.rs
 *   2. [programs.localnet] solazzo_core in onchain/Anchor.toml
 *   3. The bundled IDL "address" in make/src/lib/onchain/idl/solazzo_core.json
 *   4. PROGRAM_ID exported by make/src/lib/onchain/program-id.ts
 *
 * Any drift here means clients/build/program disagree about the program's
 * identity — the exact class of bug that has bitten this repo before. The
 * test fails loudly with the diverging values printed.
 *
 * Env-override behavior is exercised in a subprocess so the module's
 * one-shot top-level resolution runs from a clean state each time.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = join(__dirname, "..", "..", "..", "..");
const LIB_RS = join(REPO_ROOT, "onchain", "programs", "solazzo-core", "src", "lib.rs");
const ANCHOR_TOML = join(REPO_ROOT, "onchain", "Anchor.toml");
const BUNDLED_IDL = join(
  REPO_ROOT,
  "make",
  "src",
  "lib",
  "onchain",
  "idl",
  "solazzo_core.json",
);
const PROGRAM_ID_MOD = join(REPO_ROOT, "make", "src", "lib", "onchain", "program-id.ts");

function parseDeclareId(libRs: string): string {
  const m = libRs.match(/declare_id!\(\s*"([1-9A-HJ-NP-Za-km-z]+)"\s*\)\s*;/);
  if (!m) throw new Error("declare_id! not found in lib.rs");
  return m[1];
}

function parseAnchorTomlProgramId(toml: string): string {
  // Scope to [programs.localnet] so the constant under a different section
  // (e.g. devnet) wouldn't masquerade as the canonical localnet value.
  const section = toml.split(/\n\[/).find((s) => s.startsWith("programs.localnet"));
  if (!section) throw new Error("[programs.localnet] section missing in Anchor.toml");
  const m = section.match(/solazzo_core\s*=\s*"([1-9A-HJ-NP-Za-km-z]+)"/);
  if (!m) throw new Error("solazzo_core key not found in [programs.localnet]");
  return m[1];
}

/**
 * Run a snippet inside the make/ directory with tsx so module resolution
 * matches the production build (relative IDL JSON, @solana/web3.js, etc.).
 * Returns the spawn result for the caller to inspect stdout / stderr / status.
 */
function runWithProgramIdEnv(envOverride: string | undefined, snippet: string) {
  const env = { ...process.env };
  delete env.NEXT_PUBLIC_SOLAZZO_PROGRAM_ID;
  if (envOverride !== undefined) {
    env.NEXT_PUBLIC_SOLAZZO_PROGRAM_ID = envOverride;
  }
  return spawnSync("npx", ["tsx", "-e", snippet], {
    cwd: join(REPO_ROOT, "make"),
    env,
    encoding: "utf-8",
  });
}

describe("Solazzo program ID is one source of truth", () => {
  it("declare_id, Anchor.toml, bundled IDL, and program-id.ts all agree", () => {
    const declareId = parseDeclareId(readFileSync(LIB_RS, "utf-8"));
    const anchorTomlId = parseAnchorTomlProgramId(readFileSync(ANCHOR_TOML, "utf-8"));
    const idlAddress = (JSON.parse(readFileSync(BUNDLED_IDL, "utf-8")) as {
      address?: unknown;
    }).address;
    assert.equal(typeof idlAddress, "string", "Bundled IDL must have a string 'address'");

    // Resolve the runtime value in a clean subprocess (no env override),
    // so this test is robust to whatever this process inherited.
    const out = runWithProgramIdEnv(
      undefined,
      "import('./src/lib/onchain/program-id').then(r => { const m = r.default ?? r; " +
        "process.stdout.write(m.PROGRAM_ID.toBase58() + '|' + m.IDL_PROGRAM_ID); });",
    );
    assert.equal(
      out.status,
      0,
      `program-id.ts failed to load: ${out.stderr || out.stdout}`,
    );
    const [runtimeId, runtimeIdlId] = out.stdout.trim().split("|");

    const values = {
      "lib.rs declare_id!": declareId,
      "Anchor.toml [programs.localnet]": anchorTomlId,
      "bundled IDL .address": idlAddress as string,
      "program-id.ts IDL_PROGRAM_ID": runtimeIdlId,
      "program-id.ts PROGRAM_ID": runtimeId,
    };
    const uniq = new Set(Object.values(values));
    assert.equal(
      uniq.size,
      1,
      `Program ID drift detected:\n${JSON.stringify(values, null, 2)}`,
    );
  });
});

describe("program-id env override contract", () => {
  it("loads cleanly with no env override (defaults to bundled IDL)", () => {
    const out = runWithProgramIdEnv(
      undefined,
      "import('./src/lib/onchain/program-id').then(r => { const m = r.default ?? r; " +
        "process.stdout.write(m.PROGRAM_ID.toBase58()); });",
    );
    assert.equal(out.status, 0, out.stderr);
    const idlAddress = (JSON.parse(readFileSync(BUNDLED_IDL, "utf-8")) as {
      address: string;
    }).address;
    assert.equal(out.stdout.trim(), idlAddress);
  });

  it("accepts a valid env override that matches the IDL (no warning)", () => {
    const idlAddress = (JSON.parse(readFileSync(BUNDLED_IDL, "utf-8")) as {
      address: string;
    }).address;
    const out = runWithProgramIdEnv(
      idlAddress,
      "import('./src/lib/onchain/program-id').then(r => { const m = r.default ?? r; " +
        "process.stdout.write(m.PROGRAM_ID.toBase58()); });",
    );
    assert.equal(out.status, 0, out.stderr);
    assert.equal(out.stdout.trim(), idlAddress);
    assert.ok(
      !out.stderr.includes("differs from bundled IDL"),
      `Expected no mismatch warning, got: ${out.stderr}`,
    );
  });

  it("warns (does not throw) when env override is valid but differs from IDL", () => {
    // Any well-formed but unrelated base58 pubkey works.
    const otherKey = "11111111111111111111111111111111"; // System Program
    const out = runWithProgramIdEnv(
      otherKey,
      "import('./src/lib/onchain/program-id').then(r => { const m = r.default ?? r; " +
        "process.stdout.write(m.PROGRAM_ID.toBase58()); });",
    );
    assert.equal(out.status, 0, out.stderr);
    assert.equal(out.stdout.trim(), otherKey);
    assert.ok(
      out.stderr.includes("differs from bundled IDL"),
      `Expected mismatch warning on stderr, got: ${out.stderr}`,
    );
  });

  it("throws on invalid base58 env override", () => {
    const out = runWithProgramIdEnv(
      "not-a-valid-key!!!",
      "import('./src/lib/onchain/program-id').then(r => { const m = r.default ?? r; " +
        "process.stdout.write(m.PROGRAM_ID.toBase58()); })" +
        ".catch(e => { console.error(e.message); process.exit(2); });",
    );
    assert.notEqual(out.status, 0);
    assert.match(
      out.stderr,
      /NEXT_PUBLIC_SOLAZZO_PROGRAM_ID.*valid base58/,
      `Expected base58 validation error, got: ${out.stderr}`,
    );
  });
});
