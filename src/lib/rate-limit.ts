/**
 * Rate limiter with Upstash Redis support for production
 * and in-memory fallback for development.
 *
 * Configure UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
 * environment variables to enable Redis-based rate limiting.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ============================================
// TYPES
// ============================================

interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  limit: number;
  /** Time window in milliseconds */
  windowMs: number;
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
}

// ============================================
// IN-MEMORY FALLBACK (development / single instance)
// ============================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class InMemoryRateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private config: RateLimitConfig;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: RateLimitConfig) {
    this.config = config;
    this.startCleanup();
  }

  private startCleanup() {
    if (typeof setInterval !== "undefined" && !this.cleanupInterval) {
      this.cleanupInterval = setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of this.store.entries()) {
          if (entry.resetAt <= now) {
            this.store.delete(key);
          }
        }
      }, 60000);

      if (this.cleanupInterval.unref) {
        this.cleanupInterval.unref();
      }
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

// ============================================
// UPSTASH REDIS RATE LIMITER
// ============================================

class UpstashRateLimiter {
  private ratelimit: Ratelimit;
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig, redis: Redis) {
    this.config = config;

    // Convert windowMs to seconds for Upstash sliding window
    const windowSec = Math.ceil(config.windowMs / 1000);
    this.ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(config.limit, `${windowSec} s`),
      analytics: false,
    });
  }

  async checkAsync(key: string): Promise<RateLimitResult> {
    const result = await this.ratelimit.limit(key);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      resetAt: new Date(result.reset),
    };
  }

  // Synchronous check is not supported with Upstash Redis.
  // All callers MUST use checkRateLimit() (async) instead.
  check(_key: string): RateLimitResult {
    throw new Error(
      "UpstashRateLimiter requires async check. Use checkRateLimit() instead of limiter.check()."
    );
  }
}

// ============================================
// FACTORY: Create rate limiter based on environment
// ============================================

const useRedis = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

if (!useRedis && process.env.NODE_ENV === "production") {
  const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
  if (!isBuildPhase) {
    throw new Error(
      "[rate-limit] FATAL: UPSTASH_REDIS_REST_URL/TOKEN not configured. " +
        "In-memory rate limiting does NOT work across multiple Vercel instances. " +
        "Configure Upstash Redis for production."
    );
  }
}

let redis: Redis | null = null;
if (useRedis) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

interface RateLimiter {
  check(key: string): RateLimitResult;
  checkAsync?(key: string): Promise<RateLimitResult>;
}

function createRateLimiter(config: RateLimitConfig): RateLimiter {
  if (useRedis && redis) {
    return new UpstashRateLimiter(config, redis);
  }
  return new InMemoryRateLimiter(config);
}

/**
 * Async-aware rate limit check.
 * Uses Redis when available, falls back to in-memory.
 */
export async function checkRateLimit(limiter: RateLimiter, key: string): Promise<RateLimitResult> {
  if (limiter.checkAsync) {
    return limiter.checkAsync(key);
  }
  return limiter.check(key);
}

// ============================================
// PRE-CONFIGURED RATE LIMITERS
// ============================================

/**
 * Rate limiter for export endpoint
 * Limits: 10 exports per hour per user
 */
export const exportRateLimiter = createRateLimiter({
  limit: 10,
  windowMs: 60 * 60 * 1000, // 1 hour
});

/**
 * Rate limiter for password reset requests
 * Limits: 5 requests per 15 minutes per email
 */
export const passwordResetRateLimiter = createRateLimiter({
  limit: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
});

/**
 * Rate limiter for login attempts
 * Limits: 10 attempts per 15 minutes per IP
 */
export const loginRateLimiter = createRateLimiter({
  limit: 10,
  windowMs: 15 * 60 * 1000, // 15 minutes
});

/**
 * Rate limiter for registration attempts
 * Limits: 5 registrations per hour per IP/email
 */
export const registrationRateLimiter = createRateLimiter({
  limit: 5,
  windowMs: 60 * 60 * 1000, // 1 hour
});

/**
 * Rate limiter for login attempts by IP
 * Limits: 20 attempts per 15 minutes per IP (prevents credential stuffing)
 */
export const loginIpRateLimiter = createRateLimiter({
  limit: 20,
  windowMs: 15 * 60 * 1000, // 15 minutes
});

/**
 * Rate limiter for API requests (general)
 * Limits: 100 requests per minute per user
 */
export const apiRateLimiter = createRateLimiter({
  limit: 100,
  windowMs: 60 * 1000, // 1 minute
});

/**
 * Rate limiter for GDPR data export
 * Limits: 3 exports per hour per user
 */
export const gdprExportRateLimiter = createRateLimiter({
  limit: 3,
  windowMs: 60 * 60 * 1000, // 1 hour
});

/**
 * Rate limiter for GDPR account deletion
 * Limits: 2 attempts per 24 hours per user
 */
export const gdprDeleteRateLimiter = createRateLimiter({
  limit: 2,
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
});

/**
 * Rate limiter for password changes
 * Limits: 5 attempts per hour per user
 */
