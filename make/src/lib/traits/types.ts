export type StageNumber = 1 | 2 | 3 | 4 | 5;

export type RarityTier = "Common" | "Uncommon" | "Rare" | "Legendary";

// ── Category identifiers ──

export type MandatoryCategory =
  | "wrist"
  | "chains"
  | "earrings"
  | "rings"
  | "grillz";

export type OptionalCategory =
  | "eyewear"
  | "headwear"
  | "prop"
  | "tattoo"
  | "background"
  | "clothing";

export type MoodCategory =
  | "lighting"
  | "expression"
  | "eyeDirection"
  | "pose"
  | "composition"
  | "atmosphere";

export type TraitCategory =
  | MandatoryCategory
  | OptionalCategory
  | MoodCategory;

// ── Trait item (one option within a category) ──

export interface TraitItem {
  id: string;
  name: string;
  /** Stages where this item can appear. "all" = every stage. */
  stages: StageNumber[] | "all";
  /** Relative weight (normalized at runtime within the stage-filtered pool). */
  weight: number;
  rarity: RarityTier;
  /** 1-3 sentence Baroque painting description injected into the prompt. */
  fragment: string;
  /** True for "nothing" rolls (no visible item). */
  isNothing?: boolean;
  /** Tags used by coupling rules (e.g. "animal-prop", "smoking-prop"). */
  tags?: string[];
}

// ── Category definition ──

export interface TraitCategoryDef {
  id: TraitCategory;
  displayName: string;
  type: "mandatory" | "optional" | "mood";
  items: TraitItem[];
}

// ── Shadow ratio range per stage ──

export interface StageShadowRatio {
  min: number;
  max: number;
}

// ── Result of rolling a single category ──

export interface TraitRoll {
  category: TraitCategory;
  itemId: string;
  itemName: string;
  rarity: RarityTier;
  fragment: string;
  isNothing: boolean;
  tags: string[];
}

// ── Complete manifest for one portrait ──

export interface TraitManifest {
  stage: StageNumber;
  seed: string;
  rolls: Record<TraitCategory, TraitRoll>;
  prompt: string;
  couplingsFired: string[];
}

// ── Palette directives (one fixed string per stage) ──

export type PaletteDirectives = Record<StageNumber, string>;
