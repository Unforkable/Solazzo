import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const CHALLENGE_VERSION = "v1";
const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ── Nonce replay store (in-memory, single-instance) ──────────────────
//
// Limitation: in Vercel serverless, different warm instances maintain
// separate stores. Combined with short TTL + on-chain ownership check +
// HMAC integrity, this is acceptable. For multi-instance protection,
// migrate to Redis/KV.

const usedNonces = new Map<string, number>(); // nonce -> expiresAt

function cleanExpiredNonces() {
  const now = Date.now();
  for (const [nonce, expiresAt] of usedNonces) {
    if (expiresAt <= now) usedNonces.delete(nonce);
  }
}

// ── Secret ────────────────────────────────────────────────────────────

function getSecret(): string {
  const secret = process.env.PUBLISH_CHALLENGE_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "PUBLISH_CHALLENGE_SECRET must be set (>=32 chars)",
    );
  }
  return secret;
}

// ── Challenge payload ─────────────────────────────────────────────────

export interface ChallengePayload {
  action: string;
  wallet: string;
  slotId: number;
  claimTxSig: string;
  nonce: string;
  issuedAt: number;
  expiresAt: number;
}

// ── Canonical message (displayed in wallet for user review) ───────────

export function buildChallengeMessage(p: ChallengePayload): string {
  return [
    `SOLAZZO Publish Authorization ${CHALLENGE_VERSION}`,
    `wallet:${p.wallet}`,
    `slotId:${p.slotId}`,
    `claimTxSig:${p.claimTxSig}`,
    `nonce:${p.nonce}`,
    `issuedAt:${p.issuedAt}`,
    `expiresAt:${p.expiresAt}`,
  ].join("\n");
}

// ── HMAC helpers ──────────────────────────────────────────────────────

function computeHmac(data: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(data).digest();
}

// ── Token creation ────────────────────────────────────────────────────

export function createChallengeToken(
  wallet: string,
  slotId: number,
  claimTxSig: string,
): { challengeMessage: string; challengeToken: string } {
  const secret = getSecret();
  const now = Date.now();

  const payload: ChallengePayload = {
    action: "gallery_publish_v1",
    wallet,
    slotId,
    claimTxSig,
    nonce: randomBytes(16).toString("base64url"),
    issuedAt: now,
    expiresAt: now + CHALLENGE_TTL_MS,
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = computeHmac(payloadB64, secret).toString("base64url");
  const challengeToken = `${payloadB64}.${mac}`;
  const challengeMessage = buildChallengeMessage(payload);

  return { challengeMessage, challengeToken };
}

// ── Token verification ────────────────────────────────────────────────

export function verifyChallengeToken(
  challengeToken: string,
  expectedWallet: string,
  expectedSlotId: number,
  expectedClaimTxSig: string,
): { payload: ChallengePayload; challengeMessage: string } {
  const secret = getSecret();

  // Clean expired nonces lazily
  cleanExpiredNonces();

  // Split token
  const dotIdx = challengeToken.lastIndexOf(".");
  if (dotIdx === -1) throw new Error("Malformed challenge token");

  const payloadB64 = challengeToken.substring(0, dotIdx);
  const macB64 = challengeToken.substring(dotIdx + 1);

  // Verify HMAC (constant-time)
  const expectedMac = computeHmac(payloadB64, secret);
  const actualMac = Buffer.from(macB64, "base64url");

  if (
    expectedMac.length !== actualMac.length ||
    !timingSafeEqual(expectedMac, actualMac)
  ) {
    throw new Error("Challenge token integrity check failed");
  }

  // Decode payload
  const payloadJson = Buffer.from(payloadB64, "base64url").toString();
  let payload: ChallengePayload;
  try {
    payload = JSON.parse(payloadJson);
  } catch {
    throw new Error("Malformed challenge payload");
  }

  // Verify action
  if (payload.action !== "gallery_publish_v1") {
    throw new Error("Invalid challenge action");
  }

  // Verify expiry
  if (Date.now() > payload.expiresAt) {
    throw new Error("Challenge token expired");
  }

  // Verify payload matches request
  if (payload.wallet !== expectedWallet) {
    throw new Error("Challenge wallet mismatch");
  }
  if (payload.slotId !== expectedSlotId) {
    throw new Error("Challenge slotId mismatch");
  }
  if (payload.claimTxSig !== expectedClaimTxSig) {
    throw new Error("Challenge claimTxSig mismatch");
  }

  // Replay protection
  if (usedNonces.has(payload.nonce)) {
    throw new Error("Challenge nonce already used");
  }
  usedNonces.set(payload.nonce, payload.expiresAt);

  const challengeMessage = buildChallengeMessage(payload);
  return { payload, challengeMessage };
}
