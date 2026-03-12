import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  rpcRetry,
  RpcUnavailableError,
  isTransientRpcError,
} from "../rpc-retry";

const noDelay = async () => {};

// ── isTransientRpcError ──────────────────────────────────────────────

describe("isTransientRpcError", () => {
  it("identifies timeout errors as transient", () => {
    assert.ok(isTransientRpcError(new Error("Request timeout")));
    assert.ok(isTransientRpcError(new Error("ETIMEDOUT")));
  });

  it("identifies rate-limit errors as transient", () => {
    assert.ok(isTransientRpcError(new Error("429 Too Many Requests")));
    assert.ok(isTransientRpcError(new Error("too many requests")));
  });

  it("identifies network errors as transient", () => {
    assert.ok(isTransientRpcError(new Error("ECONNREFUSED")));
    assert.ok(isTransientRpcError(new Error("ECONNRESET")));
    assert.ok(isTransientRpcError(new Error("ENOTFOUND")));
    assert.ok(isTransientRpcError(new Error("fetch failed")));
    assert.ok(isTransientRpcError(new Error("socket hang up")));
  });

  it("identifies 503 errors as transient", () => {
    assert.ok(isTransientRpcError(new Error("503 Service Unavailable")));
    assert.ok(isTransientRpcError(new Error("service unavailable")));
  });

  it("does NOT classify binding/verification errors as transient", () => {
    assert.ok(!isTransientRpcError(new Error("Wallet not found in claim transaction accounts.")));
    assert.ok(!isTransientRpcError(new Error("No claim_unfilled_slot instruction found for this slot.")));
    assert.ok(!isTransientRpcError(new Error("Claim transaction failed on-chain.")));
    assert.ok(!isTransientRpcError(new Error("Solazzo program not found in claim transaction.")));
    assert.ok(!isTransientRpcError(new Error("Slot PDA not found in claim transaction accounts.")));
  });

  it("returns false for non-Error values", () => {
    assert.ok(!isTransientRpcError("timeout"));
    assert.ok(!isTransientRpcError(null));
    assert.ok(!isTransientRpcError(undefined));
    assert.ok(!isTransientRpcError(429));
  });
});

// ── rpcRetry ─────────────────────────────────────────────────────────

