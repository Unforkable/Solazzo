import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import OpenAI from "openai";
import { checkRateLimit } from "@/lib/rate-limit";
import { getPromptForStage, type StageNumber } from "@/lib/prompt";

export const maxDuration = 60;

const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

async function generateWithGemini(
  base64Image: string,
  mimeType: string,
  prompt: string,
): Promise<string | null> {
  const response = await gemini.models.generateContent({
    model: "gemini-3.1-flash-image-preview",
    contents: [
      { text: prompt },
      { inlineData: { mimeType, data: base64Image } },
    ],
    config: {
      responseModalities: ["TEXT", "IMAGE"],
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
    },
  });

  if (response.promptFeedback?.blockReason) {
    console.warn("Gemini blocked:", response.promptFeedback.blockReason);
    return null;
  }

  const parts = response.candidates?.[0]?.content?.parts;
  const imagePart = parts?.find((p) => p.inlineData);
  return imagePart?.inlineData?.data ?? null;
}

async function generateWithOpenAI(
  file: File,
  prompt: string,
): Promise<string | null> {
  const response = await openai.images.edit({
    model: "gpt-image-1",
    image: file,
    prompt,
    size: "1024x1024",
    quality: "high",
  });

  return response.data?.[0]?.b64_json ?? null;
}

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";

    const { allowed, remaining } = checkRateLimit(ip);
    if (!allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again in an hour." },
        {
          status: 429,
          headers: { "X-RateLimit-Remaining": String(remaining) },
        },
      );
    }

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
    const prompt = getPromptForStage(stage);

    const arrayBuffer = await file.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString("base64");

    // Try Gemini first (cheaper), fall back to OpenAI
    let imageData = await generateWithGemini(base64Image, file.type, prompt);

    if (!imageData) {
      console.log("Gemini failed or blocked, falling back to OpenAI");
      const fallbackFile = new File(
        [Buffer.from(base64Image, "base64")],
        "selfie.png",
        { type: file.type },
      );
      imageData = await generateWithOpenAI(fallbackFile, prompt);
    }

    if (!imageData) {
      return NextResponse.json(
        { error: "Failed to generate portrait. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { image: imageData, stage },
      { headers: { "X-RateLimit-Remaining": String(remaining) } },
    );
  } catch (error: unknown) {
    console.error("Portrait generation error:", error);

    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes("SAFETY") ||
      message.includes("blocked") ||
      message.includes("content_policy_violation")
    ) {
      return NextResponse.json(
        {
          error:
            "The image was flagged by our content policy. Please try a different photo.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
