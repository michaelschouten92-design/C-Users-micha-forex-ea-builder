import { createHash, timingSafeEqual } from "crypto";
import { prisma } from "./prisma";
import { NextResponse } from "next/server";
import { telemetryRateLimiter, checkRateLimit } from "./rate-limit";
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
 * Authenticate a telemetry request: check Content-Type, verify API key, rate limit.
 * Returns the instance info or a NextResponse error.
 *
 * Rate limiting applies to ALL requests (valid or invalid key) to prevent
 * brute-force key enumeration. Invalid keys are rate-limited by IP.
 */
export async function authenticateTelemetry(
  request: Request
): Promise<
  { success: true; instanceId: string; userId: string } | { success: false; response: NextResponse }
> {
  // Content-Type check
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

  const apiKey = request.headers.get("X-EA-Key")?.trim();

  if (!apiKey) {
    return {
      success: false,
      response: NextResponse.json(apiError(ErrorCode.MISSING_API_KEY, "Missing X-EA-Key header"), {
        status: 401,
      }),
    };
  }

  // Strict format check before any DB work
  if (!HEX_KEY_RE.test(apiKey)) {
    return {
      success: false,
      response: NextResponse.json(apiError(ErrorCode.INVALID_API_KEY, "Invalid API key format"), {
        status: 401,
      }),
    };
  }

  // Rate limit ALL requests (valid or invalid) to prevent brute-force enumeration.
  // Valid keys are limited by key hash; invalid keys by a global bucket.
  const keyHash = hashApiKey(apiKey);
  const rateLimitResult = await checkRateLimit(telemetryRateLimiter, `telemetry:${keyHash}`);

  if (!rateLimitResult.success) {
    return {
      success: false,
      response: NextResponse.json(apiError(ErrorCode.RATE_LIMITED, "Rate limit exceeded"), {
        status: 429,
      }),
    };
  }

  // Verify key
  const instance = await verifyTelemetryApiKey(apiKey);
  if (!instance) {
    return {
      success: false,
      response: NextResponse.json(apiError(ErrorCode.INVALID_API_KEY, "Invalid API key"), {
        status: 401,
      }),
    };
  }

  return { success: true, ...instance };
}
