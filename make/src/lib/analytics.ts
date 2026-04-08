/**
 * Lightweight client-side funnel telemetry backed by PostHog.
 *
 * Env-gated: events are only sent when both NEXT_PUBLIC_ANALYTICS_ENABLED=true
 * and NEXT_PUBLIC_POSTHOG_KEY are set. Otherwise behaves as a silent no-op
 * (with console.debug in development for local testing).
 */

import posthog from "posthog-js";

type EventPayload = Record<string, string | number | boolean | null>;

const IS_BROWSER = typeof window !== "undefined";
const IS_DEV =
  typeof process !== "undefined" && process.env.NODE_ENV === "development";
const ENABLED =
  IS_BROWSER &&
  process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "true" &&
  !!process.env.NEXT_PUBLIC_POSTHOG_KEY;

let initialized = false;

/** Random 8-char hex string, stable for the current page load. Ties related funnel events together without identifying the user. */
const SESSION_ID = IS_BROWSER
  ? Math.random().toString(16).slice(2, 10)
  : "ssr";

/** Call once from a client component (e.g. PostHogProvider). Safe to call multiple times. */
export function initAnalytics(): void {
  if (initialized || !ENABLED) return;
  initialized = true;

  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_ANALYTICS_HOST || "https://us.i.posthog.com",
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    persistence: "memory", // no cookies — privacy-first
    disable_session_recording: true,
  });
}

function send(name: string, payload: EventPayload): void {
  if (IS_DEV) {
    console.debug("[analytics]", name, payload);
  }
  if (ENABLED && initialized) {
    posthog.capture(name, payload);
  }
}

/** Fire-and-forget event — never throws, never blocks UI. Automatically includes funnel_session_id. */
export function track(name: string, payload: EventPayload = {}): void {
  try {
    send(name, { funnel_session_id: SESSION_ID, ...payload });
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
