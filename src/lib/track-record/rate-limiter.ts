/**
 * Per-instance event rate limiter using Redis sliding window (via @upstash/ratelimit).
 *
 * Limits each EA instance to a configurable number of events per minute
 * to prevent abuse, runaway EAs, or replay attacks from flooding the ledger.
 *
 * Uses Redis for multi-server deployments. Falls back to in-memory for
 * development or when Redis is not configured.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const DEFAULT_MAX_EVENTS_PER_MINUTE = 100;
const WINDOW_MS = 60_000; // 1 minute

// Try to create Redis-backed rate limiter, fall back to in-memory
let redisLimiter: Ratelimit | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    redisLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(DEFAULT_MAX_EVENTS_PER_MINUTE, "1 m"),
      prefix: "tr_rl",
    });
  } catch {
    // Redis not available — will use in-memory fallback
  }
}

// ============================================
// IN-MEMORY FALLBACK (development / single instance)
// ============================================

interface WindowEntry {
  timestamps: number[];
}

const windows = new Map<string, WindowEntry>();

const CLEANUP_INTERVAL_MS = 5 * 60_000; // 5 minutes
let lastCleanup = Date.now();

function cleanupStaleEntries(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  const cutoff = now - WINDOW_MS * 2;
  for (const [key, entry] of windows) {
    if (entry.timestamps.length === 0 || entry.timestamps[entry.timestamps.length - 1] < cutoff) {
      windows.delete(key);
    }
  }
}

function checkInMemoryRateLimit(instanceId: string, maxPerMinute: number): string | null {
  cleanupStaleEntries();

  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  let entry = windows.get(instanceId);
  if (!entry) {
    entry = { timestamps: [] };
    windows.set(instanceId, entry);
  }

  // Trim timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  if (entry.timestamps.length >= maxPerMinute) {
    return `Rate limited: ${maxPerMinute} events/minute exceeded for this instance`;
  }

  // Record this event
  entry.timestamps.push(now);
  return null;
}

/**
 * Check if an instance has exceeded its rate limit.
 * Returns null if allowed, or an error message string if rate limited.
 *
 * Call this BEFORE processing the event. If allowed, the event is
 * automatically counted toward the window.
 */
export async function checkRateLimit(
  instanceId: string,
  maxPerMinute: number = DEFAULT_MAX_EVENTS_PER_MINUTE
): Promise<string | null> {
  // Use Redis if available
  if (redisLimiter) {
    const { success } = await redisLimiter.limit(instanceId);
    if (!success) {
      return `Rate limited: ${maxPerMinute} events/minute exceeded for this instance`;
    }
    return null;
  }

  // Fall back to in-memory
  return checkInMemoryRateLimit(instanceId, maxPerMinute);
}
