/**
 * Next.js instrumentation hook — runs once on server startup.
 * Validates that critical environment variables are present before
 * any request is served, so misconfigurations surface immediately
 * instead of failing on the first user request.
 */
export function register() {
  const missing: string[] = [];

  // ── Required for core functionality ──────────────────────────────
  if (!process.env.GEMINI_API_KEY) missing.push("GEMINI_API_KEY");
  if (!process.env.BLOB_READ_WRITE_TOKEN) missing.push("BLOB_READ_WRITE_TOKEN");

  const secret = process.env.PUBLISH_CHALLENGE_SECRET;
  if (!secret || secret.length < 32) {
    missing.push("PUBLISH_CHALLENGE_SECRET (must be >=32 chars)");
  }

  // ── Optional but warn if absent ──────────────────────────────────
  const optionalPairs: [string, string][] = [
    ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"],
    ["RESEND_API_KEY", "RESEND_FROM_EMAIL"],
  ];

  for (const [a, b] of optionalPairs) {
    const hasA = !!process.env[a];
    const hasB = !!process.env[b];
    if (hasA !== hasB) {
      console.warn(
        `[env] ${a} and ${b} should both be set or both be absent — only ${hasA ? a : b} is configured`,
      );
    }
  }

  if (missing.length > 0) {
    const msg = `Missing required environment variables:\n  - ${missing.join("\n  - ")}`;
    // In production, crash hard so the deployment is visibly broken.
    // In development, warn loudly but let the server start (some routes still work).
    if (process.env.NODE_ENV === "production") {
      throw new Error(msg);
    } else {
      console.warn(`\n⚠️  ${msg}\n`);
    }
  }
}
