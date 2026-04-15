/**
 * In-memory rate limiter.
 *
 * Each Vercel instance maintains its own counters. At single-user scale
 * this provides sufficient protection. For multi-tenant production with
 * many concurrent users, consider adding a distributed backend.
 */

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
// IN-MEMORY RATE LIMITER
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
// FACTORY
// ============================================

interface RateLimiter {
  check(key: string): RateLimitResult;
}

function createRateLimiter(config: RateLimitConfig): RateLimiter {
  return new InMemoryRateLimiter(config);
}

/**
 * Async-compatible rate limit check.
 * Returns synchronously via the in-memory backend.
 */
export async function checkRateLimit(limiter: RateLimiter, key: string): Promise<RateLimitResult> {
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
 * Rate limiter for the public referral click endpoint, keyed by IP. Combined
 * with the (partnerId, ipHash, day) DB dedup, this caps automated click
 * stuffing at a single attribution per IP per day plus a small in-memory
 * budget for legitimate retries.
 */
export const referralClickRateLimiter = createRateLimiter({
  limit: 30,
  windowMs: 60 * 60 * 1000, // 1 hour
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
 * Pre-auth rate limiter for telemetry endpoints.
 * Keyed by hashed client IP — applies to ALL requests regardless of key validity.
 * Prevents brute-force key enumeration.
 * Limits: 300 requests per minute per IP
 *
 * Account-wide monitoring sends heartbeats for base + N auto-discovered
 * contexts every ~5s, plus track-record ingest events. With 6 contexts
 * that is 72+ heartbeats/min from one IP before ingest events.
 * 300/min accommodates up to ~25 contexts with headroom.
 */
export const telemetryPreauthRateLimiter = createRateLimiter({
  limit: 300,
  windowMs: 60 * 1000, // 1 minute
});

/**
 * Post-auth rate limiter for telemetry endpoints (EA heartbeats, trades, errors)
 * Keyed by verified instanceId (base instance in account-wide mode).
 * All context heartbeats share the base instanceId for auth, so the limit
 * must accommodate N contexts x cycles/min + ingest events.
 * Limits: 120 requests per minute per instance
 */
export const telemetryRateLimiter = createRateLimiter({
  limit: 120,
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
 * Rate limiters for backtest uploads (tiered by plan)
 * FREE: 5 uploads per 24 hours
 * PRO: 30 uploads per 24 hours
 * ELITE: 100 uploads per 24 hours
 */
export const backtestUploadFreeRateLimiter = createRateLimiter({
  limit: 5,
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
});

export const backtestUploadProRateLimiter = createRateLimiter({
  limit: 30,
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
});

export const backtestUploadEliteRateLimiter = createRateLimiter({
  limit: 100,
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
});

/**
 * Rate limiters for AI backtest analysis (tiered by plan)
 * FREE: 5 analyses per 24 hours
 * PRO: 20 analyses per 24 hours
 * ELITE: 100 analyses per 24 hours (effectively unlimited)
 */
export const aiAnalysisFreeRateLimiter = createRateLimiter({
  limit: 5,
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
});

export const aiAnalysisProRateLimiter = createRateLimiter({
  limit: 20,
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
});

export const aiAnalysisEliteRateLimiter = createRateLimiter({
  limit: 100,
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

/**
 * Rate limiter for internal verify endpoint
 * Limits: 20 requests per minute per IP
 */
export const internalVerifyRateLimiter = createRateLimiter({
  limit: 20,
  windowMs: 60 * 1000, // 1 minute
});

/**
 * Rate limiter for internal proof events endpoint
 * Limits: 30 requests per minute per IP
 */
export const internalProofEventsRateLimiter = createRateLimiter({
  limit: 30,
  windowMs: 60 * 1000, // 1 minute
});

/**
 * Rate limiter for internal trade CSV import endpoint
 * Limits: 10 requests per minute per IP (lower than verify — import is heavier)
 */
export const internalTradeImportRateLimiter = createRateLimiter({
  limit: 10,
  windowMs: 60 * 1000, // 1 minute
});

/**
 * Rate limiter for internal webhook ingest endpoint
 * Limits: 30 requests per minute per IP (higher than import-csv — webhooks may batch-fire)
 */
export const internalWebhookIngestRateLimiter = createRateLimiter({
  limit: 30,
  windowMs: 60 * 1000, // 1 minute
});

/**
 * Rate limiter for internal operator action endpoint
 * Limits: 10 requests per minute per IP
 */
export const internalOperatorActionRateLimiter = createRateLimiter({
  limit: 10,
  windowMs: 60 * 1000, // 1 minute
});

/**
 * Rate limiter for internal override endpoints
 * Limits: 10 requests per minute per IP
 */
export const internalOverrideRateLimiter = createRateLimiter({
  limit: 10,
  windowMs: 60 * 1000, // 1 minute
});

/**
 * Rate limiter for public API endpoints (unauthenticated)
 * Limits: 30 requests per minute per IP
 */
export const publicApiRateLimiter = createRateLimiter({
  limit: 30,
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

/**
 * Rate limiter for AI strategy optimization (Elite only)
 * Limits: 20 optimizations per 24 hours per user
 */
export const aiOptimizationEliteRateLimiter = createRateLimiter({
  limit: 20,
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
});

/**
 * Rate limiter for SSE stream connections
 * Limits: 5 concurrent connection attempts per minute per user
 * (prevents database overload from multiple simultaneous streams)
 */
export const sseConnectionRateLimiter = createRateLimiter({
  limit: 5,
  windowMs: 60 * 1000, // 1 minute
});

/**
 * Rate limiter for internal notification processor
 * Limits: 5 invocations per minute per IP
 */
export const internalNotificationProcessRateLimiter = createRateLimiter({
  limit: 5,
  windowMs: 60 * 1000, // 1 minute
});

/**
 * Rate limiter for internal incident processor
 * Limits: 5 invocations per minute per IP
 */
export const internalIncidentProcessRateLimiter = createRateLimiter({
  limit: 5,
  windowMs: 60 * 1000, // 1 minute
});

/**
 * Rate limiter for internal integrity check
 * Limits: 3 invocations per 5 minutes per IP
 */
export const internalIntegrityCheckRateLimiter = createRateLimiter({
  limit: 3,
  windowMs: 5 * 60 * 1000, // 5 minutes
});

/**
 * Rate limiter for internal ops overview dashboard
 * Limits: 30 requests per minute per IP (read-only, higher allowance)
 */
export const internalOpsOverviewRateLimiter = createRateLimiter({
  limit: 30,
  windowMs: 60 * 1000, // 1 minute
});

/**
 * Rate limiter for internal strategy overview endpoint
 * Limits: 60 requests per minute per IP (read-only detail view)
 */
export const internalStrategyOverviewRateLimiter = createRateLimiter({
  limit: 60,
  windowMs: 60 * 1000, // 1 minute
});

/**
 * Rate limiter for internal incident drilldown endpoint
 * Limits: 60 requests per minute per IP (read-only detail view)
 */
export const internalIncidentDrilldownRateLimiter = createRateLimiter({
  limit: 60,
  windowMs: 60 * 1000, // 1 minute
});

/**
 * Rate limiter for internal override drilldown endpoint
 * Limits: 60 requests per minute per IP (read-only detail view)
 */
export const internalOverrideDrilldownRateLimiter = createRateLimiter({
  limit: 60,
  windowMs: 60 * 1000, // 1 minute
});

/**
 * Rate limiter for internal strategy timeline endpoint
 * Limits: 60 requests per minute per IP (read-only feed)
 */
export const internalStrategyTimelineRateLimiter = createRateLimiter({
  limit: 60,
  windowMs: 60 * 1000, // 1 minute
});

/**
 * Rate limiter for internal strategy trends endpoint
 * Limits: 60 requests per minute per IP (read-only aggregates)
 */
export const internalStrategyTrendsRateLimiter = createRateLimiter({
  limit: 60,
  windowMs: 60 * 1000, // 1 minute
});

/**
 * Rate limiter for internal audit replay endpoint
 * Limits: 30 requests per minute per IP (heavier computation)
 */
export const internalAuditReplayRateLimiter = createRateLimiter({
  limit: 30,
  windowMs: 60 * 1000, // 1 minute
});

/**
 * Rate limiter for internal heartbeat endpoint
 * Limits: 60 requests per minute per IP
 */
export const internalHeartbeatRateLimiter = createRateLimiter({
  limit: 60,
  windowMs: 60 * 1000, // 1 minute
});

/**
 * Rate limiter for internal heartbeat analytics endpoint
 * Limits: 30 requests per minute per IP (heavier aggregation)
 */
export const internalHeartbeatAnalyticsRateLimiter = createRateLimiter({
  limit: 30,
  windowMs: 60 * 1000, // 1 minute
});

// Export types
export type { RateLimitConfig, RateLimitResult };
