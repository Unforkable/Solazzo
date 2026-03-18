import { NextRequest, NextResponse } from "next/server";
import { verifyNotifyToken } from "@/lib/notify-token";
import { unsubscribeByEmail } from "@/lib/notify-store";

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

    const result = verifyNotifyToken(token, "unsubscribe");
    if (!result) {
      return NextResponse.json(
        { error: "Invalid or expired unsubscribe link." },
        { status: 403 },
      );
    }

    await unsubscribeByEmail(result.email);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("unsubscribe error:", error);
    return NextResponse.json(
      { error: "Failed to process unsubscribe request." },
      { status: 500 },
    );
  }
}
