import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { checkRateLimit, getClientIp, NOTIFY_LIMIT } from "@/lib/rate-limit";
import { upsertNotifySubscriber } from "@/lib/notify-store";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidWallet(wallet: string): boolean {
  try {
    new PublicKey(wallet);
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(ip, NOTIFY_LIMIT);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many signup attempts. Please try again later." },
      { status: 429 },
    );
  }

  try {
    const body = await request.json();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const walletRaw = String(body?.wallet ?? "").trim();
    const notifyLaunch = Boolean(body?.notifyLaunch);
    const notifyReplaced = Boolean(body?.notifyReplaced);
    const notifyClaimable = Boolean(body?.notifyClaimable);

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "Please provide a valid email address." },
        { status: 400 },
      );
    }

    const wallet = walletRaw.length > 0 ? walletRaw : undefined;
    if (wallet && !isValidWallet(wallet)) {
      return NextResponse.json(
        { error: "Wallet address is invalid." },
        { status: 400 },
      );
    }

    if (!notifyLaunch && !notifyReplaced && !notifyClaimable) {
      return NextResponse.json(
        { error: "Select at least one notification type." },
        { status: 400 },
      );
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

    await upsertNotifySubscriber({
      email,
      wallet,
      notifyLaunch,
      notifyReplaced,
      notifyClaimable,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("notify subscribe error:", error);
    return NextResponse.json(
      { error: "Failed to save your notification preferences." },
      { status: 500 },
    );
  }
}