export const changePasswordRateLimiter = createRateLimiter({
  limit: 5,
  windowMs: 60 * 60 * 1000, // 1 hour
});

/**
 * Rate limiter for project deletion
 * Limits: 10 deletions per hour per user
 */
export const projectDeleteRateLimiter = createRateLimiter({
  limit: 10,
  windowMs: 60 * 60 * 1000, // 1 hour
});

/**
 * Rate limiter for resend verification email
 * Limits: 3 requests per 15 minutes per user
 */
export const resendVerificationRateLimiter = createRateLimiter({
  limit: 3,
  windowMs: 15 * 60 * 1000, // 15 minutes
});

/**
 * Rate limiter for contact form
 * Limits: 3 messages per hour per IP
 */
export const contactFormRateLimiter = createRateLimiter({
  limit: 3,
  windowMs: 60 * 60 * 1000, // 1 hour
});

/**
 * Rate limiter for email verification
 * Limits: 10 attempts per 15 minutes per IP (prevents token brute-force)
 */
export const verifyEmailRateLimiter = createRateLimiter({
  limit: 10,
  windowMs: 15 * 60 * 1000, // 15 minutes
});

/**
 * Rate limiter for admin endpoints
 * Limits: 30 requests per minute per admin user
 */
export const adminRateLimiter = createRateLimiter({
  limit: 30,
  windowMs: 60 * 1000, // 1 minute
});

/**
 * Rate limiter for admin OTP generation
 * Limits: 3 requests per 15 minutes per admin user
 */
export const adminOtpRateLimiter = createRateLimiter({
  limit: 3,
  windowMs: 15 * 60 * 1000, // 15 minutes
});

/**
 * Rate limiter for admin OTP verification attempts
 * Limits: 5 attempts per 10 minutes per email (prevents brute-force on 6-digit codes)
 */
export const adminOtpVerifyRateLimiter = createRateLimiter({
  limit: 5,
  windowMs: 10 * 60 * 1000, // 10 minutes
});

/**
 * Rate limiter for admin mutation endpoints (suspend, delete, etc.)
 * Limits: 10 requests per minute per admin user
 */
export const adminMutationRateLimiter = createRateLimiter({
  limit: 10,
  windowMs: 60 * 1000, // 1 minute
});

/**
 * Rate limiter for admin bulk operations (bulk-upgrade, bulk-email)
 * Limits: 5 requests per minute per admin user
 */
export const adminBulkRateLimiter = createRateLimiter({
  limit: 5,
  windowMs: 60 * 1000, // 1 minute
});

/**
 * Rate limiter for CSV export endpoints
 * Limits: 5 exports per hour per admin user
 */
export const csvExportRateLimiter = createRateLimiter({
  limit: 5,
  windowMs: 60 * 60 * 1000, // 1 hour
});

/**
 * Rate limiter for admin OTP by IP address
 * Limits: 10 attempts per 15 minutes per IP (prevents distributed brute-force)
 */
export const adminOtpIpRateLimiter = createRateLimiter({
  limit: 10,
  windowMs: 15 * 60 * 1000, // 15 minutes
});

/**
 * Rate limiter for telemetry endpoints (EA heartbeats, trades, errors)
 * Limits: 20 requests per minute per API key
 */
export const telemetryRateLimiter = createRateLimiter({
  limit: 20,
  windowMs: 60 * 1000, // 1 minute
});

/**
 * Rate limiter for AI strategy generation (free-tier daily limit)
 * Limits: 5 generations per 24 hours per user
 */
export const aiDailyGenerationLimiter = createRateLimiter({
  limit: 5,
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
});

/**
 * Rate limiter for public verification endpoints
 * Limits: 5 requests per minute per IP
 */
export const verifyRateLimiter = createRateLimiter({
  limit: 5,
  windowMs: 60 * 1000, // 1 minute
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Create rate limit headers for response
 */
export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const resetEpoch = Math.floor(result.resetAt.getTime() / 1000);
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": resetEpoch.toString(),
  };

  // Add standard Retry-After header when rate limited
  if (!result.success) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((result.resetAt.getTime() - Date.now()) / 1000)
    );
    headers["Retry-After"] = retryAfterSeconds.toString();
  }

  return headers;
}

/**
 * Format rate limit error message
 */
export function formatRateLimitError(result: RateLimitResult): string {
  const resetInSeconds = Math.ceil((result.resetAt.getTime() - Date.now()) / 1000);
  const resetInMinutes = Math.ceil(resetInSeconds / 60);

  if (resetInMinutes > 1) {
    return `Rate limit exceeded. Try again in ${resetInMinutes} minutes.`;
  }
  return `Rate limit exceeded. Try again in ${resetInSeconds} seconds.`;
}

/**
 * Extract client IP from request headers.
 * Uses x-forwarded-for (leftmost entry) which is safe when behind a trusted proxy
 * (Vercel always overwrites/appends the real IP). For self-hosted deployments
 * without a trusted reverse proxy, the x-forwarded-for header can be spoofed.
 * Ensure the deployment is behind a proxy that strips client-supplied XFF headers.
 */
export function getClientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

// Export types
export type { RateLimitConfig, RateLimitResult };
