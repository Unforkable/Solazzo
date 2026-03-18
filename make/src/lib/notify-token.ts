import { createHmac, timingSafeEqual } from "crypto";

type NotifyTokenPurpose = "unsubscribe" | "preferences";

interface TokenPayload {
  email: string;
  purpose: NotifyTokenPurpose;
  issuedAt: number;
  expiresAt: number;
}

function getSecret(): string {
  const secret = process.env.NOTIFY_TOKEN_SECRET;
  if (secret) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NOTIFY_TOKEN_SECRET is required in production. " +
        "Notification link signing cannot proceed without it.",
    );
  }

  // Local dev: deterministic fallback so links work in development
  return "dev-notify-token-secret-not-for-production";
}

function computeHmac(data: string): Buffer {
  return createHmac("sha256", getSecret()).update(data).digest();
}

export function createNotifyToken(
  email: string,
  purpose: NotifyTokenPurpose,
  ttlMs: number,
): string {
  const now = Date.now();
  const payload: TokenPayload = {
    email: email.trim().toLowerCase(),
    purpose,
    issuedAt: now,
    expiresAt: now + ttlMs,
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = computeHmac(payloadB64).toString("base64url");
  return `${payloadB64}.${mac}`;
}

export function verifyNotifyToken(
  token: string,
  expectedPurpose: NotifyTokenPurpose,
): { email: string } | null {
  try {
    const dotIdx = token.lastIndexOf(".");
    if (dotIdx === -1) return null;

    const payloadB64 = token.substring(0, dotIdx);
    const macB64 = token.substring(dotIdx + 1);

    // Constant-time HMAC verification
    const expectedMac = computeHmac(payloadB64);
    const actualMac = Buffer.from(macB64, "base64url");

    if (
      expectedMac.length !== actualMac.length ||
      !timingSafeEqual(expectedMac, actualMac)
    ) {
      return null;
    }

    const payload: TokenPayload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString(),
    );

    if (payload.purpose !== expectedPurpose) return null;
    if (Date.now() > payload.expiresAt) return null;

    return { email: payload.email };
  } catch {
    return null;
  }
}
