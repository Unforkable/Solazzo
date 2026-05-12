// PROGRAM_ID is resolved from a single source-of-truth module so the bundled
// IDL address, env override, and on-chain declare_id! cannot drift apart.
export { PROGRAM_ID, IDL_PROGRAM_ID } from "./program-id";

export const SOLANA_RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

export const MIN_LOCK_SOL = 1;
export const MIN_LOCK_LAMPORTS = 1_000_000_000;
export const MAX_SLOT_ID = 999;
export const SOL_DECIMALS = 1_000_000_000;
