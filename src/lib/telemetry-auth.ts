import { createHash } from "crypto";
import { prisma } from "./prisma";
import { NextResponse } from "next/server";

// ============================================
// TELEMETRY RATE LIMITER
// ============================================

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class InMemoryTelemetryLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private config = { limit: 20, windowMs: 60_000 };
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startCleanup();
  }

  private startCleanup() {
    if (typeof setInterval !== "undefined" && !this.cleanupInterval) {
      this.cleanupInterval = setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of this.store.entries()) {
          if (entry.resetAt <= now) this.store.delete(key);
        }
      }, 60000);
      if (this.cleanupInterval.unref) this.cleanupInterval.unref();
    }
  }

  check(key: string): RateLimitResult {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || entry.resetAt <= now) {
      const resetAt = now + this.config.windowMs;
      this.store.set(key, { count: 1, resetAt });
      return {
        success: true,
        limit: this.config.limit,
        remaining: this.config.limit - 1,
        resetAt: new Date(resetAt),
      };
    }

    if (entry.count >= this.config.limit) {
      return {
        success: false,
        limit: this.config.limit,
        remaining: 0,
        resetAt: new Date(entry.resetAt),
      };
    }

    entry.count++;
    return {
      success: true,
      limit: this.config.limit,
      remaining: this.config.limit - entry.count,
      resetAt: new Date(entry.resetAt),
    };
  }
}

const telemetryLimiter = new InMemoryTelemetryLimiter();

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
  const rateLimitResult = telemetryLimiter.check(`telemetry:${keyHash}`);

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
