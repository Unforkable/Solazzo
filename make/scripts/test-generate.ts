#!/usr/bin/env npx tsx
/**
 * Test harness for portrait generation.
 *
 * Usage:
 *   npx tsx scripts/test-generate.ts --photo ~/selfie.jpg --stage 4
 *   npx tsx scripts/test-generate.ts --photo ~/selfie.jpg --stage 4 --ref "Moodboard/bust down.png"
 *   npx tsx scripts/test-generate.ts --photo ~/selfie.jpg --stage 4 --trait wrist=iced-out-ap
 *   npx tsx scripts/test-generate.ts --photo ~/selfie.jpg --stage 4 --sweep wrist
 *   npx tsx scripts/test-generate.ts --photo ~/selfie.jpg --stage 4 --no-traits
 *   npx tsx scripts/test-generate.ts --photo ~/selfie.jpg --stage 3 --seed abc123
 */

import { parseArgs } from "node:util";
import { readFileSync } from "node:fs";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Load .env.local (Next.js doesn't do this for standalone scripts)
try {
  const envPath = resolve(dirname(fileURLToPath(import.meta.url)), "../.env.local");
  const envFile = readFileSync(envPath, "utf-8");
  for (const line of envFile.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    const val = trimmed.slice(eq + 1).replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  // no .env.local, rely on environment
}
import { rollTraits } from "../src/lib/traits/roller";
import { assemblePrompt } from "../src/lib/traits/assembler";
import { ALL_CATEGORIES } from "../src/lib/traits/data";
import { loadStageReferences } from "../src/lib/reference-images";
import { geminiGenerate, type ReferenceImage } from "../src/lib/gemini";
import type { StageNumber, TraitCategory, TraitRoll } from "../src/lib/traits/types";

// ── CLI parsing ─────────────────────────────────────────────────────────────

const { values } = parseArgs({
  options: {
    photo: { type: "string" },
    stage: { type: "string", default: "3" },
    ref: { type: "string", multiple: true },
    trait: { type: "string", multiple: true },
    sweep: { type: "string" },
    "no-traits": { type: "boolean", default: false },
    seed: { type: "string" },
    help: { type: "boolean", short: "h", default: false },
  },
  strict: true,
});

if (values.help) {
  console.log(`
Usage: npx tsx scripts/test-generate.ts --photo <path> [options]

Options:
  --photo <path>           Headshot image (required)
  --stage <1-5>            Stage number (default: 3)
  --ref <path>             Style reference image (repeatable)
  --trait <cat>=<id>       Force a specific trait (repeatable)
  --sweep <category>       Generate one image per item in category
  --no-traits              Strip all traits (baseline test)
  --seed <string>          Pin the PRNG seed
  -h, --help               Show this help
`);
  process.exit(0);
}

if (!values.photo) {
  console.error("Error: --photo is required");
  process.exit(1);
}

const stageNum = parseInt(values.stage!, 10) as StageNumber;
if (![1, 2, 3, 4, 5].includes(stageNum)) {
  console.error("Error: --stage must be 1-5");
  process.exit(1);
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function mimeFromPath(p: string): string {
  const ext = extname(p).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "image/jpeg";
}

async function loadImage(path: string): Promise<{ base64: string; mimeType: string }> {
  const absPath = resolve(path);
  const buf = await readFile(absPath);
  return { base64: buf.toString("base64"), mimeType: mimeFromPath(absPath) };
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, "../test-output");

async function saveResult(
  imageBase64: string,
  prompt: string,
  rolls: Record<TraitCategory, TraitRoll>,
  description: string,
  seed: string,
  couplingsFired: string[],
) {
  await mkdir(OUT_DIR, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const prefix = `${ts}-stage${stageNum}-${description}`;

  const imgPath = resolve(OUT_DIR, `${prefix}.png`);
  const txtPath = resolve(OUT_DIR, `${prefix}.txt`);

  await writeFile(imgPath, Buffer.from(imageBase64, "base64"));

  const traitLines = Object.values(rolls)
    .filter((r) => !r.isNothing)
    .map((r) => `  ${r.category}: ${r.itemName} (${r.rarity})`)
    .join("\n");

  const manifest = [
    `Stage: ${stageNum}`,
    `Seed: ${seed}`,
    `Couplings: ${couplingsFired.length > 0 ? couplingsFired.join(", ") : "none"}`,
    `Description: ${description}`,
    "",
    "Traits:",
    traitLines || "  (none)",
    "",
    "Prompt:",
    prompt,
  ].join("\n");

  await writeFile(txtPath, manifest);
  console.log(`  Saved: ${imgPath}`);
}

// ── Build rolls with overrides ──────────────────────────────────────────────

function buildRolls(
  seed?: string,
  traitOverrides?: Array<{ category: TraitCategory; itemId: string }>,
  noTraits?: boolean,
): { rolls: Record<TraitCategory, TraitRoll>; seed: string; couplingsFired: string[] } {
  const result = rollTraits(stageNum, seed);

  if (noTraits) {
    // Blank out all rolls
    for (const cat of ALL_CATEGORIES) {
      result.rolls[cat.id] = {
        category: cat.id,
        itemId: "nothing",
        itemName: "Nothing",
        rarity: "Common",
        fragment: "",
        isNothing: true,
        tags: [],
      };
    }
    return { ...result, couplingsFired: [] };
  }

  if (traitOverrides?.length) {
    for (const { category, itemId } of traitOverrides) {
      const catDef = ALL_CATEGORIES.find((c) => c.id === category);
      if (!catDef) {
        console.error(`Unknown category: ${category}`);
        process.exit(1);
      }
      const item = catDef.items.find((i) => i.id === itemId);
      if (!item) {
        console.error(`Unknown item '${itemId}' in category '${category}'`);
        console.error(`  Available: ${catDef.items.map((i) => i.id).join(", ")}`);
        process.exit(1);
      }
      result.rolls[category] = {
        category,
        itemId: item.id,
        itemName: item.name,
        rarity: item.rarity,
        fragment: item.fragment,
        isNothing: item.isNothing ?? false,
        tags: item.tags ?? [],
      };
    }
  }

  return result;
}

// ── Reference image loading ─────────────────────────────────────────────────

async function loadRefImages(): Promise<ReferenceImage[]> {
  if (values.ref?.length) {
    const refs: ReferenceImage[] = [];
    for (const p of values.ref) {
      const img = await loadImage(p);
      refs.push(img);
    }
    return refs;
  }
  return loadStageReferences(stageNum);
}

// ── Generate one portrait ───────────────────────────────────────────────────

async function generateOne(
  photo: { base64: string; mimeType: string },
  refs: ReferenceImage[],
  rolls: Record<TraitCategory, TraitRoll>,
  seed: string,
  couplingsFired: string[],
  description: string,
) {
  const { prompt } = assemblePrompt(rolls, stageNum, { referenceImageCount: refs.length });

  console.log(`  Generating: ${description}...`);

  const imageData = await geminiGenerate({
    base64Image: photo.base64,
    mimeType: photo.mimeType,
    prompt,
    stage: stageNum,
    referenceImages: refs.length > 0 ? refs : undefined,
  });

  if (!imageData) {
    console.error(`  FAILED: Gemini returned no image for ${description}`);
    return;
  }

  await saveResult(imageData, prompt, rolls, description, seed, couplingsFired);
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nSolazzo Test Generator`);
  console.log(`Stage: ${stageNum}`);

  const photo = await loadImage(values.photo!);
  const refs = await loadRefImages();

  if (refs.length > 0) {
    const sources = values.ref?.length
      ? values.ref.join(", ")
      : `Gemini-Reference/${stageNum}/ (${refs.length} files)`;
    console.log(`Reference images: ${sources}`);
  }

  // Parse --trait flags
  const traitOverrides: Array<{ category: TraitCategory; itemId: string }> = [];
  if (values.trait) {
    for (const t of values.trait) {
      const [cat, id] = t.split("=");
      if (!cat || !id) {
        console.error(`Invalid --trait format: '${t}' (expected category=item-id)`);
        process.exit(1);
      }
      traitOverrides.push({ category: cat as TraitCategory, itemId: id });
    }
  }

  if (values.sweep) {
    // Sweep mode: one image per item in the category
    const catId = values.sweep as TraitCategory;
    const catDef = ALL_CATEGORIES.find((c) => c.id === catId);
    if (!catDef) {
      console.error(`Unknown category for --sweep: ${catId}`);
      console.error(`  Available: ${ALL_CATEGORIES.map((c) => c.id).join(", ")}`);
      process.exit(1);
    }

    const stageItems = catDef.items.filter(
      (item) => item.stages === "all" || item.stages.includes(stageNum),
    );
    console.log(`Sweeping ${catId}: ${stageItems.length} items\n`);

    for (const item of stageItems) {
      const { rolls, seed, couplingsFired } = buildRolls(values.seed, [
        { category: catId, itemId: item.id },
        ...traitOverrides,
      ]);
      const desc = `sweep-${catId}-${item.id}`;
      await generateOne(photo, refs, rolls, seed, couplingsFired, desc);
    }
  } else {
    // Single generation
    const { rolls, seed, couplingsFired } = buildRolls(
      values.seed,
      traitOverrides,
      values["no-traits"],
    );

    let desc = "default";
    if (values["no-traits"]) desc = "no-traits";
    else if (traitOverrides.length > 0)
      desc = traitOverrides.map((t) => `${t.category}-${t.itemId}`).join("_");

    console.log(`Seed: ${seed}\n`);
    await generateOne(photo, refs, rolls, seed, couplingsFired, desc);
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
