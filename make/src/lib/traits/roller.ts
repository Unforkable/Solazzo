import type {
  StageNumber,
  TraitCategory,
  TraitCategoryDef,
  TraitItem,
  TraitRoll,
} from "./types";
import { ALL_CATEGORIES, POSE, PROP, EXPRESSION } from "./data";

// ── Seeded PRNG (mulberry32) ────────────────────────────────────────────────

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── String → 32-bit hash ────────────────────────────────────────────────────

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function toTraitRoll(category: TraitCategory, item: TraitItem): TraitRoll {
  return {
    category,
    itemId: item.id,
    itemName: item.name,
    rarity: item.rarity,
    fragment: item.fragment,
    isNothing: item.isNothing ?? false,
    tags: item.tags ?? [],
  };
}

function findItemById(
  categoryDef: TraitCategoryDef,
  id: string,
): TraitItem | undefined {
  return categoryDef.items.find((item) => item.id === id);
}

// ── Stage-filtered pool ─────────────────────────────────────────────────────

function getStagePool(category: TraitCategoryDef, stage: StageNumber): TraitItem[] {
  return category.items.filter(
    (item) => item.stages === "all" || item.stages.includes(stage),
  );
}

// ── Weighted random selection ───────────────────────────────────────────────

function weightedSelect(
  pool: TraitItem[],
  stage: StageNumber,
  isMood: boolean,
  rand: () => number,
): TraitItem {
  // Build effective weights — mood categories get a 1.5x boost for
  // items whose explicit stage list includes the current stage.
  const weights = pool.map((item) => {
    let w = item.weight;
    if (isMood && item.stages !== "all" && item.stages.includes(stage)) {
      w *= 1.5;
    }
    return w;
  });

  const total = weights.reduce((sum, w) => sum + w, 0);
  const draw = rand() * total;

  let cumulative = 0;
  for (let i = 0; i < pool.length; i++) {
    cumulative += weights[i];
    if (draw < cumulative) {
      return pool[i];
    }
  }

  // Fallback (floating-point edge case) — return last item
  return pool[pool.length - 1];
}

// ── Hand-budget classification ──────────────────────────────────────────────
// Explicit ID-based maps — no fragment parsing.

/** Props whose fragments describe using both hands. */
const TWO_HAND_PROPS = new Set([
  "goose-i",
  "white-rabbit",
  "instant-ramen-cup",
  "magic-8-ball",
  "whole-pineapple",
  "lobster-iv",
  "faberge-egg",
  "koi-fish",
]);

/** How many hands each pose occupies (0 = hands-neutral). */
const POSE_HANDS: Record<string, number> = {
  "three-quarter-profile": 0,
  "profile-looking-back": 0,
  "leaning-forward": 0,
  "leaning-back-chin-up": 0,
  "head-tilted": 0,
  "hand-touching-face": 1,
  "adjusting-collar-chain": 1,
  "pulling-down-lower-lip": 1,
  "holding-prop-up": 1,
  "hand-over-mouth": 1,
  "hand-raised-to-mouth-bust-down": 1,
  "arms-crossed": 2,
  "hands-in-pockets": 2,
};

function propHandsRequired(roll: TraitRoll): number {
  if (roll.isNothing) return 0;
  if (TWO_HAND_PROPS.has(roll.itemId)) return 2;
  if (roll.tags.includes("held-object")) return 1;
  return 0;
}

function poseHandsUsed(roll: TraitRoll): number {
  return POSE_HANDS[roll.itemId] ?? 0;
}

// ── Coupling resolution ─────────────────────────────────────────────────────

