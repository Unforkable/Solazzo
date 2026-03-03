import { NextRequest, NextResponse } from "next/server";
import { gemini } from "@/lib/openai";
import { checkRateLimit } from "@/lib/rate-limit";
import { PORTRAIT_PROMPT } from "@/lib/prompt";

export const maxDuration = 60;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP
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

    // Parse multipart form data
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

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString("base64");

    // Call Gemini image generation
    const response = await gemini.models.generateContent({
      model: "gemini-3.1-flash-image-preview",
      contents: [
        {
          text: PORTRAIT_PROMPT,
        },
        {
          inlineData: {
            mimeType: file.type,
            data: base64Image,
          },
        },
      ],
      config: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    });

    // Extract image from response
    const parts = response.candidates?.[0]?.content?.parts;
    const imagePart = parts?.find((p) => p.inlineData);
    const imageData = imagePart?.inlineData?.data;

    if (!imageData) {
      return NextResponse.json(
        { error: "Failed to generate portrait. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { image: imageData },
      { headers: { "X-RateLimit-Remaining": String(remaining) } },
    );
  } catch (error: unknown) {
    console.error("Portrait generation error:", error);

    // Handle safety/content policy errors
    const message =
      error instanceof Error ? error.message : String(error);
    if (
      message.includes("SAFETY") ||
      message.includes("blocked") ||
      message.includes("content policy")
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
