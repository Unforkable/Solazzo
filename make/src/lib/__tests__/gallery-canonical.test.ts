import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { canonicalizeBySlot, GalleryEntry } from "../gallery-store";

function makeEntry(overrides: Partial<GalleryEntry> = {}): GalleryEntry {
  return {
    id: crypto.randomUUID().slice(0, 8),
    portraits: ["https://blob.example/stage-1.jpg"],
    publishedAt: Date.now(),
    ...overrides,
  };
}

describe("canonicalizeBySlot", () => {
  it("picks entry with claimTxSig+wallet over one without", () => {
    const strong = makeEntry({
      id: "strong",
      slot: 0,
      claimTxSig: "tx1",
      wallet: "w1",
      publishedAt: 100,
    });
    const weak = makeEntry({
      id: "weak",
      slot: 0,
      publishedAt: 200, // newer but no on-chain proof
    });
    const { canonical } = canonicalizeBySlot([weak, strong]);
    assert.equal(canonical.length, 1);
    assert.equal(canonical[0].id, "strong");
  });

  it("picks claimTxSig-only over bare entry", () => {
    const mid = makeEntry({
      id: "mid",
      slot: 5,
      claimTxSig: "tx2",
      publishedAt: 100,
    });
    const bare = makeEntry({
      id: "bare",
      slot: 5,
      publishedAt: 200,
    });
    const { canonical } = canonicalizeBySlot([bare, mid]);
    assert.equal(canonical.length, 1);
    assert.equal(canonical[0].id, "mid");
  });

  it("same confidence tier: newest wins", () => {
    const older = makeEntry({
      id: "older",
      slot: 3,
      claimTxSig: "txA",
      wallet: "w1",
      publishedAt: 100,
    });
    const newer = makeEntry({
      id: "newer",
      slot: 3,
      claimTxSig: "txB",
      wallet: "w2",
      publishedAt: 200,
    });
    const { canonical } = canonicalizeBySlot([older, newer]);
    assert.equal(canonical.length, 1);
    assert.equal(canonical[0].id, "newer");
  });

  it("deterministic tiebreak by lexical id", () => {
    const ts = Date.now();
    const a = makeEntry({
      id: "aaa",
      slot: 7,
      claimTxSig: "txX",
      wallet: "w1",
      publishedAt: ts,
    });
    const b = makeEntry({
      id: "bbb",
      slot: 7,
      claimTxSig: "txY",
      wallet: "w2",
      publishedAt: ts,
    });
    // Regardless of input order, "aaa" < "bbb" lexically → aaa wins
    const { canonical: r1 } = canonicalizeBySlot([a, b]);
    const { canonical: r2 } = canonicalizeBySlot([b, a]);
    assert.equal(r1[0].id, "aaa");
    assert.equal(r2[0].id, "aaa");
  });

  it("legacy entries (no slot) excluded from canonical", () => {
    const slotted = makeEntry({ id: "has-slot", slot: 1 });
    const noSlot = makeEntry({ id: "no-slot" }); // no slot field
    const { canonical, legacy } = canonicalizeBySlot([slotted, noSlot]);
    assert.equal(canonical.length, 1);
    assert.equal(canonical[0].id, "has-slot");
    assert.equal(legacy.length, 1);
    assert.equal(legacy[0].id, "no-slot");
  });

  it("legacy entries included in legacy array", () => {
    const a = makeEntry({ id: "leg1" });
    const b = makeEntry({ id: "leg2" });
    const { canonical, legacy } = canonicalizeBySlot([a, b]);
    assert.equal(canonical.length, 0);
    assert.equal(legacy.length, 2);
  });

  it("different slots produce separate canonical entries", () => {
    const s0 = makeEntry({ id: "s0", slot: 0 });
    const s1 = makeEntry({ id: "s1", slot: 1 });
    const s2 = makeEntry({ id: "s2", slot: 2 });
    const { canonical } = canonicalizeBySlot([s0, s1, s2]);
    assert.equal(canonical.length, 3);
  });

  it("empty input returns empty", () => {
    const { canonical, legacy } = canonicalizeBySlot([]);
    assert.equal(canonical.length, 0);
    assert.equal(legacy.length, 0);
  });

  it("canonical output is sorted by publishedAt descending", () => {
    const old = makeEntry({ id: "old", slot: 10, publishedAt: 100 });
    const mid = makeEntry({ id: "mid", slot: 20, publishedAt: 200 });
    const fresh = makeEntry({ id: "fresh", slot: 30, publishedAt: 300 });
    const { canonical } = canonicalizeBySlot([old, fresh, mid]);
    assert.deepEqual(
      canonical.map((e) => e.id),
      ["fresh", "mid", "old"],
    );
  });
});
