import { expect } from "chai";
import { SolazzoDb, formatSolHours, SlotBlockMeta } from "../src/db";
import { SolazzoEvent, eventToPayload, payloadToEvent } from "../src/decoder";
import { ingestEvents, rebuildFromRawEvents, DeepReorgError, IngestOptions } from "../src/ingest";

// ── Test helpers ──

const WALLET_A = "A".repeat(32) + "aaaa1111";
const WALLET_B = "B".repeat(32) + "bbbb2222";
const WALLET_C = "C".repeat(32) + "cccc3333";
const LAMPORTS_PER_SOL = 1_000_000_000n;

let txCounter = 0;
function fakeTxSig(): string {
  txCounter++;
  return `tx_${txCounter.toString().padStart(6, "0")}`;
}

function makeIngestItem(
  event: SolazzoEvent,
  slot: number = 100,
  blockTime?: number,
  logIndex: number = 0,
  txSig?: string
) {
  return {
    txSig: txSig ?? fakeTxSig(),
    logIndex,
    slot,
    blockTime: blockTime ?? event.ts,
    event,
  };
}

// ── Tests ──

describe("DB schema and persistence", () => {
  let db: SolazzoDb;

  beforeEach(() => {
    txCounter = 0;
    db = new SolazzoDb(":memory:");
  });
  afterEach(() => db.close());

  it("initializes with empty cursor at slot 0", () => {
    const cursor = db.getCursor();
    expect(cursor.lastSlot).to.equal(0);
    expect(cursor.updatedAt).to.equal(0);
  });

  it("updates cursor", () => {
    db.setCursor(42, 1700000000);
    const cursor = db.getCursor();
    expect(cursor.lastSlot).to.equal(42);
    expect(cursor.updatedAt).to.equal(1700000000);
  });

  it("inserts raw event and rejects duplicate", () => {
    const event = {
      txSig: "abc123",
      logIndex: 0,
      slot: 100,
      blockTime: 1700000000,
      eventType: "SlotClaimed",
      payload: { slotId: 0 },
    };
    expect(db.insertRawEvent(event)).to.equal(true);
    expect(db.insertRawEvent(event)).to.equal(false); // duplicate
    expect(db.getRawEventCount()).to.equal(1);
  });

  it("opens and closes an interval with correct points", () => {
    db.openInterval({
      slotId: 0,
      owner: WALLET_A,
      lockLamports: 2n * LAMPORTS_PER_SOL,
      startTs: 1000,
      sourceTx: "tx_open",
    });

    const open = db.getOpenIntervals();
    expect(open).to.have.length(1);
    expect(open[0].owner).to.equal(WALLET_A);
    expect(open[0].lockLamports).to.equal(2n * LAMPORTS_PER_SOL);

    const closed = db.closeInterval(0, 2000, "tx_close");
    expect(closed).to.not.be.null;
    expect(closed!.pointsLampsec).to.equal(2n * LAMPORTS_PER_SOL * 1000n);
    expect(closed!.endTs).to.equal(2000);

    expect(db.getOpenIntervals()).to.have.length(0);
  });

  it("closeAllIntervals closes everything", () => {
    db.openInterval({ slotId: 0, owner: WALLET_A, lockLamports: LAMPORTS_PER_SOL, startTs: 1000, sourceTx: "tx1" });
    db.openInterval({ slotId: 1, owner: WALLET_B, lockLamports: 2n * LAMPORTS_PER_SOL, startTs: 1000, sourceTx: "tx2" });

    const closed = db.closeAllIntervals(2000, "tx_settle");
    expect(closed).to.have.length(2);
    expect(db.getOpenIntervals()).to.have.length(0);

    // Wallet A: 1 SOL * 1000s = 1e12
    const a = closed.find((c) => c.owner === WALLET_A)!;
    expect(a.pointsLampsec).to.equal(LAMPORTS_PER_SOL * 1000n);

    // Wallet B: 2 SOL * 1000s = 2e12
    const b = closed.find((c) => c.owner === WALLET_B)!;
    expect(b.pointsLampsec).to.equal(2n * LAMPORTS_PER_SOL * 1000n);
  });
});

