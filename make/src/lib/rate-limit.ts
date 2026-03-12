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
): { allowed: boolean; remaining: number } {
  const { windowMs, maxRequests } = config;
  const now = Date.now();
  const windowStart = now - windowMs;

  const timestamps = (hits.get(ip) ?? []).filter((t) => t > windowStart);

  if (timestamps.length >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  timestamps.push(now);
  hits.set(ip, timestamps);

  return { allowed: true, remaining: maxRequests - timestamps.length };
}

/** 15 generations per hour */
export const GENERATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 60 * 1000,
  maxRequests: 15,
};

/** 5 publishes per hour */
export const PUBLISH_LIMIT: RateLimitConfig = {
  windowMs: 60 * 60 * 1000,
  maxRequests: 5,
};

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}
