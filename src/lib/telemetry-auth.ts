import { createHash } from "crypto";
import { prisma } from "./prisma";
import { NextResponse } from "next/server";
import { telemetryRateLimiter, checkRateLimit } from "./rate-limit";

// ============================================
// API KEY VERIFICATION
// ============================================

/**
 * Hash an API key with SHA-256 for lookup
 */
export function hashApiKey(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex");
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
  if (!apiKey || apiKey.length < 32) return null;

  const hash = hashApiKey(apiKey);

  // 1. Try current key
  const instance = await prisma.liveEAInstance.findUnique({
    where: { apiKeyHash: hash },
    select: { id: true, userId: true },
  });

  if (instance) return { instanceId: instance.id, userId: instance.userId };

  // 2. Try previous key (grace period)
  const gracePeriodInstance = await prisma.liveEAInstance.findFirst({
    where: {
      apiKeyHashPrev: hash,
      keyGracePeriodEnd: { gt: new Date() },
    },
    select: { id: true, userId: true },
  });

  if (gracePeriodInstance) {
    return { instanceId: gracePeriodInstance.id, userId: gracePeriodInstance.userId };
  }

  return null;
}

/**
 * Authenticate a telemetry request: verify API key + rate limit.
 * Returns the instance info or a NextResponse error.
 */
export async function authenticateTelemetry(
  request: Request
): Promise<
  { success: true; instanceId: string; userId: string } | { success: false; response: NextResponse }
> {
  const apiKey = request.headers.get("X-EA-Key");

  if (!apiKey) {
    return {
      success: false,
      response: NextResponse.json({ error: "Missing X-EA-Key header" }, { status: 401 }),
    };
  }

  // Verify key first, then rate limit (prevents DoS on arbitrary key hashes)
  const instance = await verifyTelemetryApiKey(apiKey);
  if (!instance) {
    return {
      success: false,
      response: NextResponse.json({ error: "Invalid API key" }, { status: 401 }),
    };
  }

  // Rate limit by API key hash (only for valid keys)
  const keyHash = hashApiKey(apiKey);
  const rateLimitResult = await checkRateLimit(telemetryRateLimiter, `telemetry:${keyHash}`);

  if (!rateLimitResult.success) {
    return {
      success: false,
      response: NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 }),
    };
  }

  return { success: true, ...instance };
}