describe("Event-to-interval transitions", () => {
  let db: SolazzoDb;

  beforeEach(() => {
    txCounter = 0;
    db = new SolazzoDb(":memory:");
  });
  afterEach(() => db.close());

  it("SlotClaimed opens an interval", () => {
    const event: SolazzoEvent = {
      type: "SlotClaimed",
      slotId: 5,
      owner: WALLET_A,
      lockLamports: 3n * LAMPORTS_PER_SOL,
      ts: 1000,
    };
    const result = ingestEvents(db, [makeIngestItem(event)]);
    expect(result.eventsIngested).to.equal(1);
    expect(result.intervalsOpened).to.equal(1);

    const intervals = db.getOpenIntervals();
    expect(intervals).to.have.length(1);
    expect(intervals[0].slotId).to.equal(5);
    expect(intervals[0].owner).to.equal(WALLET_A);
    expect(intervals[0].lockLamports).to.equal(3n * LAMPORTS_PER_SOL);
  });

  it("SlotDisplaced closes old and opens new interval", () => {
    // First: claim slot 0
    const claim: SolazzoEvent = {
      type: "SlotClaimed",
      slotId: 0,
      owner: WALLET_A,
      lockLamports: LAMPORTS_PER_SOL,
      ts: 1000,
    };
    ingestEvents(db, [makeIngestItem(claim, 100)]);

    // Then: displace at ts=2000
    const displace: SolazzoEvent = {
      type: "SlotDisplaced",
      slotId: 0,
      oldOwner: WALLET_A,
      newOwner: WALLET_B,
      oldLockLamports: LAMPORTS_PER_SOL,
      newLockLamports: 2n * LAMPORTS_PER_SOL,
      feeLamports: LAMPORTS_PER_SOL / 10n,
      ts: 2000,
    };
    const result = ingestEvents(db, [makeIngestItem(displace, 200)]);
    expect(result.intervalsClosed).to.equal(1);
    expect(result.intervalsOpened).to.equal(1);

    const all = db.getAllIntervals();
    expect(all).to.have.length(2);

    // Old interval: closed with correct points
    const oldInterval = all.find((i) => i.owner === WALLET_A)!;
    expect(oldInterval.endTs).to.equal(2000);
    expect(oldInterval.pointsLampsec).to.equal(LAMPORTS_PER_SOL * 1000n);

    // New interval: open
    const newInterval = all.find((i) => i.owner === WALLET_B)!;
    expect(newInterval.endTs).to.be.null;
    expect(newInterval.lockLamports).to.equal(2n * LAMPORTS_PER_SOL);
  });

  it("Settled closes all open intervals", () => {
    // Claim two slots
    ingestEvents(db, [
      makeIngestItem({
        type: "SlotClaimed",
        slotId: 0,
        owner: WALLET_A,
        lockLamports: LAMPORTS_PER_SOL,
        ts: 1000,
      }, 100),
      makeIngestItem({
        type: "SlotClaimed",
        slotId: 1,
        owner: WALLET_B,
        lockLamports: 2n * LAMPORTS_PER_SOL,
        ts: 1000,
      }, 100, undefined, 1),
    ]);

    // Settle at ts=5000
    const result = ingestEvents(db, [
      makeIngestItem({
        type: "Settled",
        ts: 5000,
      }, 500),
    ]);
    expect(result.intervalsClosed).to.equal(2);

    const all = db.getAllIntervals();
    expect(all.every((i) => i.endTs === 5000)).to.equal(true);

    // A: 1 SOL * 4000s = 4e12 lampsec
    const a = all.find((i) => i.owner === WALLET_A)!;
    expect(a.pointsLampsec).to.equal(LAMPORTS_PER_SOL * 4000n);

    // B: 2 SOL * 4000s = 8e12 lampsec
    const b = all.find((i) => i.owner === WALLET_B)!;
    expect(b.pointsLampsec).to.equal(2n * LAMPORTS_PER_SOL * 4000n);
  });

  it("non-interval events (ClaimCredited, Claimed, etc.) stored but don't create intervals", () => {
    const events = [
      makeIngestItem({
        type: "ClaimCredited",
        owner: WALLET_A,
        amountLamports: LAMPORTS_PER_SOL,
        ts: 1000,
      }, 100, undefined, 0),
      makeIngestItem({
        type: "Claimed",
        owner: WALLET_A,
        amountLamports: LAMPORTS_PER_SOL,
        ts: 1000,
      }, 100, undefined, 1),
      makeIngestItem({
        type: "SettlementWindowStarted",
        ts: 1000,
      }, 100, undefined, 2),
      makeIngestItem({
        type: "SettlementWindowReset",
        ts: 2000,
      }, 200, undefined, 0),
    ];
    const result = ingestEvents(db, events);
    expect(result.eventsIngested).to.equal(4);
    expect(result.intervalsOpened).to.equal(0);
    expect(result.intervalsClosed).to.equal(0);
    expect(db.getRawEventCount()).to.equal(4);
  });
});

