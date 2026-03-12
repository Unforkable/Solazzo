import { PublicKey } from "@solana/web3.js";

export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_SOLAZZO_PROGRAM_ID ??
    "52xHAYaQW1ywhdhNjxg1LvJvsEHpPBrK1J9Aud371hHC",
);

export const SOLANA_RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

export const MIN_LOCK_SOL = 1;
export const MIN_LOCK_LAMPORTS = 1_000_000_000;
export const MAX_SLOT_ID = 999;
export const SOL_DECIMALS = 1_000_000_000;
