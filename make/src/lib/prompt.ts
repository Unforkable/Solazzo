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

export const STAGE_PRICES: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "< $200",
  2: "$200–$399",
  3: "$400–$599",
  4: "$600–$799",
  5: "$800–$1,000",
};