describe("Points computation", () => {
  let db: SolazzoDb;

  beforeEach(() => {
    txCounter = 0;
    db = new SolazzoDb(":memory:");
  });
  afterEach(() => db.close());

  it("computes correct points for single holder", () => {
    ingestEvents(db, [
      makeIngestItem({
        type: "SlotClaimed",
        slotId: 0,
        owner: WALLET_A,
        lockLamports: 5n * LAMPORTS_PER_SOL,
        ts: 1000,
      }),
    ]);

    // At t=4600 (3600s later = 1 hour), 5 SOL * 3600s = 18e12 lampsec = 5.00 SOL-hours
    const board = db.getLeaderboard(10, 4600);
    expect(board).to.have.length(1);
    expect(board[0].wallet).to.equal(WALLET_A);
    // 5 SOL * 3600s = 5 * 1e9 * 3600 = 18e12 lampsec
    expect(board[0].combinedLampsec).to.equal(5n * LAMPORTS_PER_SOL * 3600n);
    expect(board[0].solHours).to.equal("5.00");
  });

  it("accumulates points across multiple intervals for same wallet", () => {
    // Wallet A claims slot 0 at t=1000, displaced at t=2000
    ingestEvents(db, [
      makeIngestItem({
        type: "SlotClaimed",
        slotId: 0,
        owner: WALLET_A,
        lockLamports: LAMPORTS_PER_SOL,
        ts: 1000,
      }, 100),
    ]);
    ingestEvents(db, [
      makeIngestItem({
        type: "SlotDisplaced",
        slotId: 0,
        oldOwner: WALLET_A,
        newOwner: WALLET_B,
        oldLockLamports: LAMPORTS_PER_SOL,
        newLockLamports: 2n * LAMPORTS_PER_SOL,
        feeLamports: LAMPORTS_PER_SOL / 10n,
        ts: 2000,
      }, 200),
    ]);

    // Wallet A claims slot 1 at t=3000
    ingestEvents(db, [
      makeIngestItem({
        type: "SlotClaimed",
        slotId: 1,
        owner: WALLET_A,
        lockLamports: 3n * LAMPORTS_PER_SOL,
        ts: 3000,
      }, 300),
    ]);

    // At t=5000:
    // A closed: 1 SOL * 1000s = 1e12
    // A active: 3 SOL * 2000s = 6e12
    // Total A: 7e12
    // B active: 2 SOL * 3000s = 6e12
    const board = db.getLeaderboard(10, 5000);
    expect(board).to.have.length(2);

    const entryA = board.find((e) => e.wallet === WALLET_A)!;
    const entryB = board.find((e) => e.wallet === WALLET_B)!;

    expect(entryA.combinedLampsec).to.equal(7n * LAMPORTS_PER_SOL * 1000n);
    expect(entryB.combinedLampsec).to.equal(6n * LAMPORTS_PER_SOL * 1000n);

    // A should rank higher
    expect(entryA.rank).to.equal(1);
    expect(entryB.rank).to.equal(2);
  });

  it("points = 0 for zero-duration interval (claim and immediate displace)", () => {
    ingestEvents(db, [
      makeIngestItem({
        type: "SlotClaimed",
        slotId: 0,
        owner: WALLET_A,
        lockLamports: LAMPORTS_PER_SOL,
        ts: 1000,
      }, 100, undefined, 0),
      makeIngestItem({
        type: "SlotDisplaced",
        slotId: 0,
        oldOwner: WALLET_A,
        newOwner: WALLET_B,
        oldLockLamports: LAMPORTS_PER_SOL,
        newLockLamports: 2n * LAMPORTS_PER_SOL,
        feeLamports: LAMPORTS_PER_SOL / 10n,
        ts: 1000, // same timestamp
      }, 100, undefined, 1),
    ]);

    const all = db.getAllIntervals();
    const aInterval = all.find((i) => i.owner === WALLET_A)!;
    expect(aInterval.pointsLampsec).to.equal(0n);
  });
});

describe("Idempotency", () => {
  let db: SolazzoDb;

  beforeEach(() => {
    txCounter = 0;
    db = new SolazzoDb(":memory:");
  });
  afterEach(() => db.close());

  it("ingesting the same event twice doesn't change totals", () => {
    const tx = "fixed_tx_sig_001";
    const event: SolazzoEvent = {
      type: "SlotClaimed",
      slotId: 0,
      owner: WALLET_A,
      lockLamports: LAMPORTS_PER_SOL,
      ts: 1000,
    };
    const item = makeIngestItem(event, 100, 1000, 0, tx);

    // First ingestion
    const r1 = ingestEvents(db, [item]);
    expect(r1.eventsIngested).to.equal(1);
    expect(r1.eventsDuplicate).to.equal(0);
    expect(r1.intervalsOpened).to.equal(1);

    // Second ingestion — same tx sig + log index
    const r2 = ingestEvents(db, [item]);
    expect(r2.eventsIngested).to.equal(0);
    expect(r2.eventsDuplicate).to.equal(1);
    expect(r2.intervalsOpened).to.equal(0);

    // DB state unchanged
    expect(db.getRawEventCount()).to.equal(1);
    expect(db.getOpenIntervals()).to.have.length(1);
  });

  it("full sequence ingested twice yields same result", () => {
    const events = [
      makeIngestItem({
        type: "SlotClaimed",
        slotId: 0,
        owner: WALLET_A,
        lockLamports: LAMPORTS_PER_SOL,
        ts: 1000,
      }, 100, undefined, 0, "tx_001"),
      makeIngestItem({
        type: "SlotClaimed",
        slotId: 1,
        owner: WALLET_B,
        lockLamports: 2n * LAMPORTS_PER_SOL,
        ts: 1500,
      }, 150, undefined, 0, "tx_002"),
      makeIngestItem({
        type: "SlotDisplaced",
        slotId: 0,
        oldOwner: WALLET_A,
        newOwner: WALLET_C,
        oldLockLamports: LAMPORTS_PER_SOL,
        newLockLamports: 3n * LAMPORTS_PER_SOL,
        feeLamports: LAMPORTS_PER_SOL / 10n,
        ts: 3000,
      }, 300, undefined, 0, "tx_003"),
    ];

    ingestEvents(db, events);
    const board1 = db.getLeaderboard(10, 5000);

    // Ingest again
    ingestEvents(db, events);
    const board2 = db.getLeaderboard(10, 5000);

    // Same results
    expect(board1.length).to.equal(board2.length);
    for (let i = 0; i < board1.length; i++) {
      expect(board1[i].wallet).to.equal(board2[i].wallet);
      expect(board1[i].combinedLampsec).to.equal(board2[i].combinedLampsec);
    }
  });
});

