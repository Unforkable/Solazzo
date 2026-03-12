/**
 * RPC retry utilities for Solana RPC calls.
 *
 * Retry policy:
 * - 4 total attempts (initial + 3 retries)
 * - Exponential backoff: 250ms, 500ms, 1000ms (base * 2^(attempt-1))
 * - Half-to-full jitter on each delay to avoid thundering herd
 * - Max delay cap: 2000ms
 *
 * Only transient errors are retried (timeouts, 429, network failures).
 * Non-transient errors (verification failures, malformed data) throw immediately.
 *
 * Commitment rationale: "confirmed" is used throughout — the client already waits
 * for confirmed status before calling publish, and confirmed provides
 * supermajority-of-stake guarantees. Finalized would add 15-30s latency with
 * no practical security benefit for tx binding verification.
 */

/** Thrown when RPC is unavailable after all retry attempts. Maps to HTTP 503. */
export class RpcUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RpcUnavailableError";
  }
}

/** Returns true for errors indicating transient RPC issues worth retrying. */
export function isTransientRpcError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes("timeout") ||
    msg.includes("timedout") ||
    msg.includes("429") ||
    msg.includes("too many requests") ||
    msg.includes("econnrefused") ||
    msg.includes("econnreset") ||
    msg.includes("enotfound") ||
    msg.includes("fetch failed") ||
    msg.includes("network") ||
    msg.includes("socket hang up") ||
    msg.includes("aborted") ||
    msg.includes("503") ||
    msg.includes("service unavailable")
  );
}

export interface RpcRetryOpts {
  /** Total attempts including the first try. Default: 4 */
  maxAttempts?: number;
  /** Base delay in ms for exponential backoff. Default: 250 */
  baseDelayMs?: number;
  /** Maximum delay cap in ms. Default: 2000 */
  maxDelayMs?: number;
  /**
   * If true, null/undefined results are treated as transient and retried.
   * Useful for getTransaction during propagation delay.
   * Default: false
   */
  rejectNull?: boolean;
  /** @internal Test hook to override delay behavior */
  _delayFn?: (ms: number) => Promise<void>;
}

const defaultDelay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Retries an async RPC call on transient failures with exponential backoff + jitter.
 *
 * - Transient errors (timeout, 429, network failures) trigger retry.
 * - When rejectNull is true, null/undefined results trigger retry (propagation delay).
 * - Non-transient errors are thrown immediately without retry.
 * - After maxAttempts exhausted on transient failures, throws RpcUnavailableError.
 */
export async function rpcRetry<T>(
  fn: () => Promise<T>,
  opts?: RpcRetryOpts,
): Promise<T> {
  const {
    maxAttempts = 4,
    baseDelayMs = 250,
    maxDelayMs = 2000,
    rejectNull = false,
    _delayFn = defaultDelay,
  } = opts ?? {};

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn();
      if (rejectNull && result == null) {
        if (attempt === maxAttempts) {
          throw new RpcUnavailableError(
            `Null result after ${maxAttempts} attempts (transaction may not have propagated).`,
          );
        }
        await jitteredBackoff(attempt, baseDelayMs, maxDelayMs, _delayFn);
        continue;
      }
      return result;
    } catch (err) {
      // Already classified — don't wrap again
      if (err instanceof RpcUnavailableError) throw err;
      // Non-transient error — fail immediately, no retry
      if (!isTransientRpcError(err)) throw err;
      // Transient error — retry or give up
      if (attempt === maxAttempts) {
        throw new RpcUnavailableError(
          `RPC unavailable after ${maxAttempts} attempts: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
      await jitteredBackoff(attempt, baseDelayMs, maxDelayMs, _delayFn);
    }
  }

  // Unreachable — satisfies TypeScript
  throw new RpcUnavailableError("Retry loop exited unexpectedly.");
}

async function jitteredBackoff(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
  delayFn: (ms: number) => Promise<void>,
): Promise<void> {
  const exponential = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
  // Half-to-full jitter: random in [exponential * 0.5, exponential]
  const jittered = exponential * (0.5 + Math.random() * 0.5);
  await delayFn(jittered);
}
