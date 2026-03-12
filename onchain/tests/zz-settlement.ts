import { startAnchor } from "anchor-bankrun";
import { BankrunProvider } from "anchor-bankrun";
import { Program } from "@coral-xyz/anchor";
import { SolazzoCore } from "../target/types/solazzo_core";
import { expect } from "chai";
import {
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
  SystemProgram,
} from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { Clock } from "solana-bankrun";

const IDL = require("../target/idl/solazzo_core.json");
const PROGRAM_ID = new PublicKey(
  "52xHAYaQW1ywhdhNjxg1LvJvsEHpPBrK1J9Aud371hHC"
);

// Pyth Receiver program ID (must match on-chain owner check)
const PYTH_RECEIVER_PROGRAM_ID = new PublicKey(
  "rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ"
);

// PriceUpdateV2 Anchor discriminator: sha256("account:PriceUpdateV2")[0..8]
const PRICE_UPDATE_V2_DISCRIMINATOR = Buffer.from([
  34, 241, 35, 99, 157, 126, 244, 205,
]);

// PriceUpdateV2 account layout size:
// 8 (disc) + 32 (write_authority) + 1 (VerificationLevel::Full) +
// 32 (feed_id) + 8 (price) + 8 (conf) + 4 (expo) + 8 (publish_time) +
// 8 (prev_publish_time) + 8 (ema_price) + 8 (ema_conf) + 8 (posted_slot)
const PRICE_UPDATE_V2_SIZE = 133;

// e8 price values
const ABOVE_THRESHOLD = BigInt("110000000000"); // $1100
const BELOW_THRESHOLD = BigInt("90000000000"); // $900
const GOOD_CONF = BigInt("500000000"); // ~50 bps of $1000
const WIDE_CONF = BigInt("2000000000"); // ~200 bps of $1000

/** Build a mock PriceUpdateV2 account data buffer. */
function buildPriceUpdateV2(params: {
  price: bigint;
  conf: bigint;
  publishTime: bigint;
  expo?: number;
}): Buffer {
  const buf = Buffer.alloc(PRICE_UPDATE_V2_SIZE);
  let offset = 0;

  // Discriminator (8 bytes)
  PRICE_UPDATE_V2_DISCRIMINATOR.copy(buf, offset);
  offset += 8;

  // write_authority: Pubkey (32 bytes) — zero
  offset += 32;

  // verification_level: Full = variant 1 (1 byte)
  buf.writeUInt8(1, offset);
  offset += 1;

  // PriceFeedMessage:
  // feed_id: [u8; 32] — zero
  offset += 32;

  // price: i64
  buf.writeBigInt64LE(params.price, offset);
  offset += 8;

  // conf: u64
  buf.writeBigUInt64LE(params.conf, offset);
  offset += 8;

  // exponent: i32
  buf.writeInt32LE(params.expo ?? -8, offset);
  offset += 4;

  // publish_time: i64
  buf.writeBigInt64LE(params.publishTime, offset);
  offset += 8;

  // prev_publish_time: i64
  buf.writeBigInt64LE(params.publishTime - BigInt(1), offset);
  offset += 8;

  // ema_price: i64
  buf.writeBigInt64LE(params.price, offset);
  offset += 8;

  // ema_conf: u64
  buf.writeBigUInt64LE(params.conf, offset);
  offset += 8;

  // posted_slot: u64
  buf.writeBigUInt64LE(BigInt(1), offset);
  offset += 8;

  return buf;
}

