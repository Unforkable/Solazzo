import { NextRequest, NextResponse } from "next/server";
import { runDispatch } from "@/lib/notify-dispatch";

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const dispatchSecret = process.env.NOTIFY_DISPATCH_SECRET;

  if (!cronSecret && !dispatchSecret) {
    return NextResponse.json(
      { error: "Neither CRON_SECRET nor NOTIFY_DISPATCH_SECRET is configured" },
      { status: 500 },
    );
  }

  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;

  const valid =
    token !== null &&
    ((cronSecret && token === cronSecret) ||
      (dispatchSecret && token === dispatchSecret));

  if (!valid) {
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
