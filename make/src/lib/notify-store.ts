import { put, list } from "@vercel/blob";
import { createHash } from "crypto";

export interface NotifySubscriber {
  email: string;
  wallet?: string;
  notifyLaunch: boolean;
  notifyReplaced: boolean;
  notifyClaimable: boolean;
  createdAt: number;
  updatedAt: number;
  source: "web";
}

function keyForEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  return createHash("sha256").update(normalized).digest("hex").slice(0, 24);
}

export async function upsertNotifySubscriber(
  subscriber: Omit<NotifySubscriber, "createdAt" | "updatedAt" | "source">,
): Promise<{ key: string; updatedAt: number }> {
  const now = Date.now();
  const key = keyForEmail(subscriber.email);

  const payload: NotifySubscriber = {
    ...subscriber,
    source: "web",
    createdAt: now,
    updatedAt: now,
  };

  await put(`notify-subscribers/${key}.json`, JSON.stringify(payload), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  return { key, updatedAt: now };
}

export async function listNotifySubscribers(): Promise<NotifySubscriber[]> {
  const { blobs } = await list({ prefix: "notify-subscribers/" });

  const results = await Promise.allSettled(
    blobs
      .filter((b) => b.pathname.endsWith(".json"))
      .map(async (blob) => {
        const res = await fetch(blob.downloadUrl);
        if (!res.ok) throw new Error(`Failed to fetch ${blob.pathname}`);
        return (await res.json()) as NotifySubscriber;
      }),
  );

  return results
    .filter(
      (r): r is PromiseFulfilledResult<NotifySubscriber> =>
        r.status === "fulfilled",
    )
    .map((r) => r.value);
}
