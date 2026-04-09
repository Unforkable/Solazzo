import { put, list } from "@vercel/blob";

export interface GalleryTraitRoll {
  category: string;
  itemName: string;
  rarity: string;
  isNothing: boolean;
}

export interface GalleryEntry {
  id: string;
  portraits: string[]; // 5 public URLs
  traits?: Array<{
    stage: number;
    rolls: Record<string, GalleryTraitRoll>;
  }>;
  publishedAt: number;
  slot?: number;
  conviction?: number; // SOL locked
  wallet?: string;     // wallet address (base58)
  claimTxSig?: string; // claim transaction signature
}

export async function publishCollection(
  images: Buffer[],
  traits?: GalleryEntry["traits"],
  conviction?: number,
  wallet?: string,
  slotId?: number,
  claimTxSig?: string,
): Promise<GalleryEntry> {
  const id = crypto.randomUUID().slice(0, 8);

  const uploads = await Promise.all(
    images.map((buf, i) =>
      put(`gallery/${id}/stage-${i + 1}.jpg`, buf, {
        access: "public",
        contentType: "image/jpeg",
        addRandomSuffix: false,
      }),
    ),
  );

  const entry: GalleryEntry = {
    id,
    portraits: uploads.map((u) => u.url),
    traits,
    publishedAt: Date.now(),
    ...(conviction != null && { conviction }),
    ...(wallet != null && { wallet }),
    ...(slotId != null && { slot: slotId }),
    ...(claimTxSig != null && { claimTxSig }),
  };

  await put(`gallery-meta/${id}.json`, JSON.stringify(entry), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
  });

  return entry;
}

export async function listCollections(): Promise<GalleryEntry[]> {
  const { blobs } = await list({ prefix: "gallery-meta/" });

  const results = await Promise.allSettled(
    blobs
      .filter((b) => b.pathname.endsWith(".json"))
      .map(async (blob) => {
        const res = await fetch(blob.url);
        if (!res.ok) throw new Error(`Failed to fetch ${blob.pathname}`);
        return (await res.json()) as GalleryEntry;
      }),
  );

  const entries = results
    .filter((r): r is PromiseFulfilledResult<GalleryEntry> => r.status === "fulfilled")
    .map((r) => r.value);

  // Sort by publishedAt descending (newest first), then deduplicate.
  entries.sort((a, b) => b.publishedAt - a.publishedAt);
  return deduplicateEntries(entries);
}

/**
 * Read-time deduplication — removes duplicate gallery entries without
 * mutating blob storage. Duplicates can occur when two concurrent publish
 * requests pass the claimTxSig idempotency check before either write
 * propagates in Vercel Blob's eventually-consistent listing.
 *
 * Dedup key priority:
 *   1. claimTxSig (on-chain unique claim tx — strongest signal)
 *   2. wallet + slot + first portrait URL (stable composite fallback)
 *   3. No key derivable → entry is kept (avoid false positives)
 *
 * Keeps the first entry encountered (after sorting), which is the newest.
 */
export function deduplicateEntries(entries: GalleryEntry[]): GalleryEntry[] {
  const seen = new Set<string>();
  const result: GalleryEntry[] = [];

  for (const entry of entries) {
    const key = dedupeKey(entry);
    if (key === null || !seen.has(key)) {
      if (key !== null) seen.add(key);
      result.push(entry);
    }
  }

  return result;
}

function dedupeKey(entry: GalleryEntry): string | null {
  // Primary: claimTxSig (globally unique on-chain)
  if (entry.claimTxSig) {
    return `tx:${entry.claimTxSig}`;
  }

  // Fallback: wallet + slot + first portrait URL
  if (entry.wallet && typeof entry.slot === "number" && entry.portraits?.[0]) {
    return `ws:${entry.wallet}:${entry.slot}:${entry.portraits[0]}`;
  }

  // No reliable key — keep the entry to avoid false positives
  return null;
}

/**
 * Slot canonicalization — one visible entry per slot number.
 *
 * Entries without a `slot` field are classified as legacy (pre-chain).
 * Among entries sharing the same slot, the winner is chosen by:
 *   1. Has both claimTxSig AND wallet (on-chain bound, highest confidence)
 *   2. Has claimTxSig (partially bound)
 *   3. Newest publishedAt
 *   4. Lexical id (deterministic tiebreak)
 *
 * Read-time only — no blob mutations.
 */
export function canonicalizeBySlot(entries: GalleryEntry[]): {
  canonical: GalleryEntry[];
  legacy: GalleryEntry[];
} {
  const slotMap = new Map<number, GalleryEntry>();
  const legacy: GalleryEntry[] = [];

  for (const entry of entries) {
    if (typeof entry.slot !== "number") {
      legacy.push(entry);
      continue;
    }

    const existing = slotMap.get(entry.slot);
    if (!existing || slotCanonicalCompare(entry, existing) < 0) {
      slotMap.set(entry.slot, entry);
    }
  }

  const canonical = [...slotMap.values()].sort(
    (a, b) => b.publishedAt - a.publishedAt,
  );

  return { canonical, legacy };
}

/**
 * Compare two entries for the same slot.
 * Returns negative if `a` should win (is more canonical).
 */
function slotCanonicalCompare(a: GalleryEntry, b: GalleryEntry): number {
  const scoreA = canonicalScore(a);
  const scoreB = canonicalScore(b);
  if (scoreA !== scoreB) return scoreB - scoreA; // higher score wins

  // Same confidence tier — prefer newest
  if (a.publishedAt !== b.publishedAt) return b.publishedAt - a.publishedAt;

  // Final deterministic tiebreak
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function canonicalScore(entry: GalleryEntry): number {
  if (entry.claimTxSig && entry.wallet) return 2;
  if (entry.claimTxSig) return 1;
  return 0;
}

export async function findCollectionByClaimTxSig(
  claimTxSig: string,
): Promise<GalleryEntry | null> {
  const collections = await listCollections();
  return (
    collections.find(
      (entry) => typeof entry.claimTxSig === "string" && entry.claimTxSig === claimTxSig,
    ) ?? null
  );
}
