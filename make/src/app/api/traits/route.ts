import { NextResponse } from "next/server";
import { ALL_CATEGORIES } from "@/lib/traits/data";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";

// ── Auth ────────────────────────────────────────────────────────────────────

function checkPassword(request: Request): boolean {
  const password = process.env.TRAIT_EDITOR_PASSWORD;
  if (!password) return true; // no password configured = open access
  return request.headers.get("x-editor-password") === password;
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// ── GET ─────────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  if (!checkPassword(request)) return unauthorized();
  return NextResponse.json(ALL_CATEGORIES);
}

// ── PUT ─────────────────────────────────────────────────────────────────────

export async function PUT(request: Request) {
  if (!checkPassword(request)) return unauthorized();

  try {
    const categories = await request.json();
    const generated = generateCategories(categories);
    const isProd = process.env.NODE_ENV === "production";

    if (isProd) {
      await saveViaGitHub(generated);
    } else {
      await saveToFilesystem(generated);
    }

    const traitCount = categories.reduce(
      (s: number, c: { items: unknown[] }) => s + c.items.length,
      0,
    );
    return NextResponse.json({
      ok: true,
      traitCount,
      mode: isProd ? "github" : "filesystem",
    });
  } catch (err) {
    console.error("Trait save error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to save traits";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── Save strategies ─────────────────────────────────────────────────────────

async function saveToFilesystem(generated: string) {
  const dataPath = join(process.cwd(), "src/lib/traits/data.ts");
  const existing = await readFile(dataPath, "utf-8");
  const header = extractHeader(existing);
  await writeFile(dataPath, header + generated, "utf-8");
}

async function saveViaGitHub(generated: string) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN not configured");

  const repo = "Unforkable/Solazzo";
  const filePath = "make/src/lib/traits/data.ts";
  const apiBase = `https://api.github.com/repos/${repo}/contents/${filePath}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github.v3+json",
    "Content-Type": "application/json",
  };

  // Get current file (need SHA + header)
  const getRes = await fetch(`${apiBase}?ref=main`, { headers });
  if (!getRes.ok) {
    const body = await getRes.text();
    throw new Error(`GitHub read failed (${getRes.status}): ${body}`);
  }
  const { sha, content: encodedContent } = await getRes.json();
  const currentContent = Buffer.from(encodedContent, "base64").toString(
    "utf-8",
  );

  // Extract header and build new file
  const header = extractHeader(currentContent);
  const newContent = header + generated;

  // Commit
  const putRes = await fetch(apiBase, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      message: "Update traits via editor",
      content: Buffer.from(newContent, "utf-8").toString("base64"),
      sha,
      branch: "main",
    }),
  });
  if (!putRes.ok) {
    const body = await putRes.text();
    if (putRes.status === 409) {
      throw new Error("File was modified externally — refresh and try again");
    }
    throw new Error(`GitHub commit failed (${putRes.status}): ${body}`);
  }
}

function extractHeader(fileContent: string): string {
  const marker = "// ── Mandatory Wealth Markers";
  const idx = fileContent.indexOf(marker);
  if (idx === -1) throw new Error("Could not find section marker in data.ts");
  return fileContent.substring(0, idx);
}

// ── Code generator ──────────────────────────────────────────────────────────

const CATEGORY_VARS: Record<string, string> = {
  wrist: "WRIST",
  chains: "CHAINS",
  earrings: "EARRINGS",
  rings: "RINGS",
  grillz: "GRILLZ",
  eyewear: "EYEWEAR",
  headwear: "HEADWEAR",
  prop: "PROP",
  tattoo: "TATTOO",
  clothing: "CLOTHING",
  lighting: "LIGHTING",
  expression: "EXPRESSION",
  eyeDirection: "EYE_DIRECTION",
  pose: "POSE",
  composition: "COMPOSITION",
  atmosphere: "ATMOSPHERE",
};

const STAGE_ROMAN: Record<number, string> = {
  1: "I",
  2: "II",
  3: "III",
  4: "IV",
  5: "V",
};

interface ItemShape {
  id: string;
  name: string;
  stages: number[] | "all";
  weight: number;
  rarity: string;
  fragment: string;
  isNothing?: boolean;
  tags?: string[];
}

interface CategoryShape {
  id: string;
  displayName: string;
  type: string;
  items: ItemShape[];
}

function serializeItem(item: ItemShape): string {
  const parts: string[] = [
    `id: ${JSON.stringify(item.id)}`,
    `name: ${JSON.stringify(item.name)}`,
    `stages: ${item.stages === "all" ? '"all"' : `[${(item.stages as number[]).join(", ")}]`}`,
    `weight: ${item.weight}`,
    `rarity: ${JSON.stringify(item.rarity)}`,
    `fragment: ${JSON.stringify(item.fragment)}`,
  ];
  if (item.isNothing) parts.push("isNothing: true");
  if (item.tags?.length)
    parts.push(
      `tags: [${item.tags.map((t) => JSON.stringify(t)).join(", ")}]`,
    );
  return `{ ${parts.join(", ")} }`;
}

function generateCategory(cat: CategoryShape): string {
  const varName = CATEGORY_VARS[cat.id];
  let out = `export const ${varName}: TraitCategoryDef = {\n`;
  out += `  id: ${JSON.stringify(cat.id)},\n`;
  out += `  displayName: ${JSON.stringify(cat.displayName)},\n`;
  out += `  type: ${JSON.stringify(cat.type)},\n`;
  out += `  items: [\n`;

  if (cat.type === "mandatory" || cat.type === "optional") {
    const groups = new Map<string | number, ItemShape[]>();
    for (const item of cat.items) {
      const key =
        item.stages === "all" ? "all" : (item.stages as number[])[0];
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }
    for (const [stage, items] of groups) {
      if (typeof stage === "number") {
        out += `    // Stage ${STAGE_ROMAN[stage]}\n`;
      }
      for (const item of items) {
        out += `    ${serializeItem(item)},\n`;
      }
    }
  } else {
    for (const item of cat.items) {
      out += `    ${serializeItem(item)},\n`;
    }
  }

  out += `  ],\n`;
  out += `};\n`;
  return out;
}

function pad(text: string): string {
  const prefix = `// ── ${text} `;
  return prefix + "─".repeat(Math.max(1, 80 - prefix.length));
}

function generateCategories(categories: CategoryShape[]): string {
  const mandatory = categories.filter((c) => c.type === "mandatory");
  const optional = categories.filter((c) => c.type === "optional");
  const mood = categories.filter((c) => c.type === "mood");

  let out = "";

  out += pad("Mandatory Wealth Markers") + "\n\n";
  for (const cat of mandatory) out += generateCategory(cat) + "\n";

  out += pad("Optional Flavor Traits") + "\n\n";
  for (const cat of optional) out += generateCategory(cat) + "\n";

  out += pad("Mood & Composition Layer") + "\n\n";
  for (const cat of mood) out += generateCategory(cat) + "\n";

  out +=
    pad("Master list (order matches prompt assembly block order)") + "\n\n";
  out += "export const ALL_CATEGORIES: TraitCategoryDef[] = [\n";
  out +=
    "  " + mandatory.map((c) => CATEGORY_VARS[c.id]).join(", ") + ",\n";
  out += "  " + optional.map((c) => CATEGORY_VARS[c.id]).join(", ") + ",\n";
  out += "  " + mood.map((c) => CATEGORY_VARS[c.id]).join(", ") + ",\n";
  out += "];\n";

  return out;
}
