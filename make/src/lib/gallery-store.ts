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
  wallet?: string;     // wallet address
}

export async function publishCollection(
  images: Buffer[],
  traits?: GalleryEntry["traits"],
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

  const entries = await Promise.all(
    blobs
      .filter((b) => b.pathname.endsWith(".json"))
      .map(async (blob) => {
        const res = await fetch(blob.url);
        return (await res.json()) as GalleryEntry;
      }),
  );

  return entries.sort((a, b) => b.publishedAt - a.publishedAt);
}
