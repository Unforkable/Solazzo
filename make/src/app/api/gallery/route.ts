import { NextResponse } from "next/server";
import { listCollections } from "@/lib/gallery-store";

export async function GET() {
  try {
    const collections = await listCollections();
    return NextResponse.json({ collections });
  } catch (error) {
    console.error("Gallery list error:", error);
    return NextResponse.json(
      { error: "Failed to load gallery." },
      { status: 500 },
    );
  }
}