describe("Replay rebuild", () => {
  let db: SolazzoDb;

  beforeEach(() => {
    txCounter = 0;
    db = new SolazzoDb(":memory:");
  });
  afterEach(() => db.close());

  it("rebuild from raw events yields same totals as incremental", () => {
    const events = [
      makeIngestItem({
        type: "SlotClaimed",
        slotId: 0,
        owner: WALLET_A,
        lockLamports: LAMPORTS_PER_SOL,
        ts: 1000,
      }, 100, undefined, 0, "tx_001"),
      makeIngestItem({
        type: "SlotClaimed",
        slotId: 1,
        owner: WALLET_B,
        lockLamports: 2n * LAMPORTS_PER_SOL,
        ts: 1000,
      }, 100, undefined, 1, "tx_002"),
      makeIngestItem({
        type: "SlotDisplaced",
        slotId: 0,
        oldOwner: WALLET_A,
        newOwner: WALLET_C,
        oldLockLamports: LAMPORTS_PER_SOL,
        newLockLamports: 3n * LAMPORTS_PER_SOL,
        feeLamports: LAMPORTS_PER_SOL / 10n,
        ts: 5000,
      }, 500, undefined, 0, "tx_003"),
      makeIngestItem({
        type: "Settled",
        ts: 10000,
      }, 1000, undefined, 0, "tx_004"),
    ];

    // Incremental ingestion
    ingestEvents(db, events);
    const incrementalBoard = db.getLeaderboard(10, 10000);

    // Rebuild from raw events
    const result = rebuildFromRawEvents(db);
    const rebuildBoard = db.getLeaderboard(10, 10000);

    // Same number of entries
    expect(incrementalBoard.length).to.equal(rebuildBoard.length);

    // Same totals for each wallet
    for (const inc of incrementalBoard) {
      const reb = rebuildBoard.find((r) => r.wallet === inc.wallet)!;
      expect(reb).to.not.be.undefined;
      expect(reb.combinedLampsec).to.equal(
        inc.combinedLampsec,
        `Mismatch for wallet ${inc.wallet}`
      );
    }

    // Verify rebuild stats
    expect(result.eventsIngested).to.equal(4); // all raw events replayed
  });

  it("rebuild after partial ingestion produces correct state", () => {
    // Ingest first two events
    ingestEvents(db, [
      makeIngestItem({
        type: "SlotClaimed",
        slotId: 0,
        owner: WALLET_A,
        lockLamports: LAMPORTS_PER_SOL,
        ts: 1000,
      }, 100, undefined, 0, "tx_001"),
    ]);

    // Ingest a displace
    ingestEvents(db, [
      makeIngestItem({
        type: "SlotDisplaced",
        slotId: 0,
        oldOwner: WALLET_A,
        newOwner: WALLET_B,
        oldLockLamports: LAMPORTS_PER_SOL,
        newLockLamports: 2n * LAMPORTS_PER_SOL,
        feeLamports: LAMPORTS_PER_SOL / 10n,
        ts: 5000,
      }, 500, undefined, 0, "tx_002"),
    ]);

    // Capture state
    const before = db.getLeaderboard(10, 8000);

    // Rebuild
    rebuildFromRawEvents(db);
    const after = db.getLeaderboard(10, 8000);

    expect(before.length).to.equal(after.length);
    for (const b of before) {
      const a = after.find((x) => x.wallet === b.wallet)!;
      expect(a.combinedLampsec).to.equal(b.combinedLampsec);
    }
  });
});

describe("Event serialization round-trip", () => {
  it("eventToPayload → payloadToEvent preserves all fields", () => {
    const events: SolazzoEvent[] = [
      {
        type: "SlotClaimed",
        slotId: 42,
        owner: WALLET_A,
        lockLamports: 5n * LAMPORTS_PER_SOL,
        ts: 1700000000,
      },
      {
        type: "SlotDisplaced",
        slotId: 0,
        oldOwner: WALLET_A,
        newOwner: WALLET_B,
        oldLockLamports: LAMPORTS_PER_SOL,
        newLockLamports: 2n * LAMPORTS_PER_SOL,
        feeLamports: LAMPORTS_PER_SOL / 10n,
        ts: 1700001000,
      },
      {
        type: "Settled",
        ts: 1700010000,
      },
    ];

    for (const event of events) {
      const payload = eventToPayload(event);
      const restored = payloadToEvent(payload);
      // Compare field by field (bigints need special handling)
      expect(restored.type).to.equal(event.type);
      expect(restored.ts).to.equal(event.ts);
      if (event.type === "SlotClaimed") {
        const r = restored as typeof event;
        expect(r.slotId).to.equal(event.slotId);
        expect(r.owner).to.equal(event.owner);
        expect(r.lockLamports).to.equal(event.lockLamports);
      }
      if (event.type === "SlotDisplaced") {
        const r = restored as typeof event;
        expect(r.slotId).to.equal(event.slotId);
        expect(r.oldOwner).to.equal(event.oldOwner);
        expect(r.newOwner).to.equal(event.newOwner);
        expect(r.oldLockLamports).to.equal(event.oldLockLamports);
        expect(r.newLockLamports).to.equal(event.newLockLamports);
        expect(r.feeLamports).to.equal(event.feeLamports);
      }
    }
  });
});

