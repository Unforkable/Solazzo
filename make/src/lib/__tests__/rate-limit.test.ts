/**
 * Tests for the generation guardrails introduced in Ticket 3:
 *   - checkRateLimit (per-IP sliding window)
 *   - getGenerateLimitConfig (env-driven config with safe fallbacks)
 *   - checkDailyQuota (opt-in per-IP + global daily caps for cost control)
 *
 * State isolation: every test resets the in-memory maps via the
 * __resetRateLimitStateForTests helper, and snapshots/restores env vars.
 */

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  checkRateLimit,
  checkDailyQuota,
  getGenerateLimitConfig,
  __resetRateLimitStateForTests,
  GENERATE_LIMIT,
} from "../rate-limit";

const ENV_KEYS = [
  "GENERATE_RATE_LIMIT_MAX",
  "GENERATE_RATE_LIMIT_WINDOW_MS",
  "GENERATE_DAILY_MAX_REQUESTS",
  "GENERATE_GLOBAL_DAILY_MAX",
] as const;

function snapshotEnv(): Record<string, string | undefined> {
  return Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
}
function restoreEnv(snap: Record<string, string | undefined>) {
  for (const k of ENV_KEYS) {
    const v = snap[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

describe("checkRateLimit (per-IP sliding window)", () => {
  let snap: Record<string, string | undefined>;
  beforeEach(() => {
    snap = snapshotEnv();
    __resetRateLimitStateForTests();
  });
  afterEach(() => restoreEnv(snap));

  it("allows requests under the limit", () => {
    const cfg = { windowMs: 60_000, maxRequests: 3 };
    for (let i = 0; i < 3; i++) {
      const r = checkRateLimit("1.1.1.1", cfg);
      assert.equal(r.allowed, true, `hit ${i + 1} should be allowed`);
    }
  });

  it("blocks once the limit is hit (429-class signal)", () => {
    const cfg = { windowMs: 60_000, maxRequests: 2 };
    checkRateLimit("1.1.1.1", cfg);
    checkRateLimit("1.1.1.1", cfg);
    const blocked = checkRateLimit("1.1.1.1", cfg);
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.remaining, 0);
  });

  it("isolates buckets per IP", () => {
    const cfg = { windowMs: 60_000, maxRequests: 1 };
    assert.equal(checkRateLimit("1.1.1.1", cfg).allowed, true);
    assert.equal(checkRateLimit("1.1.1.1", cfg).allowed, false);
    // Different IP — fresh bucket
    assert.equal(checkRateLimit("2.2.2.2", cfg).allowed, true);
  });

  it("expires stale hits once the window passes (now-injection)", () => {
    const cfg = { windowMs: 1_000, maxRequests: 2 };
    const t0 = 1_000_000_000;
    assert.equal(checkRateLimit("3.3.3.3", cfg, t0).allowed, true);
    assert.equal(checkRateLimit("3.3.3.3", cfg, t0 + 100).allowed, true);
    assert.equal(checkRateLimit("3.3.3.3", cfg, t0 + 200).allowed, false);
    // Advance past windowMs — both prior hits drop out of the window.
    assert.equal(checkRateLimit("3.3.3.3", cfg, t0 + 2_000).allowed, true);
  });
});

describe("getGenerateLimitConfig (env-driven)", () => {
  let snap: Record<string, string | undefined>;
  beforeEach(() => {
    snap = snapshotEnv();
  });
  afterEach(() => restoreEnv(snap));

  it("returns built-in defaults when no env set", () => {
    delete process.env.GENERATE_RATE_LIMIT_MAX;
    delete process.env.GENERATE_RATE_LIMIT_WINDOW_MS;
    const cfg = getGenerateLimitConfig();
    assert.equal(cfg.maxRequests, GENERATE_LIMIT.maxRequests);
    assert.equal(cfg.windowMs, GENERATE_LIMIT.windowMs);
  });

  it("respects valid env overrides", () => {
    process.env.GENERATE_RATE_LIMIT_MAX = "42";
    process.env.GENERATE_RATE_LIMIT_WINDOW_MS = "12345";
    const cfg = getGenerateLimitConfig();
    assert.equal(cfg.maxRequests, 42);
    assert.equal(cfg.windowMs, 12345);
  });

  it("falls back to defaults for non-numeric / non-positive env values", () => {
    process.env.GENERATE_RATE_LIMIT_MAX = "not-a-number";
    process.env.GENERATE_RATE_LIMIT_WINDOW_MS = "-5";
    const cfg = getGenerateLimitConfig();
    assert.equal(cfg.maxRequests, GENERATE_LIMIT.maxRequests);
    assert.equal(cfg.windowMs, GENERATE_LIMIT.windowMs);
  });

  it("falls back when env value is empty string", () => {
    process.env.GENERATE_RATE_LIMIT_MAX = "";
    const cfg = getGenerateLimitConfig();
    assert.equal(cfg.maxRequests, GENERATE_LIMIT.maxRequests);
  });
});

describe("checkDailyQuota (cost circuit breaker)", () => {
  let snap: Record<string, string | undefined>;
  beforeEach(() => {
    snap = snapshotEnv();
    __resetRateLimitStateForTests();
  });
  afterEach(() => restoreEnv(snap));

  it("is a no-op fast-path when both caps disabled", () => {
    delete process.env.GENERATE_DAILY_MAX_REQUESTS;
    delete process.env.GENERATE_GLOBAL_DAILY_MAX;
    // Call many times — should always allow without incrementing.
    for (let i = 0; i < 1000; i++) {
      const r = checkDailyQuota("1.1.1.1");
      assert.equal(r.allowed, true);
      assert.equal(r.perIpMax, 0);
      assert.equal(r.globalMax, 0);
    }
  });

  it("enforces per-IP daily cap and reports the right reason", () => {
    process.env.GENERATE_DAILY_MAX_REQUESTS = "3";
    delete process.env.GENERATE_GLOBAL_DAILY_MAX;
    const now = Date.UTC(2026, 4, 12, 10, 0, 0);
    for (let i = 1; i <= 3; i++) {
      const r = checkDailyQuota("1.1.1.1", now);
      assert.equal(r.allowed, true);
      assert.equal(r.perIpCount, i);
    }
    const blocked = checkDailyQuota("1.1.1.1", now);
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.reason, "per-ip-daily");
    assert.equal(blocked.perIpCount, 3);
    assert.equal(blocked.perIpMax, 3);
  });

  it("enforces global daily cap across IPs", () => {
    delete process.env.GENERATE_DAILY_MAX_REQUESTS;
    process.env.GENERATE_GLOBAL_DAILY_MAX = "5";
    const now = Date.UTC(2026, 4, 12, 10, 0, 0);
    // 5 hits across 5 different IPs — all allowed.
    for (let i = 0; i < 5; i++) {
      const r = checkDailyQuota(`10.0.0.${i}`, now);
      assert.equal(r.allowed, true);
    }
    // 6th from a fresh IP — blocked by global cap.
    const blocked = checkDailyQuota("10.0.0.99", now);
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.reason, "global-daily");
    assert.equal(blocked.globalCount, 5);
    assert.equal(blocked.globalMax, 5);
  });

  it("per-IP and global caps coexist; the tighter one wins", () => {
    process.env.GENERATE_DAILY_MAX_REQUESTS = "2";
    process.env.GENERATE_GLOBAL_DAILY_MAX = "10";
    const now = Date.UTC(2026, 4, 12, 10, 0, 0);
    assert.equal(checkDailyQuota("1.1.1.1", now).allowed, true);
    assert.equal(checkDailyQuota("1.1.1.1", now).allowed, true);
    const blocked = checkDailyQuota("1.1.1.1", now);
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.reason, "per-ip-daily"); // per-IP tighter
  });

  it("resets per-IP and global counters on UTC day rollover", () => {
    process.env.GENERATE_DAILY_MAX_REQUESTS = "2";
    process.env.GENERATE_GLOBAL_DAILY_MAX = "3";
    const day1 = Date.UTC(2026, 4, 12, 23, 0, 0);
    const day2 = Date.UTC(2026, 4, 13, 1, 0, 0);

    checkDailyQuota("1.1.1.1", day1);
    checkDailyQuota("1.1.1.1", day1);
    assert.equal(checkDailyQuota("1.1.1.1", day1).allowed, false);

    // New UTC day — fresh counters for both per-IP and global.
    const r = checkDailyQuota("1.1.1.1", day2);
    assert.equal(r.allowed, true);
    assert.equal(r.perIpCount, 1, "per-IP count must reset on new day");
    assert.equal(r.globalCount, 1, "global count must reset on new day");
  });

  it("does not consume counters when blocked (atomic check-and-set)", () => {
    process.env.GENERATE_DAILY_MAX_REQUESTS = "1";
    delete process.env.GENERATE_GLOBAL_DAILY_MAX;
    const now = Date.UTC(2026, 4, 12, 10, 0, 0);
    checkDailyQuota("1.1.1.1", now); // consume 1/1
    const a = checkDailyQuota("1.1.1.1", now);
    const b = checkDailyQuota("1.1.1.1", now);
    assert.equal(a.allowed, false);
    assert.equal(b.allowed, false);
    // Counter should still be exactly 1, not inflated by the failed attempts.
    assert.equal(a.perIpCount, 1);
    assert.equal(b.perIpCount, 1);
  });
});

