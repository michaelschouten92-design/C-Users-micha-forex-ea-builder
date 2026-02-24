/**
 * Verification Cache — skip re-verification of already-verified chain segments.
 *
 * Uses commitment points (every 500 events) as cache boundaries.
 * A cached entry means: "events from seqNo X to Y with final hash Z
 * have been verified and the replay state at Y matches."
 *
 * TTL-based expiry prevents stale cache entries from accumulating.
 */

const CACHE_TTL_MS = 30 * 60_000; // 30 minutes
const MAX_CACHE_SIZE = 500;

interface CachedSegment {
  /** Instance this segment belongs to */
  instanceId: string;
  /** First seqNo in the verified segment */
  fromSeqNo: number;
  /** Last seqNo in the verified segment */
  toSeqNo: number;
  /** Event hash at toSeqNo — used to verify the segment hasn't been tampered */
  lastEventHash: string;
  /** Whether the chain was valid through this segment */
  chainValid: boolean;
  /** When this cache entry was created */
  cachedAt: number;
}

/**
 * Cache key: instanceId + fromSeqNo + toSeqNo + lastEventHash
 * This ensures we only hit cache when the exact same segment is being verified
 * with the same content (lastEventHash acts as a content fingerprint).
 */
function cacheKey(
  instanceId: string,
  fromSeqNo: number,
  toSeqNo: number,
  lastEventHash: string
): string {
  return `${instanceId}:${fromSeqNo}:${toSeqNo}:${lastEventHash}`;
}

const cache = new Map<string, CachedSegment>();

function evictExpired(): void {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now - entry.cachedAt > CACHE_TTL_MS) {
      cache.delete(key);
    }
  }
  // LRU-style eviction if over max size
  if (cache.size > MAX_CACHE_SIZE) {
    const entries = [...cache.entries()].sort((a, b) => a[1].cachedAt - b[1].cachedAt);
    const toRemove = entries.slice(0, entries.length - MAX_CACHE_SIZE);
    for (const [key] of toRemove) {
      cache.delete(key);
    }
  }
}

/**
 * Check if a chain segment has been previously verified.
 * Returns true if the segment was verified and chain was valid.
 */
export function isSegmentVerified(
  instanceId: string,
  fromSeqNo: number,
  toSeqNo: number,
  lastEventHash: string
): boolean {
  evictExpired();
  const key = cacheKey(instanceId, fromSeqNo, toSeqNo, lastEventHash);
  const entry = cache.get(key);
  if (!entry) return false;
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    cache.delete(key);
    return false;
  }
  return entry.chainValid;
}

/**
 * Record that a chain segment has been successfully verified.
 */
export function cacheVerifiedSegment(
  instanceId: string,
  fromSeqNo: number,
  toSeqNo: number,
  lastEventHash: string,
  chainValid: boolean
): void {
  evictExpired();
  const key = cacheKey(instanceId, fromSeqNo, toSeqNo, lastEventHash);
  cache.set(key, {
    instanceId,
    fromSeqNo,
    toSeqNo,
    lastEventHash,
    chainValid,
    cachedAt: Date.now(),
  });
}
