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
 * Assemble a single unified prompt from resolved trait rolls and a stage number.
 *
 * The prompt is fed to Gemini alongside the headshot so it can render the
 * subject with identity preservation, all rolled traits, AND Baroque
 * oil-painting style in a single pass.
 */
export function assemblePrompt(
  rolls: Record<TraitCategory, TraitRoll>,
  stage: StageNumber,
): { prompt: string } {
  const blocks: string[] = [];

  // 1. Identity lock (primacy position)
  blocks.push(BLOCK_1_IDENTITY_LOCK);

  // 2. Style directive
  blocks.push(
    "STYLE — Baroque oil-painting treatment in the tradition of Caravaggio's tenebrism. " +
    "Render entirely as oil paint on canvas: dramatic chiaroscuro, visible brushwork, impasto on highlights. " +
    "Do not reposition, resize, or re-proportion any part of the subject. " +
    "The painting must look like an authentic 17th-century Old Master work.",
  );

  // 3. Background
  blocks.push(
    "BACKGROUND: The background MUST be a near-black (#0A0A0A) void. " +
    "Completely remove any original background elements — no scenery, no objects, no colors, no gradients. " +
    "Only darkness behind the subject.",
  );

  // 4. Composition & Pose
  {
    const parts: string[] = [];
    const poseFragment = usable(rolls.pose);
    const compFragment = usable(rolls.composition);
    if (poseFragment) parts.push(poseFragment);
    if (compFragment) parts.push(compFragment);

    const suffix = parts.length > 0 ? ` ${parts.join(" ")}` : "";
    blocks.push(`COMPOSITION & POSE: Chest-up framing.${suffix}`);
  }

  // 5. Expression & Eyes
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

  // 6. Lighting (with shadow ratio)
  {
    const { min, max } = SHADOW_RATIOS[stage];
    const shadowPercent = Math.round((min + max) / 2);
    const lightFragment = usable(rolls.lighting);
    const lightPrefix = lightFragment ? `${lightFragment} ` : "";
    blocks.push(
      `LIGHTING: ${lightPrefix}True Caravaggist tenebrism — approximately ${shadowPercent}% of the canvas must be swallowed in deep, near-black shadow. Only a narrow sliver of warm light reveals the subject. The overall image must read as DARK; a viewer should need to lean in to see detail in the shadows. Do not add fill light or ambient illumination to brighten the scene.`,
    );
  }

  // 7. Mandatory Wealth Traits
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

  // 8. Optional Flavor Traits
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

  // 9. Atmosphere / Surface Texture
  {
    const atmosphereFragment = usable(rolls.atmosphere);
    if (atmosphereFragment) {
      blocks.push(`ATMOSPHERE & SURFACE TEXTURE: ${atmosphereFragment}`);
    }
  }

  // 10. Palette Directive
  blocks.push(PALETTE_DIRECTIVES[stage]);

  // 11. Technical Finish
  blocks.push(BLOCK_9_TECHNICAL_FINISH);

  // 12. Negative Prompt
  blocks.push(BLOCK_10_NEGATIVE_PROMPT);

  // Identity lock — repeated last (recency)
  blocks.push(
    "FINAL REMINDER — The face is sacred. If any instruction above conflicts with identity " +
    "preservation, identity preservation wins. No feature may be altered, warped, smoothed, " +
    "or repositioned. The output must look like a painting OF this exact person, not a painting " +
    "INSPIRED BY them.",
  );

  return { prompt: blocks.join("\n\n") };
}
