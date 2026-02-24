/**
 * Per-instance event rate limiter using a sliding window counter.
 *
 * Limits each EA instance to a configurable number of events per minute
 * to prevent abuse, runaway EAs, or replay attacks from flooding the ledger.
 *
 * In-memory: works for single-server deployments. For multi-server,
 * replace with Redis-backed limiter.
 */

const DEFAULT_MAX_EVENTS_PER_MINUTE = 100;
const WINDOW_MS = 60_000; // 1 minute

interface WindowEntry {
  timestamps: number[];
}

const windows = new Map<string, WindowEntry>();

// Periodic cleanup to prevent memory leaks from abandoned instances
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

/**
 * Check if an instance has exceeded its rate limit.
 * Returns null if allowed, or an error message string if rate limited.
 *
 * Call this BEFORE processing the event. If allowed, the event is
 * automatically counted toward the window.
 */
export function checkRateLimit(
  instanceId: string,
  maxPerMinute: number = DEFAULT_MAX_EVENTS_PER_MINUTE
): string | null {
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
