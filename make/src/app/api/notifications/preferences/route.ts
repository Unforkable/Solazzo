import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { verifyNotifyToken } from "@/lib/notify-token";
import { updateNotifyPreferencesByEmail } from "@/lib/notify-store";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = String(body?.token ?? "");

    if (!token) {
      return NextResponse.json(
        { error: "Missing token." },
        { status: 400 },
      );
    }

    const result = verifyNotifyToken(token, "preferences");
    if (!result) {
      return NextResponse.json(
        { error: "Invalid or expired preferences link." },
        { status: 403 },
      );
    }

    const notifyLaunch = Boolean(body?.notifyLaunch);
    const notifyReplaced = Boolean(body?.notifyReplaced);
    const notifyClaimable = Boolean(body?.notifyClaimable);
    const walletRaw = String(body?.wallet ?? "").trim();
    const wallet = walletRaw.length > 0 ? walletRaw : undefined;

    if (wallet) {
      try {
        new PublicKey(wallet);
      } catch {
        return NextResponse.json(
          { error: "Wallet address is invalid." },
          { status: 400 },
        );
      }
    }

    if ((notifyReplaced || notifyClaimable) && !wallet) {
      return NextResponse.json(
        {
          error:
            "Wallet is required for slot replacement or claimable notifications.",
        },
        { status: 400 },
      );
    }

    await updateNotifyPreferencesByEmail(result.email, {
      notifyLaunch,
      notifyReplaced,
      notifyClaimable,
      wallet,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("preferences update error:", error);
    return NextResponse.json(
      { error: "Failed to update notification preferences." },
      { status: 500 },
    );
  }
}
