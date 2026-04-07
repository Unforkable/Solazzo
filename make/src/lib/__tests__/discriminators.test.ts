import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { DISCRIMINATORS } from "../onchain/client";

/**
 * Recompute an Anchor discriminator from its hash prefix string.
 * Anchor convention: first 8 bytes of sha256("<prefix>").
 *   - Accounts:     "account:<StructName>"
 *   - Instructions: "global:<snake_case_fn>"
 */
function anchorDiscriminator(prefix: string): Buffer {
  return createHash("sha256").update(prefix).digest().subarray(0, 8);
}

describe("Anchor discriminator integrity", () => {
  for (const [prefix, expected] of Object.entries(DISCRIMINATORS)) {
    it(`${prefix} matches sha256("${prefix}")[0..8]`, () => {
      const computed = anchorDiscriminator(prefix);
      assert.deepStrictEqual(
        [...computed],
        [...expected],
        `Discriminator mismatch for "${prefix}": ` +
          `expected [${[...expected]}], computed [${[...computed]}]`,
      );
    });
  }
});
