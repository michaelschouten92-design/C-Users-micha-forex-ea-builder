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
 */
export async function verifyTelemetryApiKey(
  apiKey: string
): Promise<{ instanceId: string; userId: string } | null> {
  if (!apiKey || apiKey.length < 32) return null;

  const hash = hashApiKey(apiKey);
  const instance = await prisma.liveEAInstance.findUnique({
    where: { apiKeyHash: hash },
    select: { id: true, userId: true },
  });

  if (!instance) return null;
  return { instanceId: instance.id, userId: instance.userId };
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

  // Rate limit by API key hash (avoid storing plaintext key)
  const keyHash = hashApiKey(apiKey);
  const rateLimitResult = await checkRateLimit(telemetryRateLimiter, `telemetry:${keyHash}`);

  if (!rateLimitResult.success) {
    return {
      success: false,
      response: NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 }),
    };
  }

  const instance = await verifyTelemetryApiKey(apiKey);
  if (!instance) {
    return {
      success: false,
      response: NextResponse.json({ error: "Invalid API key" }, { status: 401 }),
    };
  }

  return { success: true, ...instance };
}
