import { NextRequest, NextResponse } from "next/server";
import { runDispatch } from "@/lib/notify-dispatch";

export async function POST(req: NextRequest) {
  const secret = process.env.NOTIFY_DISPATCH_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "NOTIFY_DISPATCH_SECRET is not configured" },
      { status: 500 },
    );
  }

  const auth = req.headers.get("authorization");
  if (!auth || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await runDispatch();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      {
        error: "dispatch failed",
        message: err instanceof Error ? err.message : "unknown",
      },
      { status: 500 },
    );
  }
}