// ── End-to-end: simulate the gate sequence used in /api/generate ─────────
describe("guardrail sequence (window → daily)", () => {
  let snap: Record<string, string | undefined>;
  beforeEach(() => {
    snap = snapshotEnv();
    __resetRateLimitStateForTests();
  });
  afterEach(() => restoreEnv(snap));

  it("window limit blocks first when burst exceeds it; daily counter not consumed", () => {
    process.env.GENERATE_RATE_LIMIT_MAX = "2";
    process.env.GENERATE_RATE_LIMIT_WINDOW_MS = "60000";
    process.env.GENERATE_DAILY_MAX_REQUESTS = "100";

    const ip = "9.9.9.9";
    const cfg = getGenerateLimitConfig();

    const r1 = checkRateLimit(ip, cfg);
    const d1 = r1.allowed ? checkDailyQuota(ip) : null;
    const r2 = checkRateLimit(ip, cfg);
    const d2 = r2.allowed ? checkDailyQuota(ip) : null;
    const r3 = checkRateLimit(ip, cfg);
    // Window limit kicks in on hit 3 — daily must NOT have been touched.
    assert.equal(r3.allowed, false);
    assert.ok(d1 && d1.allowed);
    assert.ok(d2 && d2.allowed);
    assert.equal(d2.perIpCount, 2);
  });

  it("window allows but daily blocks → 429 with daily reason", () => {
    process.env.GENERATE_RATE_LIMIT_MAX = "100";
    process.env.GENERATE_RATE_LIMIT_WINDOW_MS = "60000";
    process.env.GENERATE_DAILY_MAX_REQUESTS = "1";

    const ip = "8.8.8.8";
    const cfg = getGenerateLimitConfig();
    assert.equal(checkRateLimit(ip, cfg).allowed, true);
    assert.equal(checkDailyQuota(ip).allowed, true);

    assert.equal(checkRateLimit(ip, cfg).allowed, true);
    const d = checkDailyQuota(ip);
    assert.equal(d.allowed, false);
    assert.equal(d.reason, "per-ip-daily");
  });
});
