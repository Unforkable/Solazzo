import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { publishCollection, type GalleryEntry } from "@/lib/gallery-store";
import { verifyChallengeToken } from "@/lib/publish-auth";
import { testGate } from "@/lib/test-gate";
import { rpcRetry, RpcUnavailableError } from "@/lib/rpc-retry";

const MAX_IMAGE_SIZE = 1024 * 1024; // 1 MB per portrait

// Slot account discriminator from IDL
const SLOT_DISCRIMINATOR = Buffer.from([140, 54, 3, 187, 53, 189, 250, 230]);

// claim_unfilled_slot instruction discriminator from IDL
const CLAIM_UNFILLED_SLOT_DISC = Buffer.from([
  227, 27, 177, 192, 4, 75, 201, 176,
]);

const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_SOLAZZO_PROGRAM_ID ??
    "52xHAYaQW1ywhdhNjxg1LvJvsEHpPBrK1J9Aud371hHC",
);

function getRpcUrl(): string {
  return (
    process.env.SOLANA_RPC_URL ??
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
    "https://api.devnet.solana.com"
  );
}

function deriveSlotPDA(slotId: number): PublicKey {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(slotId);
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("slot"), buf],
    PROGRAM_ID,
  );
  return pda;
}

function parseSlotAccount(data: Buffer): {
  slotId: number;
  owner: PublicKey;
  isOccupied: boolean;
} {
  const disc = data.subarray(0, 8);
  if (!disc.equals(SLOT_DISCRIMINATOR)) {
    throw new Error("Invalid Slot account discriminator");
  }
  return {
    slotId: data.readUInt16LE(8),
    owner: new PublicKey(data.subarray(10, 42)),
    isOccupied: data[58] === 1,
  };
}

function isValidBase58Pubkey(s: string): boolean {
  try {
    new PublicKey(s);
    return true;
  } catch {
    return false;
  }
}

// ── Transaction binding verification ──────────────────────────────────

async function verifyClaimTxBinding(
  connection: Connection,
  claimTxSig: string,
  wallet: string,
  slotId: number,
): Promise<void> {
  // Fetch tx with retry — handles propagation delay (null → retry) and transient
  // RPC issues (timeout/429/network → retry). Uses "confirmed" commitment: client
  // already waited for confirmed before calling publish, and confirmed provides
  // supermajority-of-stake guarantees without finalized's 15-30s extra latency.
  // Throws RpcUnavailableError for persistent transient failures (caller maps to 503).
  const txResp = await rpcRetry(
    () => connection.getTransaction(claimTxSig, { commitment: "confirmed" }),
    { rejectNull: true },
  );

  // Safety guard: rpcRetry with rejectNull guarantees non-null
  if (!txResp) {
    throw new RpcUnavailableError("Transaction not retrievable after retries.");
  }

  if (txResp.meta?.err) {
    throw new Error("Claim transaction failed on-chain.");
  }

  const msg = txResp.transaction.message;
  const accountKeys = msg.accountKeys;

  // 1. Wallet must be a signer
  const walletPubkey = new PublicKey(wallet);
  const walletIdx = accountKeys.findIndex((k) => k.equals(walletPubkey));
  if (walletIdx === -1) {
    throw new Error("Wallet not found in claim transaction accounts.");
  }

  const numSigners = msg.header.numRequiredSignatures;
  if (walletIdx >= numSigners) {
    throw new Error("Wallet is not a signer in the claim transaction.");
  }

  // 2. Transaction must contain an instruction to the Solazzo program
  const programIdx = accountKeys.findIndex((k) => k.equals(PROGRAM_ID));
  if (programIdx === -1) {
    throw new Error("Solazzo program not found in claim transaction.");
  }

  // 3. Collect ALL Solazzo-program instructions in the tx
  const solazzoIxs = msg.instructions.filter(
    (ix) => ix.programIdIndex === programIdx,
  );
  if (solazzoIxs.length === 0) {
    throw new Error(
      "No instruction to Solazzo program in claim transaction.",
    );
  }

  // 4. Slot PDA must be in the account list
  const slotPDA = deriveSlotPDA(slotId);
  const slotPdaIdx = accountKeys.findIndex((k) => k.equals(slotPDA));
  if (slotPdaIdx === -1) {
    throw new Error("Slot PDA not found in claim transaction accounts.");
  }

  // 5. At least one instruction must be claim_unfilled_slot referencing the slot PDA
  const hasValidClaim = solazzoIxs.some((ix) => {
    if (!ix.accounts.includes(slotPdaIdx)) return false;
    const ixData = bs58.decode(ix.data);
    if (ixData.length < 8) return false;
    const disc = Buffer.from(ixData.subarray(0, 8));
    return disc.equals(CLAIM_UNFILLED_SLOT_DISC);
  });

  if (!hasValidClaim) {
    throw new Error(
      "No claim_unfilled_slot instruction found for this slot.",
    );
  }
}