describe("rpcRetry", () => {
  it("returns result on first success (no retry)", async () => {
    let calls = 0;
    const result = await rpcRetry(
      async () => { calls++; return "ok"; },
      { _delayFn: noDelay },
    );
    assert.equal(result, "ok");
    assert.equal(calls, 1);
  });

  // ── Transient then success (passes) ────────────────────────────────

  it("retries transient error then succeeds", async () => {
    let calls = 0;
    const result = await rpcRetry(
      async () => {
        calls++;
        if (calls < 3) throw new Error("request timeout");
        return "recovered";
      },
      { _delayFn: noDelay },
    );
    assert.equal(result, "recovered");
    assert.equal(calls, 3);
  });

  it("retries null result (propagation delay) then succeeds", async () => {
    let calls = 0;
    const result = await rpcRetry(
      async () => {
        calls++;
        if (calls < 3) return null;
        return "found";
      },
      { rejectNull: true, _delayFn: noDelay },
    );
    assert.equal(result, "found");
    assert.equal(calls, 3);
  });

  it("retries mixed null + transient error then succeeds", async () => {
    let calls = 0;
    const result = await rpcRetry(
      async () => {
        calls++;
        if (calls === 1) return null;              // null → retry
        if (calls === 2) throw new Error("timeout"); // transient → retry
        return "ok";                                  // success
      },
      { rejectNull: true, _delayFn: noDelay },
    );
    assert.equal(result, "ok");
    assert.equal(calls, 3);
  });

  // ── Persistent transient failure (503 path) ────────────────────────

  it("throws RpcUnavailableError after exhausting retries on transient errors", async () => {
    let calls = 0;
    await assert.rejects(
      () => rpcRetry(
        async () => { calls++; throw new Error("ECONNREFUSED"); },
        { maxAttempts: 3, _delayFn: noDelay },
      ),
      (err: unknown) => {
        assert.ok(err instanceof RpcUnavailableError);
        assert.ok((err as Error).message.includes("3 attempts"));
        assert.ok((err as Error).message.includes("ECONNREFUSED"));
        return true;
      },
    );
    assert.equal(calls, 3);
  });

  it("throws RpcUnavailableError after exhausting retries on persistent null", async () => {
    let calls = 0;
    await assert.rejects(
      () => rpcRetry(
        async () => { calls++; return null; },
        { rejectNull: true, maxAttempts: 4, _delayFn: noDelay },
      ),
      (err: unknown) => {
        assert.ok(err instanceof RpcUnavailableError);
        assert.ok((err as Error).message.includes("4 attempts"));
        assert.ok((err as Error).message.includes("propagated"));
        return true;
      },
    );
    assert.equal(calls, 4);
  });

  // ── Definitive binding mismatch (403 path) ─────────────────────────

  it("throws non-transient error immediately without retry", async () => {
    let calls = 0;
    await assert.rejects(
      () => rpcRetry(
        async () => { calls++; throw new Error("Wallet not found in claim transaction accounts."); },
        { _delayFn: noDelay },
      ),
      (err: unknown) => {
        assert.ok(!(err instanceof RpcUnavailableError));
        assert.ok((err as Error).message.includes("Wallet not found"));
        return true;
      },
    );
    assert.equal(calls, 1, "must not retry on definitive binding error");
  });

  it("throws binding mismatch immediately even if previous attempts had transient errors", async () => {
    let calls = 0;
    await assert.rejects(
      () => rpcRetry(
        async () => {
          calls++;
          if (calls === 1) throw new Error("timeout");
          // Second attempt: definitive failure
          throw new Error("Solazzo program not found in claim transaction.");
        },
        { _delayFn: noDelay },
      ),
      (err: unknown) => {
        assert.ok(!(err instanceof RpcUnavailableError));
        assert.ok((err as Error).message.includes("Solazzo program not found"));
        return true;
      },
    );
    assert.equal(calls, 2);
  });

  // ── Edge cases ─────────────────────────────────────────────────────

  it("respects maxAttempts option", async () => {
    let calls = 0;
    await assert.rejects(
      () => rpcRetry(
        async () => { calls++; throw new Error("timeout"); },
        { maxAttempts: 2, _delayFn: noDelay },
      ),
      RpcUnavailableError,
    );
    assert.equal(calls, 2);
  });

  it("does not retry null when rejectNull is false (default)", async () => {
    let calls = 0;
    const result = await rpcRetry(
      async () => { calls++; return null; },
      { rejectNull: false, _delayFn: noDelay },
    );
    assert.equal(result, null);
    assert.equal(calls, 1);
  });

  it("does not wrap RpcUnavailableError again", async () => {
    await assert.rejects(
      () => rpcRetry(
        async () => { throw new RpcUnavailableError("already classified"); },
        { _delayFn: noDelay },
      ),
      (err: unknown) => {
        assert.ok(err instanceof RpcUnavailableError);
        assert.equal((err as Error).message, "already classified");
        return true;
      },
    );
  });

  it("calls delay function between retries", async () => {
    const delays: number[] = [];
    let calls = 0;
    await assert.rejects(
      () => rpcRetry(
        async () => { calls++; throw new Error("timeout"); },
        {
          maxAttempts: 3,
          baseDelayMs: 100,
          maxDelayMs: 500,
          _delayFn: async (ms) => { delays.push(ms); },
        },
      ),
      RpcUnavailableError,
    );
    assert.equal(calls, 3);
    assert.equal(delays.length, 2, "should delay between attempts 1→2 and 2→3");
    // First delay: jitter of 100ms base (50-100ms range)
    assert.ok(delays[0] >= 50 && delays[0] <= 100, `first delay ${delays[0]} should be 50-100`);
    // Second delay: jitter of 200ms base (100-200ms range)
    assert.ok(delays[1] >= 100 && delays[1] <= 200, `second delay ${delays[1]} should be 100-200`);
  });
});
