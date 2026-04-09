import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  rollTraits,
  TWO_HAND_PROPS,
  POSE_HANDS,
  propHandsRequired,
  poseHandsUsed,
} from "../traits/roller";
import { POSE, PROP } from "../traits/data";
import type { TraitRoll, TraitCategory, StageNumber } from "../traits/types";

// ── Helpers ────────────────────────────────────────────────────────

function makeRoll(
  category: TraitCategory,
  itemId: string,
  overrides: Partial<TraitRoll> = {},
): TraitRoll {
  return {
    category,
    itemId,
    itemName: itemId,
    rarity: "Common",
    fragment: "",
    isNothing: false,
    tags: [],
    ...overrides,
  };
}

/** Brute-force: roll many seeds and assert hand budget never exceeds 2. */
function assertHandBudgetAllSeeds(stage: StageNumber, count: number) {
  for (let i = 0; i < count; i++) {
    const seed = `hand-budget-fuzz-${stage}-${i}`;
    const { rolls } = rollTraits(stage, seed);
    const pH = poseHandsUsed(rolls.pose);
    const prH = propHandsRequired(rolls.prop);
    assert.ok(
      pH + prH <= 2,
      `Seed "${seed}" stage ${stage}: pose "${rolls.pose.itemId}" (${pH}h) + prop "${rolls.prop.itemId}" (${prH}h) = ${pH + prH} hands`,
    );
  }
}

// ── Classification tests ───────────────────────────────────────────

describe("hand-budget classification", () => {
  it("TWO_HAND_PROPS covers all known two-hand prop IDs", () => {
    const expected = [
      "goose-i",
      "white-rabbit",
      "instant-ramen-cup",
      "magic-8-ball",
      "whole-pineapple",
      "lobster-iv",
      "faberge-egg",
      "koi-fish",
    ];
    for (const id of expected) {
      assert.ok(TWO_HAND_PROPS.has(id), `Missing: ${id}`);
    }
  });

  it("POSE_HANDS covers every pose item in data.ts", () => {
    for (const item of POSE.items) {
      assert.ok(
        item.id in POSE_HANDS,
        `Pose "${item.id}" missing from POSE_HANDS map`,
      );
    }
  });

  it("propHandsRequired returns correct values", () => {
    assert.equal(propHandsRequired(makeRoll("prop", "nothing", { isNothing: true })), 0);
    assert.equal(propHandsRequired(makeRoll("prop", "flip-phone", { tags: ["held-object"] })), 1);
    assert.equal(propHandsRequired(makeRoll("prop", "goose-i", { tags: ["held-object", "animal-prop"] })), 2);
    assert.equal(propHandsRequired(makeRoll("prop", "shiba-inu")), 0); // no held-object tag
  });

  it("poseHandsUsed returns correct values", () => {
    assert.equal(poseHandsUsed(makeRoll("pose", "three-quarter-profile")), 0);
    assert.equal(poseHandsUsed(makeRoll("pose", "hand-touching-face")), 1);
    assert.equal(poseHandsUsed(makeRoll("pose", "pulling-down-lower-lip")), 1);
    assert.equal(poseHandsUsed(makeRoll("pose", "arms-crossed")), 2);
    assert.equal(poseHandsUsed(makeRoll("pose", "hands-in-pockets")), 2);
  });
});

// ── Conflict resolution tests ──────────────────────────────────────

describe("hand-budget conflict resolution", () => {
  it("one-hand pose + two-hand prop → pose neutralized", () => {
    // Find a seed that rolls hand-touching-face + goose-i, or force it
    // by testing the coupling output on a known-conflicting state.
    // We test via rollTraits by scanning seeds.
    // Instead, we test indirectly: any seed where a two-hand prop appears
    // must have a 0-hand pose after resolution.
    for (let i = 0; i < 500; i++) {
      const seed = `two-hand-prop-test-${i}`;
      const { rolls, couplingsFired } = rollTraits(1, seed);
      if (TWO_HAND_PROPS.has(rolls.prop.itemId)) {
        const pH = poseHandsUsed(rolls.pose);
        assert.equal(pH, 0,
          `Seed "${seed}": two-hand prop "${rolls.prop.itemId}" with pose "${rolls.pose.itemId}" (${pH} hands)`,
        );
        return; // found and verified
      }
    }
    // Two-hand props are rare at stage 1; if none found in 500 seeds, skip
    console.log("  (no two-hand prop rolled in 500 seeds — skipping)");
  });

  it("lip-pull pose + two-hand prop → prop cleared", () => {
    // Lip-tattoo forces lip-pull. If a two-hand prop also rolled,
    // the prop must be cleared.
    for (let i = 0; i < 500; i++) {
      const seed = `lip-pull-two-hand-${i}`;
      const { rolls, couplingsFired } = rollTraits(1, seed);
      if (
        couplingsFired.includes("lip-tattoo→lip-pull-pose") &&
        couplingsFired.includes("hand-budget→prop-cleared-for-lip-pull")
      ) {
        assert.equal(rolls.pose.itemId, "pulling-down-lower-lip");
        assert.ok(rolls.prop.isNothing, "Prop should be nothing when lip-pull wins");
        return; // found and verified
      }
    }
    // This combo is very rare (lip-tattoo is legendary + two-hand prop);
    // test the invariant via fuzz instead
    console.log("  (lip-pull + two-hand combo not found — covered by fuzz)");
  });

  it("no-hands-free pose + held-object prop → resolved to ≤2 hands", () => {
    for (let i = 0; i < 500; i++) {
      const seed = `no-hands-free-held-${i}`;
      const { rolls } = rollTraits(1, seed);
      if (rolls.prop.tags.includes("held-object") && !rolls.prop.isNothing) {
        const pH = poseHandsUsed(rolls.pose);
        const prH = propHandsRequired(rolls.prop);
        assert.ok(
          pH + prH <= 2,
          `Seed "${seed}": "${rolls.pose.itemId}" (${pH}h) + "${rolls.prop.itemId}" (${prH}h) = ${pH + prH}`,
        );
      }
    }
  });

  it("non-conflicting rolls remain unchanged", () => {
    // A neutral pose + one-hand prop should NOT trigger hand-budget coupling
    for (let i = 0; i < 200; i++) {
      const seed = `no-conflict-${i}`;
      const { rolls, couplingsFired } = rollTraits(3, seed);
      if (
        poseHandsUsed(rolls.pose) === 0 &&
        propHandsRequired(rolls.prop) === 1
      ) {
        const handBudgetRules = couplingsFired.filter((r) =>
          r.startsWith("hand-budget→"),
        );
        assert.equal(
          handBudgetRules.length,
          0,
          `Seed "${seed}": hand-budget fired unnecessarily: ${handBudgetRules}`,
        );
        return; // found and verified
      }
    }
    console.log("  (no 0-hand pose + 1-hand prop found — covered by fuzz)");
  });
});

// ── Fuzz: global invariant ─────────────────────────────────────────

describe("hand-budget fuzz (all stages)", () => {
  for (const stage of [1, 2, 3, 4, 5] as StageNumber[]) {
    it(`stage ${stage}: 1000 seeds never exceed 2 hands`, () => {
      assertHandBudgetAllSeeds(stage, 1000);
    });
  }
});
