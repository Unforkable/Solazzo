import { startAnchor } from "anchor-bankrun";
import { BankrunProvider } from "anchor-bankrun";
import { Program, BorshCoder, EventParser, Event } from "@coral-xyz/anchor";
import { SolazzoCore } from "../target/types/solazzo_core";
import { expect } from "chai";
import {
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { Clock } from "solana-bankrun";

const IDL = require("../target/idl/solazzo_core.json");
const PROGRAM_ID = new PublicKey(
  "52xHAYaQW1ywhdhNjxg1LvJvsEHpPBrK1J9Aud371hHC"
);

// Pyth Receiver program ID
const PYTH_RECEIVER_PROGRAM_ID = new PublicKey(
  "rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ"
);

// PriceUpdateV2 discriminator and size
const PRICE_UPDATE_V2_DISCRIMINATOR = Buffer.from([
  34, 241, 35, 99, 157, 126, 244, 205,
]);
const PRICE_UPDATE_V2_SIZE = 133;
const ABOVE_THRESHOLD = BigInt("110000000000");
const GOOD_CONF = BigInt("500000000");

function buildPriceUpdateV2(params: {
  price: bigint;
  conf: bigint;
  publishTime: bigint;
}): Buffer {
  const buf = Buffer.alloc(PRICE_UPDATE_V2_SIZE);
  let offset = 0;
  PRICE_UPDATE_V2_DISCRIMINATOR.copy(buf, offset); offset += 8;
  offset += 32; // write_authority
  buf.writeUInt8(1, offset); offset += 1; // Full
  offset += 32; // feed_id
  buf.writeBigInt64LE(params.price, offset); offset += 8;
  buf.writeBigUInt64LE(params.conf, offset); offset += 8;
  buf.writeInt32LE(-8, offset); offset += 4;
  buf.writeBigInt64LE(params.publishTime, offset); offset += 8;
  buf.writeBigInt64LE(params.publishTime - BigInt(1), offset); offset += 8;
  buf.writeBigInt64LE(params.price, offset); offset += 8;
  buf.writeBigUInt64LE(params.conf, offset); offset += 8;
  buf.writeBigUInt64LE(BigInt(1), offset); offset += 8;
  return buf;
}

/** Parse Anchor events from log messages. */
function parseEventsFromLogs(logs: string[]): Event[] {
  const coder = new BorshCoder(IDL);
  const parser = new EventParser(PROGRAM_ID, coder);
  return [...parser.parseLogs(logs)];
}

describe("event emissions (bankrun)", () => {
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

  async function warpOneSlot() {
    const clock = await context.banksClient.getClock();
    context.warpToSlot(clock.slot + BigInt(1));
  }

  /**
   * Build, sign, and process a transaction via bankrun's tryProcessTransaction.
   * Returns the log messages from the result metadata.
   */
  async function sendAndGetLogs(
    ix: anchor.web3.TransactionInstruction,
    signers: Keypair[] = []
  ): Promise<string[]> {
    await warpOneSlot();
    const tx = new Transaction().add(ix);
    tx.feePayer = adminKeypair.publicKey;
    const [blockhash] = await context.banksClient.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.sign(adminKeypair, ...signers);

    const result = await context.banksClient.tryProcessTransaction(tx);
    if (result.result) {
      throw new Error(`Transaction failed: ${result.result}`);
    }
    return result.meta?.logMessages ?? [];
  }

  async function setupContext() {
    oracleFeedKeypair = Keypair.generate();
    treasury = Keypair.generate().publicKey;

    context = await startAnchor(".", [], []);
    adminKeypair = context.payer;
    provider = new BankrunProvider(context);
    anchor.setProvider(provider);
    program = new Program(IDL, provider);

    [protocolConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("protocol_config")], PROGRAM_ID
    );
    [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault")], PROGRAM_ID
    );
    [slotBookPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("slot_book")], PROGRAM_ID
    );

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

  // ── claim_unfilled_slot emits SlotClaimed ──

  it("claim_unfilled_slot emits SlotClaimed with correct fields", async () => {
    await setupContext();

    const ix = await program.methods
      .claimUnfilledSlot(7, new anchor.BN(2 * LAMPORTS_PER_SOL))
      .accounts({
        claimer: adminKeypair.publicKey,
        protocolConfig: protocolConfigPda,
        vault: vaultPda,
        slotBook: slotBookPda,
        slot: getSlotPda(7),
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    const logs = await sendAndGetLogs(ix);
    const events = parseEventsFromLogs(logs);

    const claimed = events.find((e) => e.name === "SlotClaimed");
    expect(claimed, "SlotClaimed event not found").to.not.be.undefined;
    expect(claimed!.data.slot_id ?? claimed!.data.slotId).to.equal(7);
    expect((claimed!.data.owner as any).toString()).to.equal(adminKeypair.publicKey.toString());
    expect(Number(claimed!.data.lock_lamports ?? claimed!.data.lockLamports)).to.equal(2 * LAMPORTS_PER_SOL);
    expect(Number(claimed!.data.ts)).to.be.greaterThan(0);
  });

  // ── displace_lowest emits SlotDisplaced + ClaimCredited ──

  it("displace_lowest emits SlotDisplaced and ClaimCredited", async () => {
    await setupContext();

    // Fill all 1000 slots
    for (let i = 0; i < 1000; i++) {
      await warpOneSlot();
      await program.methods
        .claimUnfilledSlot(i, new anchor.BN(LAMPORTS_PER_SOL))
        .accounts({
          claimer: adminKeypair.publicKey,
          protocolConfig: protocolConfigPda,
          vault: vaultPda,
          slotBook: slotBookPda,
          slot: getSlotPda(i),
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    }

    // Init claimable balance
    await warpOneSlot();
    await program.methods
      .initClaimableBalance()
      .accounts({
        payer: adminKeypair.publicKey,
        owner: adminKeypair.publicKey,
        claimableBalance: getClaimableBalancePda(adminKeypair.publicKey),
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    // Create challenger
    const challenger = Keypair.generate();
    context.setAccount(challenger.publicKey, {
      lamports: 10 * LAMPORTS_PER_SOL,
      data: Buffer.alloc(0),
      owner: SystemProgram.programId,
      executable: false,
    });

    // Displace slot 0
    const ix = await program.methods
      .displaceLowest(
        0,
        new anchor.BN(LAMPORTS_PER_SOL),
        new anchor.BN(2 * LAMPORTS_PER_SOL)
      )
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
      .instruction();

    const logs = await sendAndGetLogs(ix, [challenger]);
    const events = parseEventsFromLogs(logs);

    // SlotDisplaced
    const displaced = events.find((e) => e.name === "SlotDisplaced");
    expect(displaced, "SlotDisplaced event not found").to.not.be.undefined;
    expect(displaced!.data.slot_id ?? displaced!.data.slotId).to.equal(0);
    expect((displaced!.data.old_owner ?? displaced!.data.oldOwner as any).toString()).to.equal(adminKeypair.publicKey.toString());
    expect((displaced!.data.new_owner ?? displaced!.data.newOwner as any).toString()).to.equal(challenger.publicKey.toString());
    expect(Number(displaced!.data.old_lock_lamports ?? displaced!.data.oldLockLamports)).to.equal(LAMPORTS_PER_SOL);
    expect(Number(displaced!.data.new_lock_lamports ?? displaced!.data.newLockLamports)).to.equal(2 * LAMPORTS_PER_SOL);
    expect(Number(displaced!.data.fee_lamports ?? displaced!.data.feeLamports)).to.equal(LAMPORTS_PER_SOL / 10);

    // ClaimCredited
    const credited = events.find((e) => e.name === "ClaimCredited");
    expect(credited, "ClaimCredited event not found").to.not.be.undefined;
    expect((credited!.data.owner as any).toString()).to.equal(adminKeypair.publicKey.toString());
    expect(Number(credited!.data.amount_lamports ?? credited!.data.amountLamports)).to.equal(LAMPORTS_PER_SOL);
  });

  // ── claim emits Claimed ──

  it("claim emits Claimed event", async () => {
    await setupContext();

    // Fill all 1000 slots + init claimable balance + displace to credit balance
    for (let i = 0; i < 1000; i++) {
      await warpOneSlot();
      await program.methods
        .claimUnfilledSlot(i, new anchor.BN(LAMPORTS_PER_SOL))
        .accounts({
          claimer: adminKeypair.publicKey,
          protocolConfig: protocolConfigPda,
          vault: vaultPda,
          slotBook: slotBookPda,
          slot: getSlotPda(i),
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    }

    await warpOneSlot();
    await program.methods
      .initClaimableBalance()
      .accounts({
        payer: adminKeypair.publicKey,
        owner: adminKeypair.publicKey,
        claimableBalance: getClaimableBalancePda(adminKeypair.publicKey),
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const challenger = Keypair.generate();
    context.setAccount(challenger.publicKey, {
      lamports: 10 * LAMPORTS_PER_SOL,
      data: Buffer.alloc(0),
      owner: SystemProgram.programId,
      executable: false,
    });

    await warpOneSlot();
    await program.methods
      .displaceLowest(
        0,
        new anchor.BN(LAMPORTS_PER_SOL),
        new anchor.BN(2 * LAMPORTS_PER_SOL)
      )
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

    // Now claim
    const ix = await program.methods
      .claim()
      .accounts({
        owner: adminKeypair.publicKey,
        vault: vaultPda,
        claimableBalance: getClaimableBalancePda(adminKeypair.publicKey),
      })
      .instruction();

    const logs = await sendAndGetLogs(ix);
    const events = parseEventsFromLogs(logs);

    const claimedEvent = events.find((e) => e.name === "Claimed");
    expect(claimedEvent, "Claimed event not found").to.not.be.undefined;
    expect((claimedEvent!.data.owner as any).toString()).to.equal(adminKeypair.publicKey.toString());
    expect(Number(claimedEvent!.data.amount_lamports ?? claimedEvent!.data.amountLamports)).to.equal(LAMPORTS_PER_SOL);
  });

  // ── settle emits SettlementWindowStarted + Settled ──

  it("settle_if_threshold_met emits SettlementWindowStarted and Settled", async () => {
    await setupContext();

    const now = (await context.banksClient.getClock()).unixTimestamp;

    context.setAccount(oracleFeedKeypair.publicKey, {
      lamports: LAMPORTS_PER_SOL,
      data: buildPriceUpdateV2({ price: ABOVE_THRESHOLD, conf: GOOD_CONF, publishTime: now }),
      owner: PYTH_RECEIVER_PROGRAM_ID,
      executable: false,
    });

    // First settle — emits SettlementWindowStarted
    const startIx = await program.methods
      .settleIfThresholdMet()
      .accounts({
        caller: adminKeypair.publicKey,
        protocolConfig: protocolConfigPda,
        oracleFeed: oracleFeedKeypair.publicKey,
      })
      .instruction();

    const startLogs = await sendAndGetLogs(startIx);
    const startEvents = parseEventsFromLogs(startLogs);
    const windowStarted = startEvents.find((e) => e.name === "SettlementWindowStarted");
    expect(windowStarted, "SettlementWindowStarted not found").to.not.be.undefined;
    expect((windowStarted!.data.ts as any).toNumber()).to.be.greaterThan(0);

    // Warp +3601s
    const clock = await context.banksClient.getClock();
    const newTs = clock.unixTimestamp + BigInt(3601);
    context.setClock(
      new Clock(clock.slot, clock.epochStartTimestamp, clock.epoch, clock.leaderScheduleEpoch, newTs)
    );

    context.setAccount(oracleFeedKeypair.publicKey, {
      lamports: LAMPORTS_PER_SOL,
      data: buildPriceUpdateV2({ price: ABOVE_THRESHOLD, conf: GOOD_CONF, publishTime: newTs }),
      owner: PYTH_RECEIVER_PROGRAM_ID,
      executable: false,
    });

    // Second settle — emits Settled
    const settleIx = await program.methods
      .settleIfThresholdMet()
      .accounts({
        caller: adminKeypair.publicKey,
        protocolConfig: protocolConfigPda,
        oracleFeed: oracleFeedKeypair.publicKey,
      })
      .instruction();

    const settleLogs = await sendAndGetLogs(settleIx);
    const settleEvents = parseEventsFromLogs(settleLogs);
    const settled = settleEvents.find((e) => e.name === "Settled");
    expect(settled, "Settled event not found").to.not.be.undefined;
    expect((settled!.data.ts as any).toNumber()).to.be.greaterThan(0);
  });

  // ── settle reset emits SettlementWindowReset ──

  it("stale data emits SettlementWindowReset", async () => {
    await setupContext();

    let now = (await context.banksClient.getClock()).unixTimestamp;

    // Start window
    context.setAccount(oracleFeedKeypair.publicKey, {
      lamports: LAMPORTS_PER_SOL,
      data: buildPriceUpdateV2({ price: ABOVE_THRESHOLD, conf: GOOD_CONF, publishTime: now }),
      owner: PYTH_RECEIVER_PROGRAM_ID,
      executable: false,
    });

    await warpOneSlot();
    await program.methods
      .settleIfThresholdMet()
      .accounts({
        caller: adminKeypair.publicKey,
        protocolConfig: protocolConfigPda,
        oracleFeed: oracleFeedKeypair.publicKey,
      })
      .rpc();

    // Set stale data (200s old)
    now = (await context.banksClient.getClock()).unixTimestamp;
    context.setAccount(oracleFeedKeypair.publicKey, {
      lamports: LAMPORTS_PER_SOL,
      data: buildPriceUpdateV2({
        price: ABOVE_THRESHOLD,
        conf: GOOD_CONF,
        publishTime: now - BigInt(200),
      }),
      owner: PYTH_RECEIVER_PROGRAM_ID,
      executable: false,
    });

    const resetIx = await program.methods
      .settleIfThresholdMet()
      .accounts({
        caller: adminKeypair.publicKey,
        protocolConfig: protocolConfigPda,
        oracleFeed: oracleFeedKeypair.publicKey,
      })
      .instruction();

    const logs = await sendAndGetLogs(resetIx);
    const events = parseEventsFromLogs(logs);
    const reset = events.find((e) => e.name === "SettlementWindowReset");
    expect(reset, "SettlementWindowReset not found").to.not.be.undefined;
    expect((reset!.data.ts as any).toNumber()).to.be.greaterThan(0);
  });
});
