import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "crypto";
import nacl from "tweetnacl";
import bs58 from "bs58";
import {
  createChallengeToken,
  verifyChallengeToken,
  buildChallengeMessage,
  type ChallengePayload,
} from "../publish-auth";

// ── Test fixtures ─────────────────────────────────────────────────────

const TEST_SECRET = "test-secret-must-be-at-least-32-characters-long-for-safety";

// Generate a real Ed25519 keypair for signing tests
const keypair = nacl.sign.keyPair();
const walletPubkey = bs58.encode(keypair.publicKey);
const SLOT_ID = 42;
const CLAIM_TX_SIG = "5xYaBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890abcdefgh";

function signChallengeMessage(message: string): string {
  const messageBytes = new TextEncoder().encode(message);
  const sig = nacl.sign.detached(messageBytes, keypair.secretKey);
  return bs58.encode(sig);
}

// ── Tests ─────────────────────────────────────────────────────────────

describe("publish-auth", () => {
  beforeEach(() => {
    process.env.PUBLISH_CHALLENGE_SECRET = TEST_SECRET;
  });

  describe("createChallengeToken", () => {
    it("returns challengeMessage and challengeToken", () => {
      const { challengeMessage, challengeToken } = createChallengeToken(
        walletPubkey,
        SLOT_ID,
        CLAIM_TX_SIG,
      );
      assert.ok(challengeMessage.includes("SOLAZZO Publish Authorization v1"));
      assert.ok(challengeMessage.includes(`wallet:${walletPubkey}`));
      assert.ok(challengeMessage.includes(`slotId:${SLOT_ID}`));
      assert.ok(challengeMessage.includes(`claimTxSig:${CLAIM_TX_SIG}`));
      assert.ok(challengeToken.includes("."));
    });

    it("throws when PUBLISH_CHALLENGE_SECRET is missing", () => {
      delete process.env.PUBLISH_CHALLENGE_SECRET;
      assert.throws(
        () => createChallengeToken(walletPubkey, SLOT_ID, CLAIM_TX_SIG),
        /PUBLISH_CHALLENGE_SECRET/,
      );
    });

    it("throws when PUBLISH_CHALLENGE_SECRET is too short", () => {
      process.env.PUBLISH_CHALLENGE_SECRET = "short";
      assert.throws(
        () => createChallengeToken(walletPubkey, SLOT_ID, CLAIM_TX_SIG),
        /PUBLISH_CHALLENGE_SECRET/,
      );
    });
  });

  describe("verifyChallengeToken", () => {
    it("happy path: verifies a valid token", () => {
      const { challengeToken } = createChallengeToken(
        walletPubkey,
        SLOT_ID,
        CLAIM_TX_SIG,
      );
      const result = verifyChallengeToken(
        challengeToken,
        walletPubkey,
        SLOT_ID,
        CLAIM_TX_SIG,
      );
      assert.ok(result.challengeMessage.includes("SOLAZZO Publish Authorization v1"));
      assert.equal(result.payload.wallet, walletPubkey);
      assert.equal(result.payload.slotId, SLOT_ID);
      assert.equal(result.payload.claimTxSig, CLAIM_TX_SIG);
    });

    it("rejects tampered token (HMAC integrity)", () => {
      const { challengeToken } = createChallengeToken(
        walletPubkey,
        SLOT_ID,
        CLAIM_TX_SIG,
      );
      // Flip a character in the payload portion
      const tampered = "X" + challengeToken.substring(1);
      assert.throws(
        () => verifyChallengeToken(tampered, walletPubkey, SLOT_ID, CLAIM_TX_SIG),
        /integrity/,
      );
    });

    it("rejects expired token", () => {
      // Create a token with an already-expired timestamp directly
      const payload: ChallengePayload = {
        action: "gallery_publish_v1",
        wallet: walletPubkey,
        slotId: SLOT_ID,
        claimTxSig: CLAIM_TX_SIG,
        nonce: "test-expired-nonce-12345",
        issuedAt: Date.now() - 600_000,
        expiresAt: Date.now() - 1, // already expired
      };
      const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
      const mac = createHmac("sha256", TEST_SECRET).update(payloadB64).digest().toString("base64url");
      const expiredToken = `${payloadB64}.${mac}`;

      assert.throws(
        () => verifyChallengeToken(expiredToken, walletPubkey, SLOT_ID, CLAIM_TX_SIG),
        /expired/,
      );
    });

    it("rejects replay (same nonce)", () => {
      const { challengeToken } = createChallengeToken(
        walletPubkey,
        SLOT_ID,
        CLAIM_TX_SIG,
      );
      // First verification succeeds
      verifyChallengeToken(challengeToken, walletPubkey, SLOT_ID, CLAIM_TX_SIG);
      // Second verification with same token fails (nonce replay)
      assert.throws(
        () => verifyChallengeToken(challengeToken, walletPubkey, SLOT_ID, CLAIM_TX_SIG),
        /nonce already used/,
      );
    });

    it("rejects wallet mismatch", () => {
      const { challengeToken } = createChallengeToken(
        walletPubkey,
        SLOT_ID,
        CLAIM_TX_SIG,
      );
      const otherKeypair = nacl.sign.keyPair();
      const otherWallet = bs58.encode(otherKeypair.publicKey);
      assert.throws(
        () => verifyChallengeToken(challengeToken, otherWallet, SLOT_ID, CLAIM_TX_SIG),
        /wallet mismatch/,
      );
    });

    it("rejects slotId mismatch", () => {
      const { challengeToken } = createChallengeToken(
        walletPubkey,
        SLOT_ID,
        CLAIM_TX_SIG,
      );
      assert.throws(
        () => verifyChallengeToken(challengeToken, walletPubkey, 999, CLAIM_TX_SIG),
        /slotId mismatch/,
      );
    });

    it("rejects claimTxSig mismatch", () => {
      const { challengeToken } = createChallengeToken(
        walletPubkey,
        SLOT_ID,
        CLAIM_TX_SIG,
      );
      assert.throws(
        () => verifyChallengeToken(challengeToken, walletPubkey, SLOT_ID, "differentTxSig1234567890123456789012"),
        /claimTxSig mismatch/,
      );
    });

    it("rejects malformed token (no dot)", () => {
      assert.throws(
        () => verifyChallengeToken("nodothere", walletPubkey, SLOT_ID, CLAIM_TX_SIG),
        /Malformed/,
      );
    });
  });

  describe("Ed25519 signature verification", () => {
    it("valid signature verifies", () => {
      const { challengeToken } = createChallengeToken(
        walletPubkey,
        SLOT_ID,
        CLAIM_TX_SIG,
      );
      const { challengeMessage } = verifyChallengeToken(
        challengeToken,
        walletPubkey,
        SLOT_ID,
        CLAIM_TX_SIG,
      );

      const messageBytes = new TextEncoder().encode(challengeMessage);
      const sigStr = signChallengeMessage(challengeMessage);
      const sigBytes = bs58.decode(sigStr);

      const valid = nacl.sign.detached.verify(
        messageBytes,
        sigBytes,
        keypair.publicKey,
      );
      assert.ok(valid);
    });

    it("forged signature fails verification", () => {
      const { challengeMessage } = createChallengeToken(
        walletPubkey,
        SLOT_ID,
        CLAIM_TX_SIG,
      );

      // Sign with a different key
      const forgedKeypair = nacl.sign.keyPair();
      const messageBytes = new TextEncoder().encode(challengeMessage);
      const forgedSig = nacl.sign.detached(messageBytes, forgedKeypair.secretKey);

      // Verify against the original wallet pubkey — should fail
      const valid = nacl.sign.detached.verify(
        messageBytes,
        forgedSig,
        keypair.publicKey,
      );
      assert.equal(valid, false);
    });

    it("tampered message fails verification", () => {
      const { challengeMessage } = createChallengeToken(
        walletPubkey,
        SLOT_ID,
        CLAIM_TX_SIG,
      );

      const sigStr = signChallengeMessage(challengeMessage);
      const sigBytes = bs58.decode(sigStr);

      // Tamper with the message
      const tamperedBytes = new TextEncoder().encode(challengeMessage + "tampered");

      const valid = nacl.sign.detached.verify(
        tamperedBytes,
        sigBytes,
        keypair.publicKey,
      );
      assert.equal(valid, false);
    });
  });

  describe("buildChallengeMessage", () => {
    it("produces deterministic canonical format", () => {
      const payload: ChallengePayload = {
        action: "gallery_publish_v1",
        wallet: walletPubkey,
        slotId: SLOT_ID,
        claimTxSig: CLAIM_TX_SIG,
        nonce: "testNonce123",
        issuedAt: 1710000000000,
        expiresAt: 1710000300000,
      };
      const msg = buildChallengeMessage(payload);
      const lines = msg.split("\n");
      assert.equal(lines[0], "SOLAZZO Publish Authorization v1");
      assert.equal(lines[1], `wallet:${walletPubkey}`);
      assert.equal(lines[2], `slotId:${SLOT_ID}`);
      assert.equal(lines[3], `claimTxSig:${CLAIM_TX_SIG}`);
      assert.equal(lines[4], "nonce:testNonce123");
      assert.equal(lines[5], "issuedAt:1710000000000");
      assert.equal(lines[6], "expiresAt:1710000300000");
      assert.equal(lines.length, 7);

      // Calling again produces identical output
      const msg2 = buildChallengeMessage(payload);
      assert.equal(msg, msg2);
    });
  });
});
