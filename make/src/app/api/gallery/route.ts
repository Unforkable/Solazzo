import { NextResponse } from "next/server";
import { listCollections, canonicalizeBySlot } from "@/lib/gallery-store";

export async function GET(request: Request) {
  try {
    const all = await listCollections();
    const { canonical, legacy } = canonicalizeBySlot(all);

    const url = new URL(request.url);
    const includeLegacy = url.searchParams.get("includeLegacy") === "true";

    const collections = includeLegacy
      ? [...canonical, ...legacy]
      : canonical;

    return NextResponse.json({ collections });
  } catch (error) {
    console.error("Gallery list error:", error);
    return NextResponse.json(
      { error: "Failed to load gallery." },
      { status: 500 },
    );
  }
}