function resolveCouplings(
  rolls: Record<TraitCategory, TraitRoll>,
  stage: StageNumber,
  rand: () => number,
): string[] {
  const fired: string[] = [];

  // 1. Inner lip tattoo → force lip-pull pose
  if (rolls.tattoo.tags.includes("lip-tattoo")) {
    const target = findItemById(POSE, "pulling-down-lower-lip");
    if (target) {
      rolls.pose = toTraitRoll("pose", target);
      fired.push("lip-tattoo→lip-pull-pose");
    }
  }

  // 2. Animal prop → force holding pose (if current pose is no-hands-free)
  if (
    rolls.prop.tags.includes("animal-prop") &&
    rolls.pose.tags.includes("no-hands-free")
  ) {
    const target = findItemById(POSE, "holding-prop-up");
    if (target) {
      rolls.pose = toTraitRoll("pose", target);
      fired.push("animal-prop→holding-pose");
    }
  }

  // 3. Exhaling smoke → require smoking prop
  if (
    rolls.expression.tags.includes("smoke-expression") &&
    !rolls.prop.tags.includes("smoking-prop")
  ) {
    // Try to find a smoking prop available at this stage first
    const stagePool = getStagePool(PROP, stage);
    let smokingProp = stagePool.find((item) =>
      (item.tags ?? []).includes("smoking-prop"),
    );

    // Fallback: any smoking prop in the full pool
    if (!smokingProp) {
      smokingProp = PROP.items.find((item) =>
        (item.tags ?? []).includes("smoking-prop"),
      );
    }

    if (smokingProp) {
      rolls.prop = toTraitRoll("prop", smokingProp);
      fired.push("smoke-expression→smoking-prop");
    }
  }

  // 4. Grillz + closed-mouth → 50% re-roll to open-mouth expression
  if (!rolls.grillz.isNothing && rolls.expression.tags.includes("closed-mouth")) {
    if (rand() < 0.5) {
      const openMouthPool = getStagePool(EXPRESSION, stage).filter((item) =>
        (item.tags ?? []).includes("open-mouth"),
      );
      if (openMouthPool.length > 0) {
        const pick = weightedSelect(openMouthPool, stage, true, rand);
        rolls.expression = toTraitRoll("expression", pick);
        fired.push("grillz→open-mouth-reroll");
      }
    }
  }

  // 5. Opaque eyewear → adjust eye direction fragment
  if (rolls.eyewear.tags.includes("opaque-eyewear")) {
    rolls.eyeDirection = {
      ...rolls.eyeDirection,
      fragment:
        "Behind opaque lenses: " +
        rolls.eyeDirection.fragment +
        " The lenses reflect the light source rather than revealing the eyes.",
    };
    fired.push("opaque-eyewear→eye-direction-adjusted");
  }

  // 6. Extreme close crop → suppress headwear fragment
  if (rolls.composition.itemId === "extreme-close-crop") {
    rolls.headwear = {
      ...rolls.headwear,
      fragment: "",
    };
    fired.push("extreme-close-crop→headwear-suppressed");
  }

  // 7. Held object → override no-hands-free poses
  if (
    rolls.prop.tags.includes("held-object") &&
    rolls.pose.tags.includes("no-hands-free")
  ) {
    const target = findItemById(POSE, "holding-prop-up");
    if (target) {
      rolls.pose = toTraitRoll("pose", target);
      fired.push("held-object→holding-pose");
    }
  }

  // 8. Silhouette lighting → suppress all wealth marker fragments except chains
  if (rolls.lighting?.tags?.includes("silhouette")) {
    const wealthCategories = ["wrist", "earrings", "rings", "grillz"];
    for (const cat of wealthCategories) {
      if (rolls[cat as TraitCategory]) {
        rolls[cat as TraitCategory] = {
          ...rolls[cat as TraitCategory],
          fragment: "",
        };
      }
    }
    fired.push("silhouette→wealth-markers-suppressed-except-chain");
  }

  // 9. Hand-budget enforcement (must run last — after all pose/prop mutations)
  {
    const pH = poseHandsUsed(rolls.pose);
    const prH = propHandsRequired(rolls.prop);

    if (pH + prH > 2) {
      const lipPullForced = fired.includes("lip-tattoo→lip-pull-pose");

      if (lipPullForced) {
        // Lip-pull is coupling-mandatory; clear the prop instead
        const nothingProp = getStagePool(PROP, stage).find((i) => i.isNothing);
        if (nothingProp) {
          rolls.prop = toTraitRoll("prop", nothingProp);
        } else {
          rolls.prop = {
            ...rolls.prop,
            itemId: "nothing",
            itemName: "Nothing",
            fragment: "",
            isNothing: true,
            tags: [],
          };
        }
        fired.push("hand-budget→prop-cleared-for-lip-pull");
      } else if (prH === 2) {
        // Two-hand prop: pose must be hands-neutral
        const neutral = findItemById(POSE, "three-quarter-profile");
        if (neutral) {
          rolls.pose = toTraitRoll("pose", neutral);
          fired.push("hand-budget→pose-neutralized-for-two-hand-prop");
        }
      } else {
        // One-hand prop + two-hand pose: free one hand via holding pose
        const holding = findItemById(POSE, "holding-prop-up");
        if (holding) {
          rolls.pose = toTraitRoll("pose", holding);
          fired.push("hand-budget→pose-to-holding-for-one-hand-prop");
        }
      }
    }
  }

  return fired;
}

// ── Exported for testing ────────────────────────────────────────────────────

export { TWO_HAND_PROPS, POSE_HANDS, propHandsRequired, poseHandsUsed };

// ── Main export ─────────────────────────────────────────────────────────────

export function rollTraits(
  stage: StageNumber,
  seed?: string,
): {
  rolls: Record<TraitCategory, TraitRoll>;
  seed: string;
  couplingsFired: string[];
} {
  const actualSeed = seed ?? crypto.randomUUID();
  const rand = mulberry32(hashString(actualSeed));

  // Roll every category in fixed order (matching ALL_CATEGORIES)
  const rolls = {} as Record<TraitCategory, TraitRoll>;

  for (const category of ALL_CATEGORIES) {
    const pool = getStagePool(category, stage);
    if (pool.length === 0) {
      // Should not happen with well-formed data, but guard anyway.
      // Create a "nothing" roll as a safe fallback.
      rolls[category.id] = {
        category: category.id,
        itemId: "nothing",
        itemName: "Nothing",
        rarity: "Common",
        fragment: "",
        isNothing: true,
        tags: [],
      };
      continue;
    }

    const isMood = category.type === "mood";
    const selected = weightedSelect(pool, stage, isMood, rand);
    rolls[category.id] = toTraitRoll(category.id, selected);
  }

  // Resolve couplings (mutates rolls in-place)
  const couplingsFired = resolveCouplings(rolls, stage, rand);

  return { rolls, seed: actualSeed, couplingsFired };
}