describe("Reorg/finality handling", () => {
  let db: SolazzoDb;
  const CONFIRMATIONS = 5; // small window for test convenience

  beforeEach(() => {
    txCounter = 0;
    db = new SolazzoDb(":memory:");
  });
  afterEach(() => db.close());

  function blockMeta(slot: number, blockhash: string, blockTime?: number): SlotBlockMeta {
    return { slot, blockhash, blockTime, ingestedAt: 1000 };
  }

  it("no-reorg happy path with block metadata", () => {
    const blocks: SlotBlockMeta[] = [
      blockMeta(100, "hash_100", 1000),
      blockMeta(101, "hash_101", 1001),
    ];

    const result = ingestEvents(
      db,
      [
        makeIngestItem({
          type: "SlotClaimed",
          slotId: 0,
          owner: WALLET_A,
          lockLamports: LAMPORTS_PER_SOL,
          ts: 1000,
        }, 100, 1000, 0, "tx_happy_001"),
        makeIngestItem({
          type: "SlotClaimed",
          slotId: 1,
          owner: WALLET_B,
          lockLamports: 2n * LAMPORTS_PER_SOL,
          ts: 1001,
        }, 101, 1001, 0, "tx_happy_002"),
      ],
      { blocks, confirmations: CONFIRMATIONS }
    );

    expect(result.reorgDetected).to.equal(false);
    expect(result.slotsRolledBack).to.equal(0);
    expect(result.eventsIngested).to.equal(2);

    // Block metadata stored
    expect(db.getSlotBlock(100)?.blockhash).to.equal("hash_100");
    expect(db.getSlotBlock(101)?.blockhash).to.equal("hash_101");
    expect(db.getSlotBlockCount()).to.equal(2);

    // Intervals correct
    const board = db.getLeaderboard(10, 2000);
    expect(board).to.have.length(2);
  });

  it("reorg inside confirmation window: detect, rollback, replay", () => {
    // ── Chain A: slot 100 claim, slot 101 displace ──
    ingestEvents(
      db,
      [
        makeIngestItem({
          type: "SlotClaimed",
          slotId: 0,
          owner: WALLET_A,
          lockLamports: LAMPORTS_PER_SOL,
          ts: 1000,
        }, 100, 1000, 0, "tx_a_001"),
      ],
      { blocks: [blockMeta(100, "hash_100", 1000)], confirmations: CONFIRMATIONS }
    );

    ingestEvents(
      db,
      [
        makeIngestItem({
          type: "SlotDisplaced",
          slotId: 0,
          oldOwner: WALLET_A,
          newOwner: WALLET_B,
          oldLockLamports: LAMPORTS_PER_SOL,
          newLockLamports: 2n * LAMPORTS_PER_SOL,
          feeLamports: LAMPORTS_PER_SOL / 10n,
          ts: 2000,
        }, 101, 2000, 0, "tx_a_002"),
      ],
      { blocks: [blockMeta(101, "hash_101_A", 2000)], confirmations: CONFIRMATIONS }
    );

    // Verify chain A state: A displaced, B holds slot 0
    expect(db.getRawEventCount()).to.equal(2);
    expect(db.getAllIntervals()).to.have.length(2);

    // ── Chain B: reorg at slot 101 — different blockhash, different event ──
    const result = ingestEvents(
      db,
      [
        makeIngestItem({
          type: "SlotClaimed",
          slotId: 1,
          owner: WALLET_C,
          lockLamports: 3n * LAMPORTS_PER_SOL,
          ts: 2000,
        }, 101, 2000, 0, "tx_b_001"),
      ],
      { blocks: [blockMeta(101, "hash_101_B", 2000)], confirmations: CONFIRMATIONS }
    );

    expect(result.reorgDetected).to.equal(true);
    expect(result.slotsRolledBack).to.be.greaterThan(0);
    expect(result.eventsIngested).to.equal(1);

    // After reorg:
    // - slot 100 events preserved (not rolled back)
    // - slot 101 old events deleted, new event ingested
    // - Wallet A still holds slot 0 (from slot 100)
    // - Wallet C now holds slot 1 (from new slot 101)
    // - Wallet B has nothing (displacement was on old fork)
    expect(db.getRawEventCount()).to.equal(2); // 1 from slot 100 + 1 new from slot 101

    const intervals = db.getOpenIntervals();
    expect(intervals).to.have.length(2);
    const owners = intervals.map((i) => i.owner).sort();
    expect(owners).to.deep.equal([WALLET_A, WALLET_C]);

    // Leaderboard at t=3000: A has 1 SOL * 2000s, C has 3 SOL * 1000s
    const board = db.getLeaderboard(10, 3000);
    const entryA = board.find((e) => e.wallet === WALLET_A)!;
    const entryC = board.find((e) => e.wallet === WALLET_C)!;
    expect(entryA.combinedLampsec).to.equal(LAMPORTS_PER_SOL * 2000n);
    expect(entryC.combinedLampsec).to.equal(3n * LAMPORTS_PER_SOL * 1000n);

    // Block metadata updated
    expect(db.getSlotBlock(101)?.blockhash).to.equal("hash_101_B");
  });

  it("deep finalized reorg throws DeepReorgError with zero side effects", () => {
    // Ingest enough slots to push slot 100 below finality boundary
    // With confirmations=5, we need latest slot > 105 to make 100 finalized
    const blocks: SlotBlockMeta[] = [];
    for (let s = 100; s <= 110; s++) {
      blocks.push(blockMeta(s, `hash_${s}`, 1000 + s));
    }
    ingestEvents(
      db,
      [
        makeIngestItem({
          type: "SlotClaimed",
          slotId: 0,
          owner: WALLET_A,
          lockLamports: LAMPORTS_PER_SOL,
          ts: 1000,
        }, 100, 1000, 0, "tx_deep_001"),
      ],
      { blocks, confirmations: CONFIRMATIONS }
    );

    // Snapshot DB state before rejected attempt
    const eventCountBefore = db.getRawEventCount();
    const blockCountBefore = db.getSlotBlockCount();
    const cursorBefore = db.getCursor();

    // Finalized boundary: 110 - 5 = 105. Slot 100 <= 105 → finalized.
    expect(db.getFinalizedBoundary(CONFIRMATIONS)).to.equal(105);

    // Attempt reorg at finalized slot 100 → should throw
    expect(() => {
      ingestEvents(
        db,
        [
          makeIngestItem({
            type: "SlotClaimed",
            slotId: 1,
            owner: WALLET_B,
            lockLamports: LAMPORTS_PER_SOL,
            ts: 1100,
          }, 100, 1100, 0, "tx_deep_002"),
        ],
        { blocks: [blockMeta(100, "DIFFERENT_HASH", 1100)], confirmations: CONFIRMATIONS }
      );
    }).to.throw(DeepReorgError);

    // ZERO side effects — every table unchanged
    expect(db.getRawEventCount()).to.equal(eventCountBefore);
    expect(db.getSlotBlockCount()).to.equal(blockCountBefore);
    expect(db.getCursor().lastSlot).to.equal(cursorBefore.lastSlot);
    expect(db.getSlotBlock(100)?.blockhash).to.equal("hash_100");
  });

  it("effective tip from incoming batch prevents stale finality boundary", () => {
    // Persisted state: only slots 100-102 (tip = 102)
    // Under persisted-only boundary: 102 - 5 = 97. Slot 100 > 97 → NOT finalized (wrong!)
    for (let s = 100; s <= 102; s++) {
      ingestEvents(
        db,
        [
          makeIngestItem({
            type: "SlotClaimed",
            slotId: s - 100,
            owner: WALLET_A,
            lockLamports: LAMPORTS_PER_SOL,
            ts: 1000 + s,
          }, s, 1000 + s, 0, `tx_etip_${s}`),
        ],
        { blocks: [blockMeta(s, `hash_${s}`, 1000 + s)], confirmations: CONFIRMATIONS }
      );
    }
    expect(db.getLatestSlotBlock()?.slot).to.equal(102);

    // Snapshot before
    const eventCountBefore = db.getRawEventCount();
    const blockCountBefore = db.getSlotBlockCount();

    // Incoming batch: slot 100 (DIFFERENT hash) + slot 200 (new, pushes effective tip to 200)
    // Effective tip = max(102, 200) = 200. Boundary = 200 - 5 = 195.
    // Slot 100 <= 195 → finalized under effective tip → DeepReorgError
    expect(() => {
      ingestEvents(
        db,
        [
          makeIngestItem({
            type: "SlotClaimed",
            slotId: 5,
            owner: WALLET_B,
            lockLamports: LAMPORTS_PER_SOL,
            ts: 2000,
          }, 200, 2000, 0, "tx_etip_new"),
        ],
        {
          blocks: [
            blockMeta(100, "DIFFERENT_HASH", 1100),
            blockMeta(200, "hash_200", 2000),
          ],
          confirmations: CONFIRMATIONS,
        }
      );
    }).to.throw(DeepReorgError);

    // Zero side effects
    expect(db.getRawEventCount()).to.equal(eventCountBefore);
    expect(db.getSlotBlockCount()).to.equal(blockCountBefore);
    expect(db.getSlotBlock(100)?.blockhash).to.equal("hash_100");
    expect(db.getSlotBlock(200)).to.be.null; // incoming block 200 was NOT persisted
  });

  it("idempotency after rollback+replay", () => {
    // Chain A
    ingestEvents(
      db,
      [
        makeIngestItem({
          type: "SlotClaimed",
          slotId: 0,
          owner: WALLET_A,
          lockLamports: LAMPORTS_PER_SOL,
          ts: 1000,
        }, 100, 1000, 0, "tx_idem_001"),
      ],
      { blocks: [blockMeta(100, "hash_100", 1000)], confirmations: CONFIRMATIONS }
    );

    ingestEvents(
      db,
      [
        makeIngestItem({
          type: "SlotClaimed",
          slotId: 1,
          owner: WALLET_B,
          lockLamports: 2n * LAMPORTS_PER_SOL,
          ts: 2000,
        }, 101, 2000, 0, "tx_idem_002_A"),
      ],
      { blocks: [blockMeta(101, "hash_101_A", 2000)], confirmations: CONFIRMATIONS }
    );

    // Reorg at 101 — new canonical chain
    const canonicalEvents = [
      makeIngestItem({
        type: "SlotClaimed",
        slotId: 2,
        owner: WALLET_C,
        lockLamports: 3n * LAMPORTS_PER_SOL,
        ts: 2000,
      }, 101, 2000, 0, "tx_idem_002_B"),
    ];
    const canonicalBlocks = [blockMeta(101, "hash_101_B", 2000)];

    ingestEvents(db, canonicalEvents, { blocks: canonicalBlocks, confirmations: CONFIRMATIONS });
    const board1 = db.getLeaderboard(10, 3000);

    // Re-ingest the same canonical data (idempotent)
    const r2 = ingestEvents(db, canonicalEvents, { blocks: canonicalBlocks, confirmations: CONFIRMATIONS });
    expect(r2.reorgDetected).to.equal(false); // same blockhash, no mismatch
    expect(r2.eventsDuplicate).to.equal(1); // event already exists

    const board2 = db.getLeaderboard(10, 3000);
    expect(board1.length).to.equal(board2.length);
    for (let i = 0; i < board1.length; i++) {
      expect(board1[i].wallet).to.equal(board2[i].wallet);
      expect(board1[i].combinedLampsec).to.equal(board2[i].combinedLampsec);
    }
  });

  it("rollbackFromSlot preserves data before fork slot", () => {
    // Ingest slots 100, 101, 102
    for (let s = 100; s <= 102; s++) {
      ingestEvents(
        db,
        [
          makeIngestItem({
            type: "SlotClaimed",
            slotId: s - 100,
            owner: WALLET_A,
            lockLamports: LAMPORTS_PER_SOL,
            ts: 1000 + (s - 100) * 100,
          }, s, 1000 + (s - 100) * 100, 0, `tx_rb_${s}`),
        ],
        { blocks: [blockMeta(s, `hash_${s}`, 1000 + (s - 100) * 100)], confirmations: CONFIRMATIONS }
      );
    }

    expect(db.getRawEventCount()).to.equal(3);
    expect(db.getSlotBlockCount()).to.equal(3);

    // Rollback from slot 101 — should preserve slot 100
    const rollback = db.rollbackFromSlot(101);
    expect(rollback.eventsDeleted).to.equal(2); // slots 101, 102
    expect(rollback.blocksDeleted).to.equal(2);

    // Slot 100 data preserved
    expect(db.getRawEventCount()).to.equal(1);
    expect(db.getSlotBlock(100)?.blockhash).to.equal("hash_100");
    expect(db.getSlotBlock(101)).to.be.null;

    // Cursor reset
    expect(db.getCursor().lastSlot).to.equal(100);
  });
});

