import { readdir, readFile } from "node:fs/promises";
import { resolve, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { ReferenceImage } from "./gemini";
import type { StageNumber } from "./traits/types";

const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

/**
 * Directory layout:
 *   Gemini-Reference/
 *     1/   ← images here become references for stage 1
 *     4/   ← images here become references for stage 4
 */
const __dirname = dirname(fileURLToPath(import.meta.url));
const REF_DIR = resolve(__dirname, "../../../Gemini-Reference");

function mimeFromExt(ext: string): string {
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "image/jpeg";
}

/**
 * Load all reference images for a stage from `Gemini-Reference/{stage}/`.
 * Returns an empty array if the folder doesn't exist or has no images.
 */
export async function loadStageReferences(
  stage: StageNumber,
): Promise<ReferenceImage[]> {
  const dir = resolve(REF_DIR, String(stage));
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return [];
  }

  const imageFiles = entries
    .filter((f) => IMAGE_EXTS.has(extname(f).toLowerCase()))
    .sort();

  const refs: ReferenceImage[] = [];
  for (const file of imageFiles) {
    try {
      const buf = await readFile(resolve(dir, file));
      refs.push({
        base64: buf.toString("base64"),
        mimeType: mimeFromExt(extname(file).toLowerCase()),
      });
    } catch {
      console.warn(`[ref] Failed to read: ${dir}/${file}`);
    }
  }

  return refs;
}
