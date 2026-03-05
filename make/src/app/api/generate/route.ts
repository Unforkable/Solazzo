import { NextRequest, NextResponse, after } from "next/server";
import { rollAndAssemble, type StageNumber } from "@/lib/prompt";
import { reportError, reportGeneration } from "@/lib/report";
import { geminiGenerate, type ReferenceImage } from "@/lib/gemini";
import { loadStageReferences } from "@/lib/reference-images";

export const maxDuration = 60;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("image");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No image provided." },
        { status: 400 },
      );
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload a JPEG, PNG, or WebP." },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10 MB." },
        { status: 400 },
      );
    }

    // Parse stage (1-5, default 1)
    const stageRaw = formData.get("stage");
    const stageNum = stageRaw ? parseInt(String(stageRaw), 10) : 1;
    if (![1, 2, 3, 4, 5].includes(stageNum)) {
      return NextResponse.json(
        { error: "Invalid stage. Must be 1-5." },
        { status: 400 },
      );
    }
    const stage = stageNum as StageNumber;

    // Reference images: explicit uploads > per-stage defaults
    const refFiles = formData.getAll("referenceImage");
    let refs: ReferenceImage[] = [];

    if (refFiles.length > 0 && refFiles[0] instanceof File) {
      for (const rf of refFiles) {
        if (rf instanceof File) {
          const refBuf = await rf.arrayBuffer();
          refs.push({
            base64: Buffer.from(refBuf).toString("base64"),
            mimeType: rf.type,
          });
        }
      }
    } else {
      refs = await loadStageReferences(stage);
    }

    // Use custom prompt if provided, otherwise roll fresh traits
    const customPrompt = formData.get("customPrompt");
    const hasCustomPrompt = typeof customPrompt === "string" && customPrompt.length > 0;

    let prompt: string;
    let manifest: ReturnType<typeof rollAndAssemble> | null = null;

    if (hasCustomPrompt) {
      prompt = customPrompt;
    } else {
      manifest = rollAndAssemble(stage, undefined, { referenceImageCount: refs.length });
      prompt = manifest.prompt;
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString("base64");

    const imageData = await geminiGenerate({
      base64Image,
      mimeType: file.type,
      prompt,
      stage,
      referenceImages: refs.length > 0 ? refs : undefined,
    });

    if (!imageData) {
      reportError("Gemini generation failed", { stage });
      return NextResponse.json(
        { error: "Failed to generate portrait. Please try again." },
        { status: 500 },
      );
    }

    // Run after the response is sent — keeps the function alive for Telegram upload
    after(() => reportGeneration(stage, imageData, manifest ?? undefined));

    return NextResponse.json(
      {
        image: imageData,
        stage,
        prompt,
        traits: manifest
          ? {
              seed: manifest.seed,
              rolls: manifest.rolls,
              couplingsFired: manifest.couplingsFired,
            }
          : null,
      },
    );
  } catch (error: unknown) {
    console.error("Portrait generation error:", error);

    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes("SAFETY") ||
      message.includes("blocked") ||
      message.includes("content_policy_violation")
    ) {
      reportError("Content policy violation", { error: message });
      return NextResponse.json(
        {
          error:
            "The image was flagged by our content policy. Please try a different photo.",
        },
        { status: 400 },
      );
    }

    reportError("Unhandled error in portrait generation", { error: message });
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