// ── Main handler ──────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const blocked = testGate(request, "POST /api/gallery/publish");
  if (blocked) return blocked;

  try {
    const body = await request.json();
    const {
      portraits,
      traits,
      conviction,
      wallet,
      slotId,
      claimTxSig,
      challengeToken,
      walletSignature,
    } = body;

    // ── Validate portraits ─────────────────────────────────────────

    if (!Array.isArray(portraits) || portraits.length !== 5) {
      return NextResponse.json(
        { error: "Exactly 5 portraits required." },
        { status: 400 },
      );
    }

    const buffers: Buffer[] = [];
    for (const dataUrl of portraits) {
      if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) {
        return NextResponse.json(
          { error: "Invalid image data." },
          { status: 400 },
        );
      }
      const base64 = dataUrl.split(",")[1];
      if (!base64) {
        return NextResponse.json(
          { error: "Invalid data URL." },
          { status: 400 },
        );
      }
      const buf = Buffer.from(base64, "base64");
      if (buf.length > MAX_IMAGE_SIZE) {
        return NextResponse.json(
          { error: "Each portrait must be under 1 MB." },
          { status: 400 },
        );
      }
      buffers.push(buf);
    }

    // ── Validate on-chain ownership fields ─────────────────────────

    if (typeof wallet !== "string" || !isValidBase58Pubkey(wallet)) {
      return NextResponse.json(
        { error: "Valid wallet address required." },
        { status: 400 },
      );
    }

    if (
      typeof slotId !== "number" ||
      !Number.isInteger(slotId) ||
      slotId < 0 ||
      slotId > 999
    ) {
      return NextResponse.json(
        { error: "Valid slot ID (0-999) required." },
        { status: 400 },
      );
    }

    if (typeof claimTxSig !== "string" || claimTxSig.length < 32) {
      return NextResponse.json(
        { error: "Valid claim transaction signature required." },
        { status: 400 },
      );
    }

    // ── Validate auth fields ───────────────────────────────────────

    if (typeof challengeToken !== "string" || !challengeToken.includes(".")) {
      return NextResponse.json(
        { error: "Challenge token required." },
        { status: 400 },
      );
    }

    if (typeof walletSignature !== "string" || walletSignature.length < 32) {
      return NextResponse.json(
        { error: "Wallet signature required." },
        { status: 400 },
      );
    }

    // ── Verify challenge token (HMAC, expiry, nonce, field match) ──

    let challengeMessage: string;
    try {
      const result = verifyChallengeToken(
        challengeToken,
        wallet,
        slotId,
        claimTxSig,
      );
      challengeMessage = result.challengeMessage;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Challenge verification failed.";
      if (msg.includes("PUBLISH_CHALLENGE_SECRET")) {
        return NextResponse.json({ error: msg }, { status: 500 });
      }
      return NextResponse.json({ error: msg }, { status: 403 });
    }

    // ── Verify Ed25519 wallet signature ────────────────────────────

    try {
      const messageBytes = new TextEncoder().encode(challengeMessage);
      const sigBytes = bs58.decode(walletSignature);
      const pubkeyBytes = new PublicKey(wallet).toBytes();

      if (sigBytes.length !== 64) {
        return NextResponse.json(
          { error: "Invalid signature length." },
          { status: 403 },
        );
      }

      const valid = nacl.sign.detached.verify(
        messageBytes,
        sigBytes,
        pubkeyBytes,
      );

      if (!valid) {
        return NextResponse.json(
          { error: "Wallet signature verification failed." },
          { status: 403 },
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Wallet signature verification failed." },
        { status: 403 },
      );
    }

    // ── Verify claim tx binding ────────────────────────────────────

    const connection = new Connection(getRpcUrl(), "confirmed");

    try {
      await verifyClaimTxBinding(connection, claimTxSig, wallet, slotId);
    } catch (err) {
      if (err instanceof RpcUnavailableError) {
        return NextResponse.json(
          { error: "Claim transaction verification temporarily unavailable. Please retry.", retryable: true },
          { status: 503 },
        );
      }
      const msg = err instanceof Error ? err.message : "Transaction binding verification failed.";
      return NextResponse.json({ error: msg }, { status: 403 });
    }

    // ── Verify slot ownership on-chain ─────────────────────────────

    const slotPDA = deriveSlotPDA(slotId);
    let accountInfo;
    try {
      accountInfo = await rpcRetry(
        () => connection.getAccountInfo(slotPDA),
      );
    } catch (err) {
      if (err instanceof RpcUnavailableError) {
        return NextResponse.json(
          { error: "Slot verification temporarily unavailable. Please retry.", retryable: true },
          { status: 503 },
        );
      }
      console.error("Unexpected slot verification error:", err);
      return NextResponse.json(
        { error: "Failed to verify slot ownership." },
        { status: 500 },
      );
    }

    if (!accountInfo) {
      return NextResponse.json(
        { error: "Slot not found on-chain. Claim may not be confirmed yet." },
        { status: 403 },
      );
    }

    const slotData = parseSlotAccount(Buffer.from(accountInfo.data));

    if (!slotData.isOccupied) {
      return NextResponse.json(
        { error: "Slot is not occupied on-chain." },
        { status: 403 },
      );
    }

    if (slotData.slotId !== slotId) {
      return NextResponse.json(
        { error: "Slot ID mismatch." },
        { status: 403 },
      );
    }

    if (slotData.owner.toBase58() !== wallet) {
      return NextResponse.json(
        { error: "Wallet does not own this slot." },
        { status: 403 },
      );
    }

    // ── Clean traits (strip prompts/fragments) ─────────────────────

    let cleanTraits: GalleryEntry["traits"];
    if (Array.isArray(traits) && traits.length === 5) {
      cleanTraits = traits.map(
        (t: { stage?: number; rolls?: Record<string, unknown> }, i: number) => ({
          stage: t.stage ?? i + 1,
          rolls: Object.fromEntries(
            Object.entries(t.rolls ?? {}).map(([cat, r]) => {
              const roll = r as Record<string, unknown>;
              return [
                cat,
                {
                  category: cat,
                  itemName: String(roll.itemName ?? ""),
                  rarity: String(roll.rarity ?? "Common"),
                  isNothing: Boolean(roll.isNothing),
                },
              ];
            }),
          ),
        }),
      );
    }

    const safeConviction =
      typeof conviction === "number" && conviction > 0 ? conviction : undefined;

    const entry = await publishCollection(
      buffers,
      cleanTraits,
      safeConviction,
      wallet,
      slotId,
      claimTxSig,
    );

    return NextResponse.json({ id: entry.id });
  } catch (error) {
    if (error instanceof RpcUnavailableError) {
      return NextResponse.json(
        { error: "Verification temporarily unavailable. Please retry.", retryable: true },
        { status: 503 },
      );
    }
    console.error("Gallery publish error:", error);
    return NextResponse.json(
      { error: "Failed to publish." },
      { status: 500 },
    );
  }
}
