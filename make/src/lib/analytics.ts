/**
 * Lightweight client-side funnel telemetry.
 *
 * Currently logs to console in development and is a no-op in production.
 * To wire up a real provider (PostHog, Amplitude, etc.), replace the
 * `send` implementation — the call-sites stay unchanged.
 */

type EventPayload = Record<string, string | number | boolean | null>;

const IS_DEV =
  typeof process !== "undefined" && process.env.NODE_ENV === "development";

function send(name: string, payload: EventPayload): void {
  if (IS_DEV) {
    console.debug("[analytics]", name, payload);
  }
  // Plug real provider here:
  // posthog.capture(name, payload);
}

/** Fire-and-forget event — never throws, never blocks UI. */
export function track(name: string, payload: EventPayload = {}): void {
  try {
    send(name, payload);
  } catch {
    // Swallow — telemetry must never break UX.
  }
}

/** Bucket a continuous SOL amount into a privacy-safe range label. */
export function lockBucket(sol: number): string {
  if (sol <= 1) return "1";
  if (sol <= 2) return "2";
  if (sol <= 5) return "3-5";
  if (sol <= 10) return "6-10";
  return "10+";
}
