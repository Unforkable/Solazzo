export type { StageNumber } from "./traits/types";
export { rollAndAssemble } from "./traits";
export type { TraitManifest } from "./traits";

export const STAGE_NAMES: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "Humble Believer",
  2: "Rising Confidence",
  3: "Established Wealth",
  4: "Maximum Excess",
  5: "Reflective Maturity",
};
