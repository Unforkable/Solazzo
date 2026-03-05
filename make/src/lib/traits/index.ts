import type { StageNumber, TraitManifest } from "./types";
import { rollTraits } from "./roller";
import { assemblePrompt } from "./assembler";

export type { StageNumber, TraitManifest, TraitRoll, TraitCategory } from "./types";

export function rollAndAssemble(
  stage: StageNumber,
  seed?: string,
  options?: { referenceImageCount?: number },
): TraitManifest {
  const { rolls, seed: actualSeed, couplingsFired } = rollTraits(stage, seed);
  const { prompt } = assemblePrompt(rolls, stage, options);

  return {
    stage,
    seed: actualSeed,
    rolls,
    prompt,
    couplingsFired,
  };
}
