import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "./constants";

export function getProtocolConfigPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("protocol_config")],
    PROGRAM_ID,
  );
}

export function getVaultPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault")],
    PROGRAM_ID,
  );
}

export function getSlotBookPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("slot_book")],
    PROGRAM_ID,
  );
}

export function getSlotPDA(slotId: number): [PublicKey, number] {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(slotId);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("slot"), buf],
    PROGRAM_ID,
  );
}

export function getClaimableBalancePDA(
  owner: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("claimable_balance"), owner.toBuffer()],
    PROGRAM_ID,
  );
}
