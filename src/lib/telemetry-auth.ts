import { createHash, timingSafeEqual } from "crypto";
import { prisma } from "./prisma";
import { NextResponse } from "next/server";
import {
  telemetryRateLimiter,
  telemetryPreauthRateLimiter,
  checkRateLimit,
  getClientIp,
} from "./rate-limit";
import { apiError, ErrorCode } from "./error-codes";
import { checkContentType } from "./validations";

// ============================================
// API KEY VERIFICATION
// ============================================

/** Strict hex key pattern: 32-128 hex chars */
const HEX_KEY_RE = /^[0-9a-fA-F]{32,128}$/;

/**
 * Hash an API key with SHA-256 for lookup
 */
export function hashApiKey(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex");
}

/** Hash a client IP so we never store raw IPs in memory */
function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

/**
 * Timing-safe comparison of two hex hash strings.
 * Falls back to strict equality if lengths differ (already leaks length, but
 * our hashes are always 64 chars so this only guards against bugs).
 */
function safeHashCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
}

/**
 * Verify a telemetry API key and return the instance ID.
 * Returns null if the key is invalid.
 *
 * Supports key rotation: first checks the current key hash,
 * then falls back to the previous key hash if still within the grace period.
 *
 * Security: Each API key maps to exactly one instance via apiKeyHash.
 * This provides per-instance context — a leaked key can only affect
 * the single instance it belongs to, not other instances owned by the same user.
 */
export async function verifyTelemetryApiKey(
  apiKey: string
): Promise<{ instanceId: string; userId: string } | null> {
  const trimmed = apiKey.trim();
  if (!trimmed || !HEX_KEY_RE.test(trimmed)) return null;

  const hash = hashApiKey(trimmed);

  // 1. Try current key
  const instance = await prisma.liveEAInstance.findUnique({
    where: { apiKeyHash: hash },
    select: { id: true, userId: true, apiKeyHash: true },
  });

  if (instance && safeHashCompare(instance.apiKeyHash, hash)) {
    return { instanceId: instance.id, userId: instance.userId };
  }

  // 2. Try previous key (grace period)
  const gracePeriodInstance = await prisma.liveEAInstance.findFirst({
    where: {
      apiKeyHashPrev: hash,
      keyGracePeriodEnd: { gt: new Date() },
    },
    select: { id: true, userId: true, apiKeyHashPrev: true },
  });

  if (
    gracePeriodInstance?.apiKeyHashPrev &&
    safeHashCompare(gracePeriodInstance.apiKeyHashPrev, hash)
  ) {
    return { instanceId: gracePeriodInstance.id, userId: gracePeriodInstance.userId };
  }

  return null;
}

/**
 * Authenticate a telemetry request: pre-auth IP rate limit → Content-Type →
 * key format check → key verification → per-instance rate limit.
 *
 * Order of operations:
 * 1. IP-based pre-auth rate limit (covers ALL requests, enumeration-safe)
 * 2. Content-Type check
 * 3. X-EA-Key presence + hex format validation
 * 4. Key verification (DB lookup)
 * 5. Per-instance rate limit (keyed by verified instanceId)
 */
export async function authenticateTelemetry(
  request: Request
): Promise<
  { success: true; instanceId: string; userId: string } | { success: false; response: NextResponse }
> {
  // ── Step 1: IP-based pre-auth rate limit ──────────────────────────
  // Runs FIRST, before any key-dependent logic. Uses hashed IP so we
  // never store raw IPs. Every request counts, including missing/invalid keys.
  const clientIp = getClientIp(request);
  const ipKey = `telemetry:preauth:${hashIp(clientIp)}`;
  const preauthResult = await checkRateLimit(telemetryPreauthRateLimiter, ipKey);

  if (!preauthResult.success) {
    return {
      success: false,
      response: NextResponse.json(apiError(ErrorCode.RATE_LIMITED, "Rate limit exceeded"), {
        status: 429,
      }),
    };
  }

  // ── Step 2: Content-Type check ────────────────────────────────────
  const ctError = checkContentType(request);
  if (ctError) {
    return {
      success: false,
      response: NextResponse.json(
        apiError(ErrorCode.INVALID_CONTENT_TYPE, "Content-Type must be application/json"),
        { status: 415 }
      ),
    };
  }

  // ── Step 3: Key presence + format ─────────────────────────────────
  const apiKey = request.headers.get("X-EA-Key")?.trim();

  if (!apiKey) {
    return {
      success: false,
      response: NextResponse.json(apiError(ErrorCode.MISSING_API_KEY, "Missing X-EA-Key header"), {
        status: 401,
      }),
    };
  }

  if (!HEX_KEY_RE.test(apiKey)) {
    return {
      success: false,
      response: NextResponse.json(apiError(ErrorCode.INVALID_API_KEY, "Invalid API key format"), {
        status: 401,
      }),
    };
  }

  // ── Step 4: Key verification ──────────────────────────────────────
  const instance = await verifyTelemetryApiKey(apiKey);
  if (!instance) {
    return {
      success: false,
      response: NextResponse.json(apiError(ErrorCode.INVALID_API_KEY, "Invalid API key"), {
        status: 401,
      }),
    };
  }

  // ── Step 5: Per-instance rate limit (post-auth) ───────────────────
  // Keyed by verified instanceId — prevents a single legitimate instance
  // from flooding the system (e.g., runaway EA loop).
  const instanceResult = await checkRateLimit(
    telemetryRateLimiter,
    `telemetry:${instance.instanceId}`
  );

  if (!instanceResult.success) {
    return {
      success: false,
      response: NextResponse.json(apiError(ErrorCode.RATE_LIMITED, "Rate limit exceeded"), {
        status: 429,
      }),
    };
  }

  return { success: true, ...instance };
}
