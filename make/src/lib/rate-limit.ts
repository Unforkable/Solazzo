// In-process sliding-window hits for checkRateLimit. Bounded by active-IP
// cardinality within `windowMs`; we lazily filter stale timestamps on each hit
// so unused entries shrink to []. Single-instance only — see file footer.
const hits = new Map<string, number[]>();

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 15,
};

export function checkRateLimit(
  ip: string,
  config: RateLimitConfig = DEFAULT_CONFIG,
  now: number = Date.now(),
): { allowed: boolean; remaining: number } {
  const { windowMs, maxRequests } = config;
  const windowStart = now - windowMs;

  const timestamps = (hits.get(ip) ?? []).filter((t) => t > windowStart);

  if (timestamps.length >= maxRequests) {
    hits.set(ip, timestamps);
    return { allowed: false, remaining: 0 };
  }

  timestamps.push(now);
  hits.set(ip, timestamps);

  return { allowed: true, remaining: maxRequests - timestamps.length };
}

/** 15 generations per hour (built-in default; can be overridden by env). */
export const GENERATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 60 * 1000,
  maxRequests: 15,
};

/** 5 publishes per hour */
export const PUBLISH_LIMIT: RateLimitConfig = {
  windowMs: 60 * 60 * 1000,
  maxRequests: 5,
};

/** 10 notification signups per hour */
export const NOTIFY_LIMIT: RateLimitConfig = {
  windowMs: 60 * 60 * 1000,
  maxRequests: 10,
};

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

// ── Env-driven config for /api/generate ──────────────────────────────────
//
// All values are positive integers. Invalid or missing values fall back to
// safe defaults rather than throwing — guardrails must never themselves
// cause an outage.

function parsePositiveInt(
  value: string | undefined,
  fallback: number,
): number {
  if (value === undefined || value.trim() === "") return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Resolve the per-IP sliding-window config for /api/generate from env.
 * Defaults: 15 requests / 1 hour (matches GENERATE_LIMIT).
 */
export function getGenerateLimitConfig(): RateLimitConfig {
  return {
    maxRequests: parsePositiveInt(
      process.env.GENERATE_RATE_LIMIT_MAX,
      GENERATE_LIMIT.maxRequests,
    ),
    windowMs: parsePositiveInt(
      process.env.GENERATE_RATE_LIMIT_WINDOW_MS,
      GENERATE_LIMIT.windowMs,
    ),
  };
}

// ── Daily quota / cost circuit breaker ────────────────────────────────────
//
// Two opt-in dimensions:
//   GENERATE_DAILY_MAX_REQUESTS  — per-IP daily cap
//   GENERATE_GLOBAL_DAILY_MAX    — total daily request budget across all IPs
//                                  (cost ceiling — protects Gemini spend)
//
// Both are checked WITHOUT incrementing first; only on allow do we consume
// the counter. Day boundaries are UTC for predictability.

const dailyHits = new Map<string, { date: string; count: number }>();
const globalDaily = new Map<string, number>();

function utcDateString(now: number): string {
  return new Date(now).toISOString().slice(0, 10); // YYYY-MM-DD
}

export interface DailyQuotaResult {
  allowed: boolean;
  perIpCount: number;
  perIpMax: number;
  globalCount: number;
  globalMax: number;
  /** Set when `allowed === false`. */
  reason?: "per-ip-daily" | "global-daily";
}

/**
 * Check (and atomically consume) one unit of daily quota for `ip`.
 *
 * Both caps are opt-in:
 *   - perIpMax  = 0  → per-IP daily cap disabled
 *   - globalMax = 0  → global daily cap disabled
 * If both are disabled, the call is a fast no-op that always allows.
 *
 * Day boundary: UTC midnight. Counters self-reset on first call of a new day.
 */
export function checkDailyQuota(
  ip: string,
  now: number = Date.now(),
): DailyQuotaResult {
  const perIpMax = parsePositiveInt(
    process.env.GENERATE_DAILY_MAX_REQUESTS,
    0,
  );
  const globalMax = parsePositiveInt(
    process.env.GENERATE_GLOBAL_DAILY_MAX,
    0,
  );
  const today = utcDateString(now);

  // Reset stale per-IP bucket on day rollover.
  let perIpEntry = dailyHits.get(ip);
  if (!perIpEntry || perIpEntry.date !== today) {
    perIpEntry = { date: today, count: 0 };
  }
  const globalCount = globalDaily.get(today) ?? 0;

  // Fast path: nothing to enforce.
  if (perIpMax === 0 && globalMax === 0) {
    return {
      allowed: true,
      perIpCount: perIpEntry.count,
      perIpMax: 0,
      globalCount,
      globalMax: 0,
    };
  }

  if (perIpMax > 0 && perIpEntry.count >= perIpMax) {
    return {
      allowed: false,
      perIpCount: perIpEntry.count,
      perIpMax,
      globalCount,
      globalMax,
      reason: "per-ip-daily",
    };
  }
  if (globalMax > 0 && globalCount >= globalMax) {
    return {
      allowed: false,
      perIpCount: perIpEntry.count,
      perIpMax,
      globalCount,
      globalMax,
      reason: "global-daily",
    };
  }

  // Consume.
  perIpEntry.count += 1;
  dailyHits.set(ip, perIpEntry);
  const nextGlobal = globalCount + 1;
  globalDaily.set(today, nextGlobal);

  return {
    allowed: true,
    perIpCount: perIpEntry.count,
    perIpMax,
    globalCount: nextGlobal,
    globalMax,
  };
}

/**
 * Test-only helper. Resets all in-memory rate-limit state so tests don't
 * leak counters across each other. Not exported as part of the public API.
 */
export function __resetRateLimitStateForTests(): void {
  hits.clear();
  dailyHits.clear();
  globalDaily.clear();
}

// Implementation note: this entire module is single-process in-memory.
// On Vercel Fluid Compute, instances are reused across concurrent requests
// in the same region but separate regions/instances maintain separate maps.
// That means the published numeric caps are upper bounds per-instance, not
// global. For strict global budgets (e.g. monthly Gemini spend), pair the
// global cap here with an external dashboard alert; or migrate the daily
// counter to Redis/KV.
