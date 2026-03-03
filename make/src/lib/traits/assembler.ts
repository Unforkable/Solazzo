import type { StageNumber, TraitCategory, TraitRoll } from "./types";
import {
  BLOCK_1_IDENTITY_LOCK,
  BLOCK_9_TECHNICAL_FINISH,
  BLOCK_10_NEGATIVE_PROMPT,
  PALETTE_DIRECTIVES,
  SHADOW_RATIOS,
} from "./data";

// ── Helpers ──

/** Return the fragment string only when the roll is present and non-empty. */
function usable(roll: TraitRoll | undefined): string {
  if (!roll) return "";
  if (roll.isNothing) return "";
  return roll.fragment.trim();
}

/** Collect usable fragments from the given categories, preserving order. */
function collectFragments(
  rolls: Record<TraitCategory, TraitRoll>,
  categories: TraitCategory[],
): string[] {
  const fragments: string[] = [];
  for (const cat of categories) {
    const f = usable(rolls[cat]);
    if (f) fragments.push(f);
  }
  return fragments;
}

// ── Public API ──

/**
 * Assemble a 10-block prompt string from resolved trait rolls and a stage number.
 *
 * Blocks that resolve to empty content are omitted.
 * All non-empty blocks are joined with double newlines.
 */
export function assemblePrompt(
  rolls: Record<TraitCategory, TraitRoll>,
  stage: StageNumber,
): string {
  const blocks: string[] = [];

  // Block 1: Identity Lock (constant)
  blocks.push(BLOCK_1_IDENTITY_LOCK);

  // Block 2: Composition & Pose
  {
    const parts: string[] = [];
    const poseFragment = usable(rolls.pose);
    const compFragment = usable(rolls.composition);
    if (poseFragment) parts.push(poseFragment);
    if (compFragment) parts.push(compFragment);

    const suffix = parts.length > 0 ? ` ${parts.join(" ")}` : "";
    blocks.push(`COMPOSITION & POSE: Chest-up framing.${suffix}`);
  }

  // Block 3: Expression & Eyes
  {
    const parts: string[] = [];
    const exprFragment = usable(rolls.expression);
    const eyeFragment = usable(rolls.eyeDirection);
    if (exprFragment) parts.push(exprFragment);
    if (eyeFragment) parts.push(eyeFragment);

    if (parts.length > 0) {
      blocks.push(`EXPRESSION & EYES: ${parts.join(" ")}`);
    }
  }

  // Block 4: Lighting Setup
  {
    const { min, max } = SHADOW_RATIOS[stage];
    const shadowPercent = Math.round((min + max) / 2);
    const lightFragment = usable(rolls.lighting);
    const lightPrefix = lightFragment ? `${lightFragment} ` : "";
    blocks.push(
      `LIGHTING: ${lightPrefix}Approximately ${shadowPercent}% of the canvas is in deep shadow.`,
    );
  }

  // Block 5: Mandatory Wealth Traits
  {
    const wealthCategories: TraitCategory[] = [
      "wrist",
      "chains",
      "earrings",
      "rings",
      "grillz",
    ];
    const fragments = collectFragments(rolls, wealthCategories);
    if (fragments.length > 0) {
      blocks.push(`WEALTH MARKERS: ${fragments.join(" ")}`);
    }
  }

  // Block 6: Optional Flavor Traits
  {
    const flavorCategories: TraitCategory[] = [
      "eyewear",
      "headwear",
      "prop",
      "tattoo",
      "clothing",
    ];
    const fragments = collectFragments(rolls, flavorCategories);
    if (fragments.length > 0) {
      blocks.push(`DETAILS: ${fragments.join(" ")}`);
    }
  }

  // Block 7: Background & Atmosphere
  {
    const envCategories: TraitCategory[] = ["background", "atmosphere"];
    const fragments = collectFragments(rolls, envCategories);
    if (fragments.length > 0) {
      blocks.push(`ENVIRONMENT: ${fragments.join(" ")}`);
    }
  }

  // Block 8: Palette Directive (stage-determined)
  blocks.push(PALETTE_DIRECTIVES[stage]);

  // Block 9: Technical Finish (constant)
  blocks.push(BLOCK_9_TECHNICAL_FINISH);

  // Block 10: Negative Prompt (constant)
  blocks.push(BLOCK_10_NEGATIVE_PROMPT);

  return blocks.join("\n\n");
}
