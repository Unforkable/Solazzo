import { NextRequest, NextResponse } from "next/server";
import { publishCollection, type GalleryEntry } from "@/lib/gallery-store";

const MAX_IMAGE_SIZE = 1024 * 1024; // 1 MB per portrait

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { portraits, traits } = body;

    if (!Array.isArray(portraits) || portraits.length !== 5) {
      return NextResponse.json(
        { error: "Exactly 5 portraits required." },
        { status: 400 },
      );
    }

    const buffers: Buffer[] = [];
    for (const dataUrl of portraits) {
      if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) {
        return NextResponse.json(
          { error: "Invalid image data." },
          { status: 400 },
        );
      }
      const base64 = dataUrl.split(",")[1];
      if (!base64) {
        return NextResponse.json(
          { error: "Invalid data URL." },
          { status: 400 },
        );
      }
      const buf = Buffer.from(base64, "base64");
      if (buf.length > MAX_IMAGE_SIZE) {
        return NextResponse.json(
          { error: "Each portrait must be under 1 MB." },
          { status: 400 },
        );
      }
      buffers.push(buf);
    }

    // Strip prompt/fragment from traits — only keep display data
    let cleanTraits: GalleryEntry["traits"];
    if (Array.isArray(traits) && traits.length === 5) {
      cleanTraits = traits.map(
        (t: { stage?: number; rolls?: Record<string, unknown> }, i: number) => ({
          stage: t.stage ?? i + 1,
          rolls: Object.fromEntries(
            Object.entries(t.rolls ?? {}).map(([cat, r]) => {
              const roll = r as Record<string, unknown>;
              return [
                cat,
                {
                  category: cat,
                  itemName: String(roll.itemName ?? ""),
                  rarity: String(roll.rarity ?? "Common"),
                  isNothing: Boolean(roll.isNothing),
                },
              ];
            }),
          ),
        }),
      );
    }

    const entry = await publishCollection(buffers, cleanTraits);

    return NextResponse.json({ id: entry.id });
  } catch (error) {
    console.error("Gallery publish error:", error);
    return NextResponse.json(
      { error: "Failed to publish." },
      { status: 500 },
    );
  }
}