describe("Bigint precision (>64-bit values)", () => {
  let db: SolazzoDb;

  beforeEach(() => {
    txCounter = 0;
    db = new SolazzoDb(":memory:");
  });
  afterEach(() => db.close());

  it("handles lampsec values exceeding 2^63 without truncation", () => {
    // 2^63 = 9_223_372_036_854_775_808 — SQLite INTEGER max is 2^63-1
    // Use 1000 SOL locked for 31.7 years ≈ 1e9 * 1000 * 1e9 = 1e21 lampsec
    // which is well above 2^63 ≈ 9.2e18
    const HUGE_LOCK = 1000n * LAMPORTS_PER_SOL; // 1e12 lamports = 1000 SOL
    const LONG_DURATION = 1_000_000_000; // ~31.7 years in seconds

    ingestEvents(db, [
      makeIngestItem({
        type: "SlotClaimed",
        slotId: 0,
        owner: WALLET_A,
        lockLamports: HUGE_LOCK,
        ts: 1000,
      }, 100, 1000, 0, "tx_huge_001"),
    ]);

    // Close via settlement
    ingestEvents(db, [
      makeIngestItem({
        type: "Settled",
        ts: 1000 + LONG_DURATION,
      }, 200, 1000 + LONG_DURATION, 0, "tx_huge_002"),
    ]);

    const intervals = db.getAllIntervals();
    expect(intervals).to.have.length(1);

    const expected = HUGE_LOCK * BigInt(LONG_DURATION);
    // expected = 1e12 * 1e9 = 1e21 lampsec — well above 2^63
    expect(expected > 9_223_372_036_854_775_807n).to.equal(true);
    expect(intervals[0].pointsLampsec).to.equal(expected);

    // Leaderboard should also reflect the exact value
    const board = db.getLeaderboard(10, 1000 + LONG_DURATION);
    expect(board).to.have.length(1);
    expect(board[0].combinedLampsec).to.equal(expected);
  });

  it("leaderboard correctly orders wallets with >64-bit values", () => {
    const BASE = 2n ** 64n; // 1.8e19 — already beyond SQLite INTEGER range

    // Wallet A: lock that yields BASE + 1000 lampsec
    // Wallet B: lock that yields BASE + 500 lampsec
    // Wallet C: lock that yields BASE + 2000 lampsec
    // Use 1-second duration so points = lockLamports * 1
    const LOCK_A = BASE + 1000n;
    const LOCK_B = BASE + 500n;
    const LOCK_C = BASE + 2000n;

    ingestEvents(db, [
      makeIngestItem({
        type: "SlotClaimed", slotId: 0, owner: WALLET_A,
        lockLamports: LOCK_A, ts: 1000,
      }, 100, 1000, 0, "tx_order_001"),
      makeIngestItem({
        type: "SlotClaimed", slotId: 1, owner: WALLET_B,
        lockLamports: LOCK_B, ts: 1000,
      }, 100, 1000, 1, "tx_order_002"),
      makeIngestItem({
        type: "SlotClaimed", slotId: 2, owner: WALLET_C,
        lockLamports: LOCK_C, ts: 1000,
      }, 100, 1000, 2, "tx_order_003"),
    ]);

    // Settle at t=1001 (1 second duration) → points = lockLamports * 1
    ingestEvents(db, [
      makeIngestItem({ type: "Settled", ts: 1001 }, 200, 1001, 0, "tx_order_004"),
    ]);

    const board = db.getLeaderboard(10, 1001);
    expect(board).to.have.length(3);

    // C > A > B
    expect(board[0].wallet).to.equal(WALLET_C);
    expect(board[1].wallet).to.equal(WALLET_A);
    expect(board[2].wallet).to.equal(WALLET_B);

    expect(board[0].combinedLampsec).to.equal(LOCK_C);
    expect(board[1].combinedLampsec).to.equal(LOCK_A);
    expect(board[2].combinedLampsec).to.equal(LOCK_B);
  });

  it("rebuild preserves >64-bit precision", () => {
    const HUGE_LOCK = 500n * LAMPORTS_PER_SOL;
    const DURATION = 500_000_000; // ~15.8 years

    ingestEvents(db, [
      makeIngestItem({
        type: "SlotClaimed", slotId: 0, owner: WALLET_A,
        lockLamports: HUGE_LOCK, ts: 1000,
      }, 100, 1000, 0, "tx_rb_001"),
      makeIngestItem({
        type: "Settled", ts: 1000 + DURATION,
      }, 200, 1000 + DURATION, 0, "tx_rb_002"),
    ]);

    const expected = HUGE_LOCK * BigInt(DURATION);
    expect(expected > 9_223_372_036_854_775_807n).to.equal(true);

    const beforeBoard = db.getLeaderboard(10, 1000 + DURATION);

    rebuildFromRawEvents(db);
    const afterBoard = db.getLeaderboard(10, 1000 + DURATION);

    expect(afterBoard[0].combinedLampsec).to.equal(expected);
    expect(afterBoard[0].combinedLampsec).to.equal(beforeBoard[0].combinedLampsec);
  });

  it("deterministic tie-break orders wallets alphabetically", () => {
    // Both wallets get exactly the same points
    ingestEvents(db, [
      makeIngestItem({
        type: "SlotClaimed", slotId: 0, owner: WALLET_B,
        lockLamports: LAMPORTS_PER_SOL, ts: 1000,
      }, 100, 1000, 0, "tx_tie_001"),
      makeIngestItem({
        type: "SlotClaimed", slotId: 1, owner: WALLET_A,
        lockLamports: LAMPORTS_PER_SOL, ts: 1000,
      }, 100, 1000, 1, "tx_tie_002"),
    ]);

    const board = db.getLeaderboard(10, 2000);
    expect(board).to.have.length(2);
    // A < B alphabetically, so A comes first on tie
    expect(board[0].wallet).to.equal(WALLET_A);
    expect(board[1].wallet).to.equal(WALLET_B);
    expect(board[0].combinedLampsec).to.equal(board[1].combinedLampsec);
  });
});

describe("formatSolHours", () => {
  it("converts lamport-seconds to SOL-hours", () => {
    // 1 SOL * 3600s = 3.6e12 lampsec = 1.00 SOL-hour
    const oneHour = 1_000_000_000n * 3600n;
    expect(formatSolHours(oneHour)).to.equal("1.00");

    // 10 SOL * 7200s = 72e12 = 20.00 SOL-hours
    const twenty = 10_000_000_000n * 7200n;
    expect(formatSolHours(twenty)).to.equal("20.00");

    // 0 lampsec = 0.00
    expect(formatSolHours(0n)).to.equal("0.00");
  });

  it("handles fractional SOL-hours", () => {
    // 0.5 SOL * 3600s = 1.8e12 lampsec = 0.50 SOL-hours
    const half = 500_000_000n * 3600n;
    expect(formatSolHours(half)).to.equal("0.50");
  });
});
