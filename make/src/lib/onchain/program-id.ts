/**
 * Single source of truth for the Solazzo program ID at runtime (make app).
 *
 * Priority (highest wins):
 *   1. NEXT_PUBLIC_SOLAZZO_PROGRAM_ID env var (validated, mismatch warns).
 *   2. The "address" field of the bundled IDL JSON.
 *
 * The bundled IDL is the canonical, repo-committed value. `anchor build` writes
 * the program's declare_id! into the IDL's "address" field, so keeping the IDL
 * in sync with declare_id! is enforced by the program-id source-of-truth test
 * (`make/src/lib/__tests__/program-id.test.ts`).
 *
 * Env override behavior:
 *   - Invalid base58 / wrong length → throws at module load.
 *   - Valid but differs from IDL → emits a one-time console.warn.
 *
 * This prevents the silent drift that previously existed across constants.ts,
 * the publish route, and the indexer.
 */

import { PublicKey } from "@solana/web3.js";
import idl from "./idl/solazzo_core.json";

/** Address field from the bundled IDL — the repo-committed canonical ID. */
export const IDL_PROGRAM_ID: string = (() => {
  const addr = (idl as { address?: unknown }).address;
  if (typeof addr !== "string" || addr.length === 0) {
    throw new Error(
      "Bundled IDL (solazzo_core.json) is missing a non-empty 'address' field.",
    );
  }
  // Validate by constructing a PublicKey — throws on bad base58 / wrong length.
  new PublicKey(addr);
  return addr;
})();

/**
 * Resolve and validate the effective program ID for this process.
 *
 * Throws if the env override is set but malformed.
 * Logs a one-time warning if the env override is valid but differs from the IDL.
 */
function resolveProgramId(): PublicKey {
  const envValue = process.env.NEXT_PUBLIC_SOLAZZO_PROGRAM_ID;
  if (!envValue || envValue.trim() === "") {
    return new PublicKey(IDL_PROGRAM_ID);
  }

  let envKey: PublicKey;
  try {
    envKey = new PublicKey(envValue);
  } catch {
    throw new Error(
      `NEXT_PUBLIC_SOLAZZO_PROGRAM_ID is not a valid base58 Solana public key: ${JSON.stringify(envValue)}`,
    );
  }

  if (envValue !== IDL_PROGRAM_ID) {
    // Diverging from the bundled IDL is supported (e.g. devnet-only override)
    // but very rarely intended. Surface it loudly so a stale env doesn't
    // silently route transactions to the wrong deployment.
    // eslint-disable-next-line no-console
    console.warn(
      `[solazzo] NEXT_PUBLIC_SOLAZZO_PROGRAM_ID (${envValue}) differs from bundled IDL address (${IDL_PROGRAM_ID}). ` +
        "Instruction/account layouts must still match this deployment.",
    );
  }

  return envKey;
}

export const PROGRAM_ID: PublicKey = resolveProgramId();
