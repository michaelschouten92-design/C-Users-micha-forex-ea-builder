/**
 * Per-instance event rate limiter using database-backed sliding window.
 *
 * Limits each EA instance to a configurable number of events per minute
 * to prevent abuse, runaway EAs, or replay attacks from flooding the ledger.
 *
 * Uses a lightweight DB query (COUNT with timestamp filter) instead of
 * in-memory state. Survives process restarts and rolling deploys.
 */

import { prisma } from "@/lib/prisma";

const DEFAULT_MAX_EVENTS_PER_MINUTE = 100;
const WINDOW_MS = 60_000; // 1 minute

/**
 * Check if an instance has exceeded its rate limit.
 * Returns null if allowed, or an error message string if rate limited.
 *
 * Uses TrackRecordEvent count within the last 60 seconds as the
 * authoritative rate measurement. This is durable across deploys.
 */
export async function checkRateLimit(
  instanceId: string,
  maxPerMinute: number = DEFAULT_MAX_EVENTS_PER_MINUTE
): Promise<string | null> {
  const windowStart = new Date(Date.now() - WINDOW_MS);

  try {
    const recentCount = await prisma.trackRecordEvent.count({
      where: {
        instanceId,
        receivedAt: { gte: windowStart },
      },
    });

    if (recentCount >= maxPerMinute) {
      return `Rate limited: ${maxPerMinute} events/minute exceeded for this instance`;
    }

    return null;
  } catch {
    // If DB query fails, fail open (allow the event) to prevent
    // rate limiter failures from blocking legitimate telemetry.
    return null;
  }
}