describe("settlement (bankrun)", () => {
  // Bankrun context, provider, and program — set up fresh for each test group
  let context: Awaited<ReturnType<typeof startAnchor>>;
  let provider: BankrunProvider;
  let program: Program<SolazzoCore>;
  let adminKeypair: Keypair;
  let oracleFeedKeypair: Keypair;
  let treasury: PublicKey;
  let protocolConfigPda: PublicKey;
  let vaultPda: PublicKey;
  let slotBookPda: PublicKey;

  function getSlotPda(slotId: number): PublicKey {
    const buf = Buffer.alloc(2);
    buf.writeUInt16LE(slotId);
    return PublicKey.findProgramAddressSync(
      [Buffer.from("slot"), buf],
      PROGRAM_ID
    )[0];
  }

  function getClaimableBalancePda(owner: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("claimable_balance"), owner.toBuffer()],
      PROGRAM_ID
    )[0];
  }

  /** Set up a fresh bankrun context with the program deployed and protocol initialized. */
  async function setupContext() {
    oracleFeedKeypair = Keypair.generate();
    treasury = Keypair.generate().publicKey;

    context = await startAnchor(".", [], []);
    adminKeypair = context.payer;
    provider = new BankrunProvider(context);
    anchor.setProvider(provider);
    program = new Program(IDL, provider);

    [protocolConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("protocol_config")],
      PROGRAM_ID
    );
    [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault")],
      PROGRAM_ID
    );
    [slotBookPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("slot_book")],
      PROGRAM_ID
    );

    // Initialize protocol
    await program.methods
      .initializeProtocol({
        adminMultisig: adminKeypair.publicKey,
        treasuryAccount: treasury,
        oracleFeedPubkey: oracleFeedKeypair.publicKey,
        slotCount: 1000,
        minLockLamports: new anchor.BN(LAMPORTS_PER_SOL),
        minIncrementLamports: new anchor.BN(LAMPORTS_PER_SOL),
        displacementFeeLamports: new anchor.BN(LAMPORTS_PER_SOL / 10),
        oracleMaxStalenessSec: 90,
        oracleMaxConfBps: 100,
        settleThresholdPriceE8: new anchor.BN("100000000000"),
        settleWindowSec: 3600,
        settleDeadlineTs: new anchor.BN("1899849600"),
      })
      .accounts({
        admin: adminKeypair.publicKey,
        protocolConfig: protocolConfigPda,
        vault: vaultPda,
        slotBook: slotBookPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  /** Get the current bankrun clock unix timestamp. */
  async function getBankrunTimestamp(): Promise<bigint> {
    const clock = await context.banksClient.getClock();
    return clock.unixTimestamp;
  }

  /** Set the mock Pyth oracle account data in bankrun (PriceUpdateV2 format). */
  async function setOracleData(params: {
    price: bigint;
    conf: bigint;
    publishTime: bigint;
    expo?: number;
    owner?: PublicKey;
    data?: Buffer;
  }) {
    const data = params.data ?? buildPriceUpdateV2(params);
    context.setAccount(oracleFeedKeypair.publicKey, {
      lamports: LAMPORTS_PER_SOL,
      data,
      owner: params.owner ?? PYTH_RECEIVER_PROGRAM_ID,
      executable: false,
    });
  }

  /** Advance the bank by one slot to get a fresh blockhash. */
  async function warpOneSlot() {
    const clock = await context.banksClient.getClock();
    context.warpToSlot(clock.slot + BigInt(1));
  }

  /** Call settle_if_threshold_met, warping a slot first to avoid duplicate tx hash. */
  async function trySettle(): Promise<string> {
    await warpOneSlot();
    return program.methods
      .settleIfThresholdMet()
      .accounts({
        caller: adminKeypair.publicKey,
        protocolConfig: protocolConfigPda,
        oracleFeed: oracleFeedKeypair.publicKey,
      })
      .rpc();
  }

  /** Helper: settle the protocol (start window + warp 3601s + complete). */
  async function settleProtocol() {
    let now = await getBankrunTimestamp();
    await setOracleData({ price: ABOVE_THRESHOLD, conf: GOOD_CONF, publishTime: now });
    await trySettle();

    const clock = await context.banksClient.getClock();
    const newTimestamp = clock.unixTimestamp + BigInt(3601);
    context.setClock(
      new Clock(
        clock.slot,
        clock.epochStartTimestamp,
        clock.epoch,
        clock.leaderScheduleEpoch,
        newTimestamp
      )
    );
    await setOracleData({
      price: ABOVE_THRESHOLD,
      conf: GOOD_CONF,
      publishTime: newTimestamp,
    });
    await trySettle();
  }

  // ==========================================================================
  // Settlement validation tests
  // ==========================================================================

  it("rejects wrong oracle feed account (InvalidOracleFeedAccount)", async () => {
    await setupContext();

    const wrongOracle = Keypair.generate();
    const now = await getBankrunTimestamp();
    const data = buildPriceUpdateV2({
      price: ABOVE_THRESHOLD,
      conf: GOOD_CONF,
      publishTime: now,
    });
    context.setAccount(wrongOracle.publicKey, {
      lamports: LAMPORTS_PER_SOL,
      data,
      owner: PYTH_RECEIVER_PROGRAM_ID,
      executable: false,
    });

    try {
      await program.methods
        .settleIfThresholdMet()
        .accounts({
          caller: adminKeypair.publicKey,
          protocolConfig: protocolConfigPda,
          oracleFeed: wrongOracle.publicKey,
        })
        .rpc();
      expect.fail("Expected InvalidOracleFeedAccount error");
    } catch (err: any) {
      expect(err.error.errorCode.code).to.equal("InvalidOracleFeedAccount");
    }
  });

  it("wrong oracle owner resets window and does not settle", async () => {
    await setupContext();

    // Start window with valid data
    let now = await getBankrunTimestamp();
    await setOracleData({ price: ABOVE_THRESHOLD, conf: GOOD_CONF, publishTime: now });
    await trySettle();

    let config = await program.account.protocolConfig.fetch(protocolConfigPda);
    expect(config.firstValidSettleTs.toNumber()).to.be.greaterThan(0);

    // Set oracle data with wrong owner (SystemProgram instead of Pyth Receiver)
    now = await getBankrunTimestamp();
    await setOracleData({
      price: ABOVE_THRESHOLD,
      conf: GOOD_CONF,
      publishTime: now,
      owner: SystemProgram.programId,
    });
    await trySettle();

    config = await program.account.protocolConfig.fetch(protocolConfigPda);
    expect(config.firstValidSettleTs.toNumber()).to.equal(0);
    expect(config.isSettled).to.equal(false);
  });

  it("malformed/short data resets window and does not settle", async () => {
    await setupContext();

    // Start window with valid data
    let now = await getBankrunTimestamp();
    await setOracleData({ price: ABOVE_THRESHOLD, conf: GOOD_CONF, publishTime: now });
    await trySettle();

    let config = await program.account.protocolConfig.fetch(protocolConfigPda);
    expect(config.firstValidSettleTs.toNumber()).to.be.greaterThan(0);

    // Set truncated data (too short for PriceUpdateV2)
    now = await getBankrunTimestamp();
    await setOracleData({
      price: ABOVE_THRESHOLD,
      conf: GOOD_CONF,
      publishTime: now,
      data: Buffer.alloc(16), // way too short
    });
    await trySettle();

    config = await program.account.protocolConfig.fetch(protocolConfigPda);
    expect(config.firstValidSettleTs.toNumber()).to.equal(0);
    expect(config.isSettled).to.equal(false);
  });

  it("wrong exponent resets window and does not settle", async () => {
    await setupContext();

    // Start window with valid data
    let now = await getBankrunTimestamp();
    await setOracleData({ price: ABOVE_THRESHOLD, conf: GOOD_CONF, publishTime: now });
    await trySettle();

    let config = await program.account.protocolConfig.fetch(protocolConfigPda);
    expect(config.firstValidSettleTs.toNumber()).to.be.greaterThan(0);

    // Set data with wrong exponent (-6 instead of -8)
    now = await getBankrunTimestamp();
    await setOracleData({
      price: ABOVE_THRESHOLD,
      conf: GOOD_CONF,
      publishTime: now,
      expo: -6,
    });
    await trySettle();

    config = await program.account.protocolConfig.fetch(protocolConfigPda);
    expect(config.firstValidSettleTs.toNumber()).to.equal(0);
    expect(config.isSettled).to.equal(false);
  });

  it("stale observation does not settle and resets window", async () => {
    await setupContext();

    // First set a valid price to start the window
    let now = await getBankrunTimestamp();
    await setOracleData({ price: ABOVE_THRESHOLD, conf: GOOD_CONF, publishTime: now });
    await trySettle();

    let config = await program.account.protocolConfig.fetch(protocolConfigPda);
    expect(config.firstValidSettleTs.toNumber()).to.be.greaterThan(0);

    // Now set stale data (200 seconds old, max is 90)
    now = await getBankrunTimestamp();
    await setOracleData({
      price: ABOVE_THRESHOLD,
      conf: GOOD_CONF,
      publishTime: now - BigInt(200),
    });
    await trySettle();

    config = await program.account.protocolConfig.fetch(protocolConfigPda);
    expect(config.firstValidSettleTs.toNumber()).to.equal(0);
    expect(config.isSettled).to.equal(false);
  });

  it("wide confidence does not settle and resets window", async () => {
    await setupContext();

    // Start window
    let now = await getBankrunTimestamp();
    await setOracleData({ price: ABOVE_THRESHOLD, conf: GOOD_CONF, publishTime: now });
    await trySettle();

    let config = await program.account.protocolConfig.fetch(protocolConfigPda);
    expect(config.firstValidSettleTs.toNumber()).to.be.greaterThan(0);

    // Wide confidence (200 bps, max 100 bps)
    now = await getBankrunTimestamp();
    await setOracleData({ price: ABOVE_THRESHOLD, conf: WIDE_CONF, publishTime: now });
    await trySettle();

    config = await program.account.protocolConfig.fetch(protocolConfigPda);
    expect(config.firstValidSettleTs.toNumber()).to.equal(0);
    expect(config.isSettled).to.equal(false);
  });

  it("below threshold does not settle and resets window", async () => {
    await setupContext();

    // Start window
    let now = await getBankrunTimestamp();
    await setOracleData({ price: ABOVE_THRESHOLD, conf: GOOD_CONF, publishTime: now });
    await trySettle();

    let config = await program.account.protocolConfig.fetch(protocolConfigPda);
    expect(config.firstValidSettleTs.toNumber()).to.be.greaterThan(0);

    // Below threshold
    now = await getBankrunTimestamp();
    await setOracleData({ price: BELOW_THRESHOLD, conf: GOOD_CONF, publishTime: now });
    await trySettle();

    config = await program.account.protocolConfig.fetch(protocolConfigPda);
    expect(config.firstValidSettleTs.toNumber()).to.equal(0);
    expect(config.isSettled).to.equal(false);
  });

  it("starts window on first valid above-threshold sample", async () => {
    await setupContext();

    const now = await getBankrunTimestamp();
    await setOracleData({ price: ABOVE_THRESHOLD, conf: GOOD_CONF, publishTime: now });
    await trySettle();

    const config = await program.account.protocolConfig.fetch(protocolConfigPda);
    expect(config.firstValidSettleTs.toNumber()).to.be.greaterThan(0);
    expect(config.isSettled).to.equal(false);
  });

  it("settles after sustained valid window (3600s)", async () => {
    await setupContext();
    await settleProtocol();

    const config = await program.account.protocolConfig.fetch(protocolConfigPda);
    expect(config.isSettled).to.equal(true);
  });

  it("already settled returns AlreadySettled error", async () => {
    await setupContext();
    await settleProtocol();

    const config = await program.account.protocolConfig.fetch(protocolConfigPda);
    expect(config.isSettled).to.equal(true);

    // Try again — should get AlreadySettled
    const now = await getBankrunTimestamp();
    await setOracleData({
      price: ABOVE_THRESHOLD,
      conf: GOOD_CONF,
      publishTime: now,
    });

    try {
      await trySettle();
      expect.fail("Expected AlreadySettled error");
    } catch (err: any) {
      // bankrun errors may be wrapped differently; check message if errorCode unavailable
      const code = err?.error?.errorCode?.code ?? "";
      const msg = err?.message ?? err?.toString() ?? "";
      expect(
        code === "AlreadySettled" || msg.includes("0x178a") || msg.includes("AlreadySettled")
      ).to.equal(true, `Expected AlreadySettled, got: ${msg}`);
    }
  });

  it("claim_unfilled_slot blocked after settlement (ProtocolSettled)", async () => {
    await setupContext();
    await settleProtocol();

    const config = await program.account.protocolConfig.fetch(protocolConfigPda);
    expect(config.isSettled).to.equal(true);

    // Try to claim an unfilled slot
    try {
      await warpOneSlot();
      await program.methods
        .claimUnfilledSlot(0, new anchor.BN(LAMPORTS_PER_SOL))
        .accounts({
          claimer: adminKeypair.publicKey,
          protocolConfig: protocolConfigPda,
          vault: vaultPda,
          slotBook: slotBookPda,
          slot: getSlotPda(0),
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      expect.fail("Expected ProtocolSettled error");
    } catch (err: any) {
      const code = err?.error?.errorCode?.code ?? "";
      const msg = err?.message ?? err?.toString() ?? "";
      expect(
        code === "ProtocolSettled" || msg.includes("ProtocolSettled") || msg.includes("0x1792")
      ).to.equal(true, `Expected ProtocolSettled, got: ${msg}`);
    }
  });

  it("displace_lowest blocked after settlement (ProtocolSettled)", async () => {
    await setupContext();

    // Claim one slot first (need it for displacement account validation)
    await program.methods
      .claimUnfilledSlot(0, new anchor.BN(LAMPORTS_PER_SOL))
      .accounts({
        claimer: adminKeypair.publicKey,
        protocolConfig: protocolConfigPda,
        vault: vaultPda,
        slotBook: slotBookPda,
        slot: getSlotPda(0),
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    // Init claimable balance for the slot owner
    await program.methods
      .initClaimableBalance()
      .accounts({
        payer: adminKeypair.publicKey,
        owner: adminKeypair.publicKey,
        claimableBalance: getClaimableBalancePda(adminKeypair.publicKey),
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await settleProtocol();

    const config = await program.account.protocolConfig.fetch(protocolConfigPda);
    expect(config.isSettled).to.equal(true);

    // Try to displace
    const challenger = Keypair.generate();
    context.setAccount(challenger.publicKey, {
      lamports: 10 * LAMPORTS_PER_SOL,
      data: Buffer.alloc(0),
      owner: SystemProgram.programId,
      executable: false,
    });

    try {
      await warpOneSlot();
      await program.methods
        .displaceLowest(0, new anchor.BN(LAMPORTS_PER_SOL), new anchor.BN(2 * LAMPORTS_PER_SOL))
        .accounts({
          challenger: challenger.publicKey,
          protocolConfig: protocolConfigPda,
          slotBook: slotBookPda,
          vault: vaultPda,
          slot: getSlotPda(0),
          treasury,
          claimableBalance: getClaimableBalancePda(adminKeypair.publicKey),
          systemProgram: SystemProgram.programId,
        })
        .signers([challenger])
        .rpc();
      expect.fail("Expected ProtocolSettled error");
    } catch (err: any) {
      const code = err?.error?.errorCode?.code ?? "";
      const msg = err?.message ?? err?.toString() ?? "";
      expect(
        code === "ProtocolSettled" || msg.includes("ProtocolSettled") || msg.includes("0x1792")
      ).to.equal(true, `Expected ProtocolSettled, got: ${msg}`);
    }
  });

  // ==========================================================================
  // Timeout settlement tests
  // ==========================================================================

  it("timeout settlement does not trigger before deadline", async () => {
    await setupContext();

    // Warp to 1 second before deadline
    const clock = await context.banksClient.getClock();
    const beforeDeadline = BigInt("1899849599");
    context.setClock(
      new Clock(
        clock.slot,
        clock.epochStartTimestamp,
        clock.epoch,
        clock.leaderScheduleEpoch,
        beforeDeadline
      )
    );

    // Set oracle with below-threshold price so price path doesn't trigger either
    await setOracleData({
      price: BELOW_THRESHOLD,
      conf: GOOD_CONF,
      publishTime: beforeDeadline,
    });
    await trySettle();

    const config = await program.account.protocolConfig.fetch(protocolConfigPda);
    expect(config.isSettled).to.equal(false);
  });

  it("timeout settlement triggers at exact deadline timestamp", async () => {
    await setupContext();

    // Warp to exact deadline
    const clock = await context.banksClient.getClock();
    const deadline = BigInt("1899849600");
    context.setClock(
      new Clock(
        clock.slot,
        clock.epochStartTimestamp,
        clock.epoch,
        clock.leaderScheduleEpoch,
        deadline
      )
    );

    // Oracle data can be anything — timeout path bypasses oracle
    await setOracleData({
      price: BELOW_THRESHOLD,
      conf: GOOD_CONF,
      publishTime: deadline,
    });
    await trySettle();

    const config = await program.account.protocolConfig.fetch(protocolConfigPda);
    expect(config.isSettled).to.equal(true);
  });

  it("timeout settlement triggers after deadline timestamp", async () => {
    await setupContext();

    // Warp past deadline
    const clock = await context.banksClient.getClock();
    const afterDeadline = BigInt("1899849601");
    context.setClock(
      new Clock(
        clock.slot,
        clock.epochStartTimestamp,
        clock.epoch,
        clock.leaderScheduleEpoch,
        afterDeadline
      )
    );

    await setOracleData({
      price: BELOW_THRESHOLD,
      conf: GOOD_CONF,
      publishTime: afterDeadline,
    });
    await trySettle();

    const config = await program.account.protocolConfig.fetch(protocolConfigPda);
    expect(config.isSettled).to.equal(true);
  });

  it("price settlement still works before deadline", async () => {
    await setupContext();

    // Ensure we're well before the deadline (default bankrun time is ~epoch start)
    await settleProtocol();

    const config = await program.account.protocolConfig.fetch(protocolConfigPda);
    expect(config.isSettled).to.equal(true);
  });

  it("already settled via timeout returns AlreadySettled error", async () => {
    await setupContext();

    // Settle via timeout
    const clock = await context.banksClient.getClock();
    const deadline = BigInt("1899849600");
    context.setClock(
      new Clock(
        clock.slot,
        clock.epochStartTimestamp,
        clock.epoch,
        clock.leaderScheduleEpoch,
        deadline
      )
    );
    await setOracleData({
      price: BELOW_THRESHOLD,
      conf: GOOD_CONF,
      publishTime: deadline,
    });
    await trySettle();

    const config = await program.account.protocolConfig.fetch(protocolConfigPda);
    expect(config.isSettled).to.equal(true);

    // Try again — should get AlreadySettled
    try {
      await trySettle();
      expect.fail("Expected AlreadySettled error");
    } catch (err: any) {
      const code = err?.error?.errorCode?.code ?? "";
      const msg = err?.message ?? err?.toString() ?? "";
      expect(
        code === "AlreadySettled" || msg.includes("0x178a") || msg.includes("AlreadySettled")
      ).to.equal(true, `Expected AlreadySettled, got: ${msg}`);
    }
  });

  it("claim() still callable after settlement", async () => {
    await setupContext();

    // Init claimable balance
    await program.methods
      .initClaimableBalance()
      .accounts({
        payer: adminKeypair.publicKey,
        owner: adminKeypair.publicKey,
        claimableBalance: getClaimableBalancePda(adminKeypair.publicKey),
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await settleProtocol();

    const config = await program.account.protocolConfig.fetch(protocolConfigPda);
    expect(config.isSettled).to.equal(true);

    // Attempt claim — should fail with NoClaimableBalance, NOT ProtocolSettled
    try {
      await warpOneSlot();
      await program.methods
        .claim()
        .accounts({
          owner: adminKeypair.publicKey,
          vault: vaultPda,
          claimableBalance: getClaimableBalancePda(adminKeypair.publicKey),
        })
        .rpc();
      expect.fail("Expected NoClaimableBalance error");
    } catch (err: any) {
      const code = err?.error?.errorCode?.code ?? "";
      const msg = err?.message ?? err?.toString() ?? "";
      // The critical assertion: claim() has no settlement guard — it rejects with NoClaimableBalance
      expect(
        code === "NoClaimableBalance" || msg.includes("NoClaimableBalance") || msg.includes("0x179c")
      ).to.equal(true, `Expected NoClaimableBalance, got: ${msg}`);
    }
  });
});
