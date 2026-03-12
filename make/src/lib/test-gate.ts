import { NextResponse } from "next/server";

const isProd = process.env.NODE_ENV === "production";

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

function log(
  route: string,
  allowed: boolean,
  reason: string,
  ip: string,
) {
  const ts = new Date().toISOString();
  console.log(
    `[gate] ${route} ${allowed ? "allowed" : "blocked"} reason=${reason} ip=${ip} ts=${ts}`,
  );
}

/**
 * Check the `x-internal-test-key` header against `INTERNAL_TEST_KEY` env var.
 *
 * - Prod without env var: fail CLOSED (always 401).
 * - Local dev without env var: fail OPEN (always allowed).
 * - With env var: header must match.
 *
 * Returns `null` if allowed, or a 401 `NextResponse` if blocked.
 */
export function testGate(
  request: Request,
  route: string,
): NextResponse | null {
  const ip = getClientIp(request);
  const key = process.env.INTERNAL_TEST_KEY;

  // No key configured
  if (!key) {
    if (isProd) {
      log(route, false, "no-key-configured", ip);
      return NextResponse.json(
        { error: "Service unavailable — test key not configured." },
        { status: 401 },
      );
    }
    // Local dev: open
    log(route, true, "dev-open", ip);
    return null;
  }

  // Key configured — validate header
  const header = request.headers.get("x-internal-test-key");
  if (header !== key) {
    log(route, false, header ? "wrong-key" : "missing-key", ip);
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 },
    );
  }

  log(route, true, "valid-key", ip);
  return null;
}

/**
 * Check whether generation is enabled.
 * Returns `null` if enabled, or a 503 `NextResponse` if disabled.
 */
export function generationGate(): NextResponse | null {
  if (process.env.GENERATION_ENABLED === "false") {
    return NextResponse.json(
      { error: "Generation is temporarily disabled." },
      { status: 503 },
    );
  }
  return null;
}

/**
 * Check whether the trait editor is accessible in the current environment.
 *
 * - TEST_MODE=true or local dev: allowed.
 * - TEST_MODE=false in prod: blocked unless ENABLE_TRAIT_EDITOR_IN_PROD=true.
 *
 * Returns `null` if allowed, or a 403 `NextResponse` if blocked.
 */
export function traitEditorGate(): NextResponse | null {
  if (!isProd) return null;
  if (process.env.TEST_MODE === "true") return null;
  if (process.env.ENABLE_TRAIT_EDITOR_IN_PROD === "true") return null;

  return NextResponse.json(
    { error: "Trait editor is disabled in production." },
    { status: 403 },
  );
}
