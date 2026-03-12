import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { createChallengeToken } from "@/lib/publish-auth";
import { testGate } from "@/lib/test-gate";

function isValidBase58Pubkey(s: string): boolean {
  try {
    new PublicKey(s);
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const blocked = testGate(request, "POST /api/gallery/publish/challenge");
  if (blocked) return blocked;

  try {
    const body = await request.json();
    const { wallet, slotId, claimTxSig } = body;

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

    const { challengeMessage, challengeToken } = createChallengeToken(
      wallet,
      slotId,
      claimTxSig,
    );

    return NextResponse.json({ challengeMessage, challengeToken });
  } catch (error) {
    console.error("Challenge creation error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create challenge.";
    // Surface missing secret as 500 so operators see it
    if (message.includes("PUBLISH_CHALLENGE_SECRET")) {
      return NextResponse.json({ error: message }, { status: 500 });
    }
    return NextResponse.json(
      { error: "Failed to create challenge." },
      { status: 500 },
    );
  }
}
