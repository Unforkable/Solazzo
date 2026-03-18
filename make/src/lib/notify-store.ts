import { put, list } from "@vercel/blob";
import { createHash } from "crypto";
import { notifyPutOptions, notifyListOptions, notifyReadHeaders } from "./notify-blob";

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
  const prefix = `notify-subscribers/${key}`;

  // Preserve createdAt from existing record
  let createdAt = now;
  try {
    const { blobs } = await list({ prefix, ...notifyListOptions() });
    const existing = blobs.filter((b) => b.pathname.endsWith(".json"));
    if (existing.length > 0) {
      const results = await Promise.allSettled(
        existing.map(async (blob) => {
          const res = await fetch(blob.downloadUrl ?? blob.url, {
            headers: notifyReadHeaders(),
          });
          if (!res.ok) throw new Error(`Failed to fetch ${blob.pathname}`);
          return (await res.json()) as NotifySubscriber;
        }),
      );
      const latest = results
        .filter(
          (r): r is PromiseFulfilledResult<NotifySubscriber> =>
            r.status === "fulfilled",
        )
        .map((r) => r.value)
        .sort((a, b) => b.updatedAt - a.updatedAt)[0];
      if (latest?.createdAt) {
        createdAt = latest.createdAt;
      }
    }
  } catch {
    // First subscription or blob read failed — use now
  }

  const payload: NotifySubscriber = {
    ...subscriber,
    source: "web",
    createdAt,
    updatedAt: now,
  };

  // Write immutable subscriber snapshots to avoid overwrite mode issues.
  await put(`${prefix}-${now}.json`, JSON.stringify(payload), {
    ...notifyPutOptions(),
  });

  return { key, updatedAt: now };
}

export async function listNotifySubscribers(): Promise<NotifySubscriber[]> {
  const { blobs } = await list({ prefix: "notify-subscribers/", ...notifyListOptions() });

  const results = await Promise.allSettled(
    blobs
      .filter((b) => b.pathname.endsWith(".json"))
      .map(async (blob) => {
        const res = await fetch(blob.downloadUrl ?? blob.url, {
          headers: notifyReadHeaders(),
        });
        if (!res.ok) throw new Error(`Failed to fetch ${blob.pathname}`);
        return (await res.json()) as NotifySubscriber;
      }),
  );

  const subscribers = results
    .filter(
      (r): r is PromiseFulfilledResult<NotifySubscriber> =>
        r.status === "fulfilled",
    )
    .map((r) => r.value);

  // Keep only latest preference state per normalized email.
  const latestByEmail = new Map<string, NotifySubscriber>();
  for (const sub of subscribers) {
    const emailKey = sub.email.trim().toLowerCase();
    const existing = latestByEmail.get(emailKey);
    if (!existing || sub.updatedAt > existing.updatedAt) {
      latestByEmail.set(emailKey, sub);
    }
  }

  return Array.from(latestByEmail.values());
}

export async function getNotifySubscriberByEmail(
  email: string,
): Promise<NotifySubscriber | null> {
  const key = keyForEmail(email);
  const prefix = `notify-subscribers/${key}`;

  const { blobs } = await list({ prefix, ...notifyListOptions() });
  const jsonBlobs = blobs.filter((b) => b.pathname.endsWith(".json"));
  if (jsonBlobs.length === 0) return null;

  const results = await Promise.allSettled(
    jsonBlobs.map(async (blob) => {
      const res = await fetch(blob.downloadUrl ?? blob.url, {
        headers: notifyReadHeaders(),
      });
      if (!res.ok) throw new Error(`Failed to fetch ${blob.pathname}`);
      return (await res.json()) as NotifySubscriber;
    }),
  );

  const subs = results
    .filter(
      (r): r is PromiseFulfilledResult<NotifySubscriber> =>
        r.status === "fulfilled",
    )
    .map((r) => r.value)
    .sort((a, b) => b.updatedAt - a.updatedAt);

  return subs[0] ?? null;
}

export async function updateNotifyPreferencesByEmail(
  email: string,
  patch: Partial<Pick<NotifySubscriber, "notifyLaunch" | "notifyReplaced" | "notifyClaimable" | "wallet">>,
): Promise<{ updatedAt: number }> {
  const existing = await getNotifySubscriberByEmail(email);
  if (!existing) {
    throw new Error("Subscriber not found");
  }

  const now = Date.now();
  const key = keyForEmail(email);
  const prefix = `notify-subscribers/${key}`;

  const payload: NotifySubscriber = {
    ...existing,
    ...patch,
    updatedAt: now,
  };

  await put(`${prefix}-${now}.json`, JSON.stringify(payload), {
    ...notifyPutOptions(),
  });

  return { updatedAt: now };
}

export async function unsubscribeByEmail(
  email: string,
): Promise<{ updatedAt: number }> {
  const existing = await getNotifySubscriberByEmail(email);
  if (!existing) {
    throw new Error("Subscriber not found");
  }

  const now = Date.now();
  const key = keyForEmail(email);
  const prefix = `notify-subscribers/${key}`;

  const payload: NotifySubscriber = {
    ...existing,
    notifyLaunch: false,
    notifyReplaced: false,
    notifyClaimable: false,
    updatedAt: now,
  };

  await put(`${prefix}-${now}.json`, JSON.stringify(payload), {
    ...notifyPutOptions(),
  });

  return { updatedAt: now };
}
