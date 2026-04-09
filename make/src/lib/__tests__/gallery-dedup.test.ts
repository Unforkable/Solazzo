import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { deduplicateEntries, GalleryEntry } from "../gallery-store";

function makeEntry(overrides: Partial<GalleryEntry> = {}): GalleryEntry {
  return {
    id: crypto.randomUUID().slice(0, 8),
    portraits: ["https://blob.example/stage-1.jpg"],
    publishedAt: Date.now(),
    ...overrides,
  };
}

describe("gallery deduplication", () => {
  it("removes exact duplicate claimTxSig entries, keeps first", () => {
    const a = makeEntry({ id: "aaa", claimTxSig: "tx123", publishedAt: 200 });
    const b = makeEntry({ id: "bbb", claimTxSig: "tx123", publishedAt: 100 });
    const result = deduplicateEntries([a, b]);
    assert.equal(result.length, 1);
    assert.equal(result[0].id, "aaa"); // first in input order
  });

  it("removes fallback-key duplicates (wallet+slot+portrait)", () => {
    const shared = {
      wallet: "Wa11et",
      slot: 42,
      portraits: ["https://blob.example/stage-1.jpg"],
    };
    const a = makeEntry({ id: "aaa", publishedAt: 300, ...shared });
    const b = makeEntry({ id: "bbb", publishedAt: 200, ...shared });
    const result = deduplicateEntries([a, b]);
    assert.equal(result.length, 1);
    assert.equal(result[0].id, "aaa");
  });

  it("keeps entries with different claimTxSig", () => {
    const a = makeEntry({ claimTxSig: "tx111" });
    const b = makeEntry({ claimTxSig: "tx222" });
    const result = deduplicateEntries([a, b]);
    assert.equal(result.length, 2);
  });

  it("keeps entries with no dedup key (avoids false positives)", () => {
    // No claimTxSig, no wallet/slot — both should survive
    const a = makeEntry({ id: "aaa" });
    const b = makeEntry({ id: "bbb" });
    const result = deduplicateEntries([a, b]);
    assert.equal(result.length, 2);
  });

  it("handles mix of keyed and unkeyed entries", () => {
    const a = makeEntry({ id: "aaa", claimTxSig: "tx123" });
    const b = makeEntry({ id: "bbb", claimTxSig: "tx123" }); // dup of a
    const c = makeEntry({ id: "ccc" }); // no key, kept
    const d = makeEntry({ id: "ddd", claimTxSig: "tx456" }); // unique
    const result = deduplicateEntries([a, b, c, d]);
    assert.equal(result.length, 3);
    assert.deepEqual(
      result.map((e) => e.id),
      ["aaa", "ccc", "ddd"],
    );
  });

  it("claimTxSig takes precedence over fallback key", () => {
    // Same claimTxSig but different wallet — still deduped by tx
    const a = makeEntry({ id: "aaa", claimTxSig: "tx123", wallet: "w1" });
    const b = makeEntry({ id: "bbb", claimTxSig: "tx123", wallet: "w2" });
    const result = deduplicateEntries([a, b]);
    assert.equal(result.length, 1);
  });

  it("preserves input order (first encountered wins)", () => {
    const entries = [
      makeEntry({ id: "first", claimTxSig: "dup", publishedAt: 300 }),
      makeEntry({ id: "second", claimTxSig: "dup", publishedAt: 200 }),
      makeEntry({ id: "third", claimTxSig: "dup", publishedAt: 100 }),
    ];
    const result = deduplicateEntries(entries);
    assert.equal(result.length, 1);
    assert.equal(result[0].id, "first");
  });

  it("empty input returns empty", () => {
    assert.deepEqual(deduplicateEntries([]), []);
  });

  it("single entry returns itself", () => {
    const entry = makeEntry({ claimTxSig: "tx123" });
    const result = deduplicateEntries([entry]);
    assert.equal(result.length, 1);
    assert.equal(result[0].id, entry.id);
  });
});
