import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { reportError } from "./report";
import type { StageNumber } from "./traits/types";

let _gemini: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (!_gemini) {
    _gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return _gemini;
}

export interface ReferenceImage {
  base64: string;
  mimeType: string;
}

export interface GeminiGenerateOptions {
  base64Image: string;
  mimeType: string;
  prompt: string;
  stage: StageNumber;
  /** Optional style reference images. */
  referenceImages?: ReferenceImage[];
}

/**
 * Call Gemini to generate a portrait image.
 * Returns base64 image data on success, null on failure.
 */
export async function geminiGenerate(
  opts: GeminiGenerateOptions,
): Promise<string | null> {
  const contents: Array<
    { text: string } | { inlineData: { mimeType: string; data: string } }
  > = [
    { text: opts.prompt },
    { inlineData: { mimeType: opts.mimeType, data: opts.base64Image } },
  ];

  // Additional images: style references (optional)
  if (opts.referenceImages?.length) {
    for (const ref of opts.referenceImages) {
      contents.push({
        inlineData: { mimeType: ref.mimeType, data: ref.base64 },
      });
    }
  }

  const response = await getClient().models.generateContent({
    model: "gemini-3.1-flash-image-preview",
    contents,
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
    reportError("Gemini blocked by safety filter", {
      stage: opts.stage,
      blockReason: response.promptFeedback.blockReason,
    });
    return null;
  }

  const candidate = response.candidates?.[0];
  const parts = candidate?.content?.parts;
  const imagePart = parts?.find((p) => p.inlineData);

  if (!imagePart?.inlineData?.data) {
    const textParts = parts?.filter((p) => p.text).map((p) => p.text).join(" ");
    reportError("Gemini returned no image", {
      stage: opts.stage,
      finishReason: candidate?.finishReason ?? "unknown",
      textResponse: textParts ? textParts.slice(0, 300) : "none",
      partCount: parts?.length ?? 0,
    });
    return null;
  }

  return imagePart.inlineData.data;
}
