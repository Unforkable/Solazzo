import { BorshCoder, EventParser, Event, Idl } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

const PROGRAM_ID = new PublicKey("52xHAYaQW1ywhdhNjxg1LvJvsEHpPBrK1J9Aud371hHC");

// Event types matching the on-chain Anchor events
export interface SlotClaimedEvent {
  type: "SlotClaimed";
  slotId: number;
  owner: string;
  lockLamports: bigint;
  ts: number;
}

export interface SlotDisplacedEvent {
  type: "SlotDisplaced";
  slotId: number;
  oldOwner: string;
  newOwner: string;
  oldLockLamports: bigint;
  newLockLamports: bigint;
  feeLamports: bigint;
  ts: number;
}

export interface ClaimCreditedEvent {
  type: "ClaimCredited";
  owner: string;
  amountLamports: bigint;
  ts: number;
}

export interface ClaimedEvent {
  type: "Claimed";
  owner: string;
  amountLamports: bigint;
  ts: number;
}

export interface SettlementWindowStartedEvent {
  type: "SettlementWindowStarted";
  ts: number;
}

export interface SettlementWindowResetEvent {
  type: "SettlementWindowReset";
  ts: number;
}

export interface SettledEvent {
  type: "Settled";
  ts: number;
}

export type SolazzoEvent =
  | SlotClaimedEvent
  | SlotDisplacedEvent
  | ClaimCreditedEvent
  | ClaimedEvent
  | SettlementWindowStartedEvent
  | SettlementWindowResetEvent
  | SettledEvent;

/** Load the Solazzo IDL from the build output. */
function loadIdl(): Idl {
  const idlPath = path.join(__dirname, "..", "..", "target", "idl", "solazzo_core.json");
  return JSON.parse(fs.readFileSync(idlPath, "utf-8"));
}

/**
 * Decode Solazzo program events from transaction log messages.
 *
 * Uses Anchor's built-in EventParser which handles the base64-encoded
 * "Program data:" log prefix and discriminator-based event matching.
 *
 * Returns decoded events in order of appearance in the log, each tagged
 * with its log_index for idempotent storage.
 */
export function decodeEvents(
  logs: string[],
  idl?: Idl
): Array<{ logIndex: number; event: SolazzoEvent }> {
  const resolvedIdl = idl ?? loadIdl();
  const coder = new BorshCoder(resolvedIdl);
  const parser = new EventParser(PROGRAM_ID, coder);

  const results: Array<{ logIndex: number; event: SolazzoEvent }> = [];
  let logIndex = 0;

  for (const event of parser.parseLogs(logs)) {
    const mapped = mapAnchorEvent(event);
    if (mapped) {
      results.push({ logIndex, event: mapped });
      logIndex++;
    }
  }

  return results;
}

/** Map an Anchor parsed event to our typed event structure. */
function mapAnchorEvent(event: Event): SolazzoEvent | null {
  const d = event.data;

  switch (event.name) {
    case "SlotClaimed":
      return {
        type: "SlotClaimed",
        slotId: d.slotId as number,
        owner: (d.owner as any).toString(),
        lockLamports: BigInt((d.lockLamports as any).toString()),
        ts: (d.ts as any).toNumber ? (d.ts as any).toNumber() : Number(d.ts),
      };

    case "SlotDisplaced":
      return {
        type: "SlotDisplaced",
        slotId: d.slotId as number,
        oldOwner: (d.oldOwner as any).toString(),
        newOwner: (d.newOwner as any).toString(),
        oldLockLamports: BigInt((d.oldLockLamports as any).toString()),
        newLockLamports: BigInt((d.newLockLamports as any).toString()),
        feeLamports: BigInt((d.feeLamports as any).toString()),
        ts: (d.ts as any).toNumber ? (d.ts as any).toNumber() : Number(d.ts),
      };

    case "ClaimCredited":
      return {
        type: "ClaimCredited",
        owner: (d.owner as any).toString(),
        amountLamports: BigInt((d.amountLamports as any).toString()),
        ts: (d.ts as any).toNumber ? (d.ts as any).toNumber() : Number(d.ts),
      };

    case "Claimed":
      return {
        type: "Claimed",
        owner: (d.owner as any).toString(),
        amountLamports: BigInt((d.amountLamports as any).toString()),
        ts: (d.ts as any).toNumber ? (d.ts as any).toNumber() : Number(d.ts),
      };

    case "SettlementWindowStarted":
      return {
        type: "SettlementWindowStarted",
        ts: (d.ts as any).toNumber ? (d.ts as any).toNumber() : Number(d.ts),
      };

    case "SettlementWindowReset":
      return {
        type: "SettlementWindowReset",
        ts: (d.ts as any).toNumber ? (d.ts as any).toNumber() : Number(d.ts),
      };

    case "Settled":
      return {
        type: "Settled",
        ts: (d.ts as any).toNumber ? (d.ts as any).toNumber() : Number(d.ts),
      };

    default:
      return null;
  }
}

/**
 * Serialize a SolazzoEvent to a plain JSON-safe object for storage.
 * Converts bigints to string representation.
 */
export function eventToPayload(event: SolazzoEvent): Record<string, unknown> {
  const result: Record<string, unknown> = { type: event.type };
  for (const [key, value] of Object.entries(event)) {
    if (key === "type") continue;
    result[key] = typeof value === "bigint" ? value.toString() : value;
  }
  return result;
}

/**
 * Deserialize a stored payload back to a SolazzoEvent.
 */
export function payloadToEvent(payload: Record<string, unknown>): SolazzoEvent {
  const type = payload.type as string;
  switch (type) {
    case "SlotClaimed":
      return {
        type: "SlotClaimed",
        slotId: payload.slotId as number,
        owner: payload.owner as string,
        lockLamports: BigInt(payload.lockLamports as string),
        ts: payload.ts as number,
      };
    case "SlotDisplaced":
      return {
        type: "SlotDisplaced",
        slotId: payload.slotId as number,
        oldOwner: payload.oldOwner as string,
        newOwner: payload.newOwner as string,
        oldLockLamports: BigInt(payload.oldLockLamports as string),
        newLockLamports: BigInt(payload.newLockLamports as string),
        feeLamports: BigInt(payload.feeLamports as string),
        ts: payload.ts as number,
      };
    case "ClaimCredited":
      return {
        type: "ClaimCredited",
        owner: payload.owner as string,
        amountLamports: BigInt(payload.amountLamports as string),
        ts: payload.ts as number,
      };
    case "Claimed":
      return {
        type: "Claimed",
        owner: payload.owner as string,
        amountLamports: BigInt(payload.amountLamports as string),
        ts: payload.ts as number,
      };
    case "SettlementWindowStarted":
      return { type: "SettlementWindowStarted", ts: payload.ts as number };
    case "SettlementWindowReset":
      return { type: "SettlementWindowReset", ts: payload.ts as number };
    case "Settled":
      return { type: "Settled", ts: payload.ts as number };
    default:
      throw new Error(`Unknown event type: ${type}`);
  }
}
