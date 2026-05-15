import {
  Connection,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import { PROGRAM_ID } from "./constants";
import {
  getProtocolConfigPDA,
  getVaultPDA,
  getSlotBookPDA,
  getSlotPDA,
  getClaimableBalancePDA,
} from "./pda";

// ── Discriminators (from IDL) ─────────────────────────────────────────

const CLAIM_UNFILLED_SLOT_DISC = Buffer.from([
  227, 27, 177, 192, 4, 75, 201, 176,
]);
const INIT_CLAIMABLE_BALANCE_DISC = Buffer.from([
  205, 181, 126, 228, 221, 72, 186, 215,
]);
const SLOT_DISCRIMINATOR = Buffer.from([
  140, 54, 3, 187, 53, 189, 250, 230,
]);
const DISPLACE_LOWEST_DISC = Buffer.from([
  50, 157, 36, 45, 137, 137, 102, 0,
]);
const CLAIM_DISC = Buffer.from([
  62, 198, 214, 193, 213, 159, 108, 210,
]);
const PROTOCOL_CONFIG_DISCRIMINATOR = Buffer.from([
  207, 91, 250, 28, 152, 179, 215, 209,
]);
const SLOT_BOOK_DISCRIMINATOR = Buffer.from([
  174, 179, 156, 123, 56, 7, 117, 186,
]);
const CLAIMABLE_BALANCE_DISCRIMINATOR = Buffer.from([
  211, 2, 251, 123, 91, 61, 146, 116,
]);

/**
 * Exported discriminator map for test-time integrity verification.
 * Keys use the Anchor hash prefix: "account:<Name>" or "global:<name>".
 */
export const DISCRIMINATORS: Record<string, Buffer> = {
  "account:ProtocolConfig": PROTOCOL_CONFIG_DISCRIMINATOR,
  "account:Slot": SLOT_DISCRIMINATOR,
  "account:SlotBook": SLOT_BOOK_DISCRIMINATOR,
  "account:ClaimableBalance": CLAIMABLE_BALANCE_DISCRIMINATOR,
  "global:claim_unfilled_slot": CLAIM_UNFILLED_SLOT_DISC,
  "global:init_claimable_balance": INIT_CLAIMABLE_BALANCE_DISC,
  "global:displace_lowest": DISPLACE_LOWEST_DISC,
  "global:claim": CLAIM_DISC,
};

/** Hard cap on SlotBook vec lengths to prevent pathological allocations from malformed data. */
const MAX_SLOTBOOK_VEC_LEN = 10_000;

/** Timeout for read-only RPC calls (ms). */
const RPC_READ_TIMEOUT_MS = 10_000;

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  context: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${context}: RPC call timed out after ${ms}ms.`)),
      ms,
    );
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

function assertProgramOwner(
  info: { owner: PublicKey },
  accountType: string,
): void {
  if (!info.owner.equals(PROGRAM_ID)) {
    throw new Error(
      `${accountType}: account not owned by expected program ${PROGRAM_ID.toBase58()} (actual owner: ${info.owner.toBase58()}).`,
    );
  }
}

function ensureByteRange(
  src: Uint8Array,
  offset: number,
  size: number,
  context: string,
): void {
  if (offset < 0 || size < 0 || offset + size > src.byteLength) {
    throw new Error(
      `${context}: account data too short (need ${offset + size} bytes, got ${src.byteLength}).`,
    );
  }
}

function writeU16LE(dst: Uint8Array, offset: number, value: number): void {
  ensureByteRange(dst, offset, 2, "writeU16LE");
  const view = new DataView(dst.buffer, dst.byteOffset, dst.byteLength);
  view.setUint16(offset, value, true);
}

function writeU64LE(dst: Uint8Array, offset: number, value: bigint): void {
  ensureByteRange(dst, offset, 8, "writeU64LE");
  const view = new DataView(dst.buffer, dst.byteOffset, dst.byteLength);
  view.setBigUint64(offset, value, true);
}

function readU16LE(src: Uint8Array, offset: number): number {
  ensureByteRange(src, offset, 2, "readU16LE");
  const view = new DataView(src.buffer, src.byteOffset, src.byteLength);
  return view.getUint16(offset, true);
}

function readU32LE(src: Uint8Array, offset: number): number {
  ensureByteRange(src, offset, 4, "readU32LE");
  const view = new DataView(src.buffer, src.byteOffset, src.byteLength);
  return view.getUint32(offset, true);
}

function readU64LE(src: Uint8Array, offset: number): bigint {
  ensureByteRange(src, offset, 8, "readU64LE");
  const view = new DataView(src.buffer, src.byteOffset, src.byteLength);
  return view.getBigUint64(offset, true);
}

function readI64LE(src: Uint8Array, offset: number): bigint {
  ensureByteRange(src, offset, 8, "readI64LE");
  const view = new DataView(src.buffer, src.byteOffset, src.byteLength);
  return view.getBigInt64(offset, true);
}

// ── Account types ─────────────────────────────────────────────────────

export interface SlotAccount {
  slotId: number;
  owner: PublicKey;
  lockedLamports: bigint;
  lockStartedAt: bigint;
  isOccupied: boolean;
  bump: number;
}

export interface ProtocolConfigAccount {
  adminMultisig: PublicKey;
  treasuryAccount: PublicKey;
  oracleFeedPubkey: PublicKey;
  slotCount: number;
  slotsFilled: number;
  minLockLamports: bigint;
  minIncrementLamports: bigint;
  displacementFeeLamports: bigint;
  isPaused: boolean;
  isSettled: boolean;
  bump: number;
}

export interface SlotBookAccount {
  locks: bigint[];
  occupied: boolean[];
  bump: number;
}

export interface ClaimableBalanceAccount {
  owner: PublicKey;
  claimableLamports: bigint;
  lastUpdatedAt: bigint;
  bump: number;
}

export interface LowestSlotInfo {
  slotId: number;
  lockedLamports: bigint;
  owner: PublicKey | null;
}

// ── Read helpers ──────────────────────────────────────────────────────

/** Check if a slot PDA account exists (slot is occupied). */
export async function isSlotOccupied(
  connection: Connection,
  slotId: number,
): Promise<boolean> {
  const [pda] = getSlotPDA(slotId);
  const info = await withTimeout(
    connection.getAccountInfo(pda),
    RPC_READ_TIMEOUT_MS,
    "isSlotOccupied",
  );
  return info !== null;
}

/** Check if a ClaimableBalance PDA exists for the wallet. */
export async function hasClaimableBalance(
  connection: Connection,
  owner: PublicKey,
): Promise<boolean> {
  const [pda] = getClaimableBalancePDA(owner);
  const info = await withTimeout(
    connection.getAccountInfo(pda),
    RPC_READ_TIMEOUT_MS,
    "hasClaimableBalance",
  );
  return info !== null;
}

/** Deserialize a Slot account from raw on-chain data. */
export function deserializeSlot(data: Buffer | Uint8Array): SlotAccount {
  const buf = Buffer.from(data);
  ensureByteRange(buf, 0, 60, "Slot account");
  const disc = buf.subarray(0, 8);
  if (!disc.equals(SLOT_DISCRIMINATOR)) {
    throw new Error("Invalid Slot account discriminator");
  }
  return {
    slotId: readU16LE(buf, 8),
    owner: new PublicKey(buf.subarray(10, 42)),
    lockedLamports: readU64LE(buf, 42),
    lockStartedAt: readI64LE(buf, 50),
    isOccupied: buf[58] === 1,
    bump: buf[59],
  };
}

/** Deserialize a ProtocolConfig account. */
export function deserializeProtocolConfig(
  data: Buffer | Uint8Array,
): ProtocolConfigAccount {
  const buf = Buffer.from(data);
  ensureByteRange(buf, 0, 169, "ProtocolConfig account");
  const disc = buf.subarray(0, 8);
  if (!disc.equals(PROTOCOL_CONFIG_DISCRIMINATOR)) {
    throw new Error("Invalid ProtocolConfig account discriminator");
  }
  // Layout after 8-byte discriminator:
  // admin_multisig: 32, treasury_account: 32, oracle_feed_pubkey: 32
  // slot_count: u16, slots_filled: u16
  // min_lock_lamports: u64, min_increment_lamports: u64, displacement_fee_lamports: u64
  // is_paused: bool, is_settled: bool
  // oracle_max_staleness_sec: u32, oracle_max_conf_bps: u16
  // settle_threshold_price_e8: i64, settle_window_sec: u32, first_valid_settle_ts: i64
  // settle_deadline_ts: i64
  // bump: u8
  let offset = 8;
  const adminMultisig = new PublicKey(buf.subarray(offset, offset + 32));
  offset += 32;
  const treasuryAccount = new PublicKey(buf.subarray(offset, offset + 32));
  offset += 32;
  const oracleFeedPubkey = new PublicKey(buf.subarray(offset, offset + 32));
  offset += 32;
  const slotCount = readU16LE(buf, offset);
  offset += 2;
  const slotsFilled = readU16LE(buf, offset);
  offset += 2;
  const minLockLamports = readU64LE(buf, offset);
  offset += 8;
  const minIncrementLamports = readU64LE(buf, offset);
  offset += 8;
  const displacementFeeLamports = readU64LE(buf, offset);
  offset += 8;
  const isPaused = buf[offset] === 1;
  offset += 1;
  const isSettled = buf[offset] === 1;
  offset += 1;
  // skip oracle_max_staleness_sec (4) + oracle_max_conf_bps (2) +
  // settle_threshold_price_e8 (8) + settle_window_sec (4) + first_valid_settle_ts (8) +
  // settle_deadline_ts (8)
  offset += 4 + 2 + 8 + 4 + 8 + 8;
  const bump = buf[offset];

  return {
    adminMultisig,
    treasuryAccount,
    oracleFeedPubkey,
    slotCount,
    slotsFilled,
    minLockLamports,
    minIncrementLamports,
    displacementFeeLamports,
    isPaused,
    isSettled,
    bump,
  };
}

/** Deserialize a SlotBook account. */
export function deserializeSlotBook(
  data: Buffer | Uint8Array,
): SlotBookAccount {
  const buf = Buffer.from(data);
  ensureByteRange(buf, 0, 13, "SlotBook account");
  const disc = buf.subarray(0, 8);
  if (!disc.equals(SLOT_BOOK_DISCRIMINATOR)) {
    throw new Error("Invalid SlotBook account discriminator");
  }
  let offset = 8;

  // locks: Vec<u64> — 4-byte length prefix + N * 8 bytes
  const locksLen = readU32LE(buf, offset);
  offset += 4;
  if (locksLen > MAX_SLOTBOOK_VEC_LEN) {
    throw new Error(
      `SlotBook locks length ${locksLen} exceeds maximum allowed (${MAX_SLOTBOOK_VEC_LEN}).`,
    );
  }
  const availableForLocks = buf.byteLength - offset;
  if (locksLen > Math.floor(availableForLocks / 8)) {
    throw new Error(
      `Invalid SlotBook locks length ${locksLen}: only ${availableForLocks} bytes available for lock data.`,
    );
  }
  const locks: bigint[] = [];
  for (let i = 0; i < locksLen; i++) {
    locks.push(readU64LE(buf, offset));
    offset += 8;
  }

  // occupied: Vec<u8> — 4-byte length prefix + N * 1 byte
  const occupiedLen = readU32LE(buf, offset);
  offset += 4;
  if (occupiedLen > MAX_SLOTBOOK_VEC_LEN) {
    throw new Error(
      `SlotBook occupied length ${occupiedLen} exceeds maximum allowed (${MAX_SLOTBOOK_VEC_LEN}).`,
    );
  }
  const availableForOccupied = buf.byteLength - offset;
  if (occupiedLen > availableForOccupied - 1) {
    throw new Error(
      `Invalid SlotBook occupied length ${occupiedLen}: only ${availableForOccupied} bytes available for occupied data and bump.`,
    );
  }
  const occupied: boolean[] = [];
  for (let i = 0; i < occupiedLen; i++) {
    occupied.push(buf[offset] === 1);
    offset += 1;
  }

  if (locksLen !== occupiedLen) {
    throw new Error(
      `Malformed SlotBook: locks length (${locksLen}) does not match occupied length (${occupiedLen}).`,
    );
  }

  ensureByteRange(buf, offset, 1, "SlotBook bump");
  const bump = buf[offset];

  return { locks, occupied, bump };
}

/** Deserialize a ClaimableBalance account. */
export function deserializeClaimableBalance(
  data: Buffer | Uint8Array,
): ClaimableBalanceAccount {
  const buf = Buffer.from(data);
  ensureByteRange(buf, 0, 57, "ClaimableBalance account");
  const disc = buf.subarray(0, 8);
  if (!disc.equals(CLAIMABLE_BALANCE_DISCRIMINATOR)) {
    throw new Error("Invalid ClaimableBalance account discriminator");
  }
  return {
    owner: new PublicKey(buf.subarray(8, 40)),
    claimableLamports: readU64LE(buf, 40),
    lastUpdatedAt: readI64LE(buf, 48),
    bump: buf[56],
  };
}

/** Fetch and deserialize ProtocolConfig. */
export async function fetchProtocolConfig(
  connection: Connection,
): Promise<ProtocolConfigAccount> {
  const [pda] = getProtocolConfigPDA();
  const info = await withTimeout(
    connection.getAccountInfo(pda),
    RPC_READ_TIMEOUT_MS,
    "fetchProtocolConfig",
  );
  if (!info) throw new Error("ProtocolConfig account not found on-chain.");
  assertProgramOwner(info, "ProtocolConfig");
  return deserializeProtocolConfig(info.data);
}

/** Fetch and deserialize SlotBook. */
export async function fetchSlotBook(
  connection: Connection,
): Promise<SlotBookAccount> {
  const [pda] = getSlotBookPDA();
  const info = await withTimeout(
    connection.getAccountInfo(pda),
    RPC_READ_TIMEOUT_MS,
    "fetchSlotBook",
  );
  if (!info) throw new Error("SlotBook account not found on-chain.");
  assertProgramOwner(info, "SlotBook");
  return deserializeSlotBook(info.data);
}

/** Fetch and deserialize ClaimableBalance for a wallet. Returns null if PDA doesn't exist. */
export async function fetchClaimableBalance(
  connection: Connection,
  owner: PublicKey,
): Promise<ClaimableBalanceAccount | null> {
  const [pda] = getClaimableBalancePDA(owner);
  const info = await withTimeout(
    connection.getAccountInfo(pda),
    RPC_READ_TIMEOUT_MS,
    "fetchClaimableBalance",
  );
  if (!info) return null;
  assertProgramOwner(info, "ClaimableBalance");
  return deserializeClaimableBalance(info.data);
}

/**
 * Compute the lowest-locked slot from SlotBook data.
 * Tie-break: smallest slot_id wins (matches on-chain logic).
 * Returns null if no occupied slots.
 */
export function computeLowestSlot(
  slotBook: SlotBookAccount,
): LowestSlotInfo | null {
  if (slotBook.locks.length !== slotBook.occupied.length) {
    throw new Error(
      `Invalid SlotBook state: locks length (${slotBook.locks.length}) does not match occupied length (${slotBook.occupied.length}).`,
    );
  }

  let lowestIdx = -1;
  let lowestLock = BigInt(0);

  for (let i = 0; i < slotBook.occupied.length; i++) {
    if (!slotBook.occupied[i]) continue;
    const lock = slotBook.locks[i];
    if (lowestIdx === -1 || lock < lowestLock) {
      lowestIdx = i;
      lowestLock = lock;
    }
    // tie-break: lower slot_id wins (i < lowestIdx guaranteed by iteration order)
  }

  if (lowestIdx === -1) return null;

  return {
    slotId: lowestIdx,
    lockedLamports: lowestLock,
    owner: null, // caller must fetch Slot PDA to get owner
  };
}

/**
 * Fetch the full lowest-slot info including the owner pubkey.
 */
export async function fetchLowestSlotInfo(
  connection: Connection,
): Promise<(LowestSlotInfo & { owner: PublicKey }) | null> {
  const slotBook = await fetchSlotBook(connection);
  const lowest = computeLowestSlot(slotBook);
  if (!lowest) return null;

  const [slotPda] = getSlotPDA(lowest.slotId);
  const slotInfo = await withTimeout(
    connection.getAccountInfo(slotPda),
    RPC_READ_TIMEOUT_MS,
    "fetchLowestSlotInfo",
  );
  if (!slotInfo) return null;
  assertProgramOwner(slotInfo, "Slot");

  const slotData = deserializeSlot(slotInfo.data);
  return {
    ...lowest,
    owner: slotData.owner,
  };
}

// ── Validation helpers ───────────────────────────────────────────────

export interface DisplacementValidation {
  valid: boolean;
  error?: string;
  minRequired?: bigint;
}

/**
 * Validate displacement inputs against on-chain state.
 * All lamport math uses bigint.
 */
export function validateDisplacementInputs(
  config: ProtocolConfigAccount,
  slotBook: SlotBookAccount,
  challengerWallet: PublicKey,
  lowestOwner: PublicKey,
  newLockLamports: bigint,
): DisplacementValidation {
  if (config.isSettled) {
    return { valid: false, error: "Protocol has settled. Displacement is no longer possible." };
  }

  if (config.isPaused) {
    return { valid: false, error: "Protocol is paused. Try again later." };
  }

  // All slots must be filled before displacement is allowed
  if (config.slotsFilled < config.slotCount) {
    return {
      valid: false,
      error: `Only ${config.slotsFilled}/${config.slotCount} slots filled. Claim an empty slot instead.`,
    };
  }

  // No self-displacement
  if (challengerWallet.equals(lowestOwner)) {
    return { valid: false, error: "You cannot displace yourself." };
  }

  // Must meet minimum lock
  if (newLockLamports < config.minLockLamports) {
    return {
      valid: false,
      error: `Lock must be at least ${config.minLockLamports} lamports.`,
      minRequired: config.minLockLamports,
    };
  }

  // Must exceed lowest by min_increment
  const lowest = computeLowestSlot(slotBook);
  if (!lowest) {
    return { valid: false, error: "No occupied slots found." };
  }

  const minRequired = lowest.lockedLamports + config.minIncrementLamports;
  if (newLockLamports < minRequired) {
    return {
      valid: false,
      error: `Lock must be at least ${minRequired} lamports (current lowest + increment).`,
      minRequired,
    };
  }

  return { valid: true };
}

// ── Wallet positions ─────────────────────────────────────────────────

export interface WalletPosition {
  slotId: number;
  lockedLamports: bigint;
  lockStartedAt: bigint;
}

/**
 * Fetch all slot positions owned by a given wallet.
 * Strategy: read SlotBook to find occupied indices, batch-fetch their
 * Slot PDAs via getMultipleAccountsInfo, filter by owner.
 */
export async function fetchWalletPositions(
  connection: Connection,
  wallet: PublicKey,
): Promise<WalletPosition[]> {
  const slotBook = await fetchSlotBook(connection);

  const occupiedIndices: number[] = [];
  for (let i = 0; i < slotBook.occupied.length; i++) {
    if (slotBook.occupied[i]) occupiedIndices.push(i);
  }

  if (occupiedIndices.length === 0) return [];

  // Derive PDAs for all occupied slots
  const pdas = occupiedIndices.map((id) => getSlotPDA(id)[0]);

  // Batch fetch (getMultipleAccountsInfo max 100 per call)
  const BATCH = 100;
  const positions: WalletPosition[] = [];

  for (let i = 0; i < pdas.length; i += BATCH) {
    const batch = pdas.slice(i, i + BATCH);
    const accounts = await withTimeout(
      connection.getMultipleAccountsInfo(batch),
      RPC_READ_TIMEOUT_MS,
      "fetchWalletPositions",
    );
    for (let j = 0; j < accounts.length; j++) {
      const acct = accounts[j];
      if (!acct) continue;
      assertProgramOwner(acct, "Slot");
      const slot = deserializeSlot(acct.data);
      if (slot.isOccupied && slot.owner.equals(wallet)) {
        positions.push({
          slotId: slot.slotId,
          lockedLamports: slot.lockedLamports,
          lockStartedAt: slot.lockStartedAt,
        });
      }
    }
  }

  return positions.sort((a, b) => a.slotId - b.slotId);
}

/**
 * Count distinct slot owners on-chain (the "unique holders" KPI).
 *
 * On-chain truth, not inferred from slot count: reads SlotBook for occupied
 * indices, batch-fetches their Slot PDAs, and dedupes owners into a Set.
 * Same strategy as fetchWalletPositions. Throws on RPC/deserialize failure
 * so callers can render a graceful fallback.
 */
export async function fetchUniqueHolderCount(
  connection: Connection,
): Promise<number> {
  const slotBook = await fetchSlotBook(connection);

  const occupiedIndices: number[] = [];
  for (let i = 0; i < slotBook.occupied.length; i++) {
    if (slotBook.occupied[i]) occupiedIndices.push(i);
  }
  if (occupiedIndices.length === 0) return 0;

  const pdas = occupiedIndices.map((id) => getSlotPDA(id)[0]);
  const BATCH = 100;
  const owners = new Set<string>();

  for (let i = 0; i < pdas.length; i += BATCH) {
    const batch = pdas.slice(i, i + BATCH);
    const accounts = await withTimeout(
      connection.getMultipleAccountsInfo(batch),
      RPC_READ_TIMEOUT_MS,
      "fetchUniqueHolderCount",
    );
    for (const acct of accounts) {
      if (!acct) continue;
      assertProgramOwner(acct, "Slot");
      const slot = deserializeSlot(acct.data);
      if (slot.isOccupied) owners.add(slot.owner.toBase58());
    }
  }

  return owners.size;
}

// ── Instruction input guards ─────────────────────────────────────────

function assertU16(name: string, value: number): void {
  if (!Number.isInteger(value) || value < 0 || value > 0xFFFF) {
    throw new Error(
      `${name}: expected integer in 0..65535, got ${value}.`,
    );
  }
}

function assertNonNegativeLamports(name: string, value: bigint): void {
  if (value < BigInt(0)) {
    throw new Error(
      `${name}: expected non-negative lamports, got ${value}.`,
    );
  }
}

// ── Instruction builders ──────────────────────────────────────────────

/** Build init_claimable_balance instruction. */
export function buildInitClaimableBalanceIx(
  payer: PublicKey,
  owner: PublicKey,
): TransactionInstruction {
  const [claimableBalance] = getClaimableBalancePDA(owner);
  return new TransactionInstruction({
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: claimableBalance, isSigner: false, isWritable: true },
      {
        pubkey: SystemProgram.programId,
        isSigner: false,
        isWritable: false,
      },
    ],
    programId: PROGRAM_ID,
    data: INIT_CLAIMABLE_BALANCE_DISC,
  });
}

/** Build claim_unfilled_slot instruction. */
export function buildClaimUnfilledSlotIx(
  claimer: PublicKey,
  slotId: number,
  lockLamports: bigint,
): TransactionInstruction {
  assertU16("slotId", slotId);
  assertNonNegativeLamports("lockLamports", lockLamports);
  const [protocolConfig] = getProtocolConfigPDA();
  const [vault] = getVaultPDA();
  const [slotBook] = getSlotBookPDA();
  const [slot] = getSlotPDA(slotId);

  // discriminator (8) + slot_id u16 LE (2) + lock_lamports u64 LE (8)
  const data = new Uint8Array(18);
  data.set(CLAIM_UNFILLED_SLOT_DISC, 0);
  writeU16LE(data, 8, slotId);
  writeU64LE(data, 10, lockLamports);

  return new TransactionInstruction({
    keys: [
      { pubkey: claimer, isSigner: true, isWritable: true },
      { pubkey: protocolConfig, isSigner: false, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: slotBook, isSigner: false, isWritable: true },
      { pubkey: slot, isSigner: false, isWritable: true },
      {
        pubkey: SystemProgram.programId,
        isSigner: false,
        isWritable: false,
      },
    ],
    programId: PROGRAM_ID,
    data: Buffer.from(data),
  });
}

/**
 * Build displace_lowest instruction.
 *
 * Accounts (per IDL):
 *   challenger (signer, writable)
 *   protocol_config
 *   slot_book (writable)
 *   vault (writable)
 *   slot (writable) — the expected lowest slot PDA
 *   treasury (writable) — from protocol_config.treasury_account
 *   claimable_balance (writable) — PDA of the displaced owner
 *   system_program
 */
export function buildDisplaceLowestIx(
  challenger: PublicKey,
  expectedSlotId: number,
  expectedLowestLamports: bigint,
  newLockLamports: bigint,
  treasuryPubkey: PublicKey,
  displacedOwnerPubkey: PublicKey,
): TransactionInstruction {
  assertU16("expectedSlotId", expectedSlotId);
  assertNonNegativeLamports("expectedLowestLamports", expectedLowestLamports);
  assertNonNegativeLamports("newLockLamports", newLockLamports);
  const [protocolConfig] = getProtocolConfigPDA();
  const [slotBook] = getSlotBookPDA();
  const [vault] = getVaultPDA();
  const [slot] = getSlotPDA(expectedSlotId);
  const [claimableBalance] = getClaimableBalancePDA(displacedOwnerPubkey);

  // discriminator (8) + expected_slot_id u16 LE (2) +
  // expected_lowest_lamports u64 LE (8) + new_lock_lamports u64 LE (8) = 26
  const data = new Uint8Array(26);
  data.set(DISPLACE_LOWEST_DISC, 0);
  writeU16LE(data, 8, expectedSlotId);
  writeU64LE(data, 10, expectedLowestLamports);
  writeU64LE(data, 18, newLockLamports);

  return new TransactionInstruction({
    keys: [
      { pubkey: challenger, isSigner: true, isWritable: true },
      { pubkey: protocolConfig, isSigner: false, isWritable: false },
      { pubkey: slotBook, isSigner: false, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: slot, isSigner: false, isWritable: true },
      { pubkey: treasuryPubkey, isSigner: false, isWritable: true },
      { pubkey: claimableBalance, isSigner: false, isWritable: true },
      {
        pubkey: SystemProgram.programId,
        isSigner: false,
        isWritable: false,
      },
    ],
    programId: PROGRAM_ID,
    data: Buffer.from(data),
  });
}

/** Build claim() instruction — withdraw claimable balance. */
export function buildClaimWithdrawIx(
  owner: PublicKey,
): TransactionInstruction {
  const [vault] = getVaultPDA();
  const [claimableBalance] = getClaimableBalancePDA(owner);

  return new TransactionInstruction({
    keys: [
      { pubkey: owner, isSigner: true, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: claimableBalance, isSigner: false, isWritable: true },
    ],
    programId: PROGRAM_ID,
    data: CLAIM_DISC,
  });
}

/**
 * Build all instructions needed to claim a slot.
 * Includes init_claimable_balance when the wallet has no CB account yet.
 */
export function buildClaimInstructions(
  claimer: PublicKey,
  slotId: number,
  lockLamports: bigint,
  includeInitClaimableBalance: boolean,
): TransactionInstruction[] {
  assertU16("slotId", slotId);
  assertNonNegativeLamports("lockLamports", lockLamports);
  const instructions: TransactionInstruction[] = [];

  if (includeInitClaimableBalance) {
    instructions.push(buildInitClaimableBalanceIx(claimer, claimer));
  }

  instructions.push(
    buildClaimUnfilledSlotIx(claimer, slotId, lockLamports),
  );

  return instructions;
}
