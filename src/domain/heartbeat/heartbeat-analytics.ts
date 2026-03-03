/**
 * Pure heartbeat cadence analytics module.
 *
 * Computes coverage, authority uptime, and cadence-breach metrics
 * from HEARTBEAT_DECISION_MADE proof events using piecewise-constant
 * signal analysis. No I/O, no Date.now() — all time math via getTime() ms.
 */

// ── Types ────────────────────────────────────────────────

export interface HeartbeatEvent {
  timestamp: Date;
  action: string;
  reasonCode: string;
}

export interface HeartbeatAnalyticsResult {
  windowStart: string; // ISO-8601
  windowEnd: string;
  windowMs: number;
  expectedCadenceMs: number;
  totalEvents: number;
  coverageMs: number; // time with fresh heartbeat evidence
  coveragePct: number; // 0-100, 2 decimals
  runMs: number; // time where last action was RUN
  runPct: number; // 0-100, 2 decimals
  cadenceBreached: boolean; // any gap > expectedCadenceMs
  longestGapMs: number;
  lastDecision: { action: string; reasonCode: string; timestamp: string } | null;
}

// ── Core ─────────────────────────────────────────────────

export function computeHeartbeatAnalytics(
  events: HeartbeatEvent[],
  windowStart: Date,
  windowEnd: Date,
  expectedCadenceMs: number
): HeartbeatAnalyticsResult {
  const wStartMs = windowStart.getTime();
  const wEndMs = windowEnd.getTime();
  const windowMs = Math.max(0, wEndMs - wStartMs);

  const base: HeartbeatAnalyticsResult = {
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    windowMs,
    expectedCadenceMs,
    totalEvents: 0,
    coverageMs: 0,
    coveragePct: 0,
    runMs: 0,
    runPct: 0,
    cadenceBreached: true,
    longestGapMs: windowMs,
    lastDecision: null,
  };

  if (windowMs === 0 || events.length === 0) {
    return base;
  }

  // Sort ascending by timestamp (defensive copy)
  const sorted = [...events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // Filter to events that can influence the window:
  // Keep the latest event before/at windowStart (anchor) + all events within window
  const anchorIdx = findLastIndexBefore(sorted, wStartMs);
  const relevant =
    anchorIdx >= 0 ? sorted.slice(anchorIdx) : sorted.filter((e) => e.timestamp.getTime() < wEndMs);

  if (relevant.length === 0) {
    return base;
  }

  // ── Piecewise coverage + action accumulation ────────────

  let coverageMs = 0;
  let runMs = 0;
  let longestGapMs = 0;

  // Check gap from windowStart to first relevant event inside window
  const firstInsideIdx = relevant.findIndex((e) => e.timestamp.getTime() > wStartMs);
  const hasAnchor = relevant.length > 0 && relevant[0].timestamp.getTime() <= wStartMs;

  if (!hasAnchor) {
    // No anchor: prefix from windowStart to first event is uncovered
    const firstMs = firstInsideIdx >= 0 ? relevant[firstInsideIdx].timestamp.getTime() : wEndMs;
    const prefixGap = Math.min(firstMs, wEndMs) - wStartMs;
    longestGapMs = Math.max(longestGapMs, prefixGap);
  }

  // Walk segments
  for (let i = 0; i < relevant.length; i++) {
    const evMs = relevant[i].timestamp.getTime();
    if (evMs >= wEndMs) break; // event is beyond window

    const segStart = Math.max(evMs, wStartMs);
    const segEnd =
      i + 1 < relevant.length ? Math.min(relevant[i + 1].timestamp.getTime(), wEndMs) : wEndMs;
    const segMs = Math.max(0, segEnd - segStart);

    coverageMs += segMs;
    if (relevant[i].action === "RUN") {
      runMs += segMs;
    }
  }

  // ── Gap detection ──────────────────────────────────────

  // Gaps between consecutive events within the window
  for (let i = 0; i < relevant.length - 1; i++) {
    const gap = relevant[i + 1].timestamp.getTime() - relevant[i].timestamp.getTime();
    longestGapMs = Math.max(longestGapMs, gap);
  }

  // Gap from last event to windowEnd
  const lastEvMs = relevant[relevant.length - 1].timestamp.getTime();
  if (lastEvMs < wEndMs) {
    const tailGap = wEndMs - lastEvMs;
    longestGapMs = Math.max(longestGapMs, tailGap);
  }

  // ── Last decision (latest event overall, not clamped to window) ──

  const lastSorted = sorted[sorted.length - 1];

  // ── Percentages ────────────────────────────────────────

  const coveragePct = windowMs > 0 ? Math.round((coverageMs / windowMs) * 10000) / 100 : 0;
  const runPct = windowMs > 0 ? Math.round((runMs / windowMs) * 10000) / 100 : 0;

  return {
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    windowMs,
    expectedCadenceMs,
    totalEvents: sorted.length,
    coverageMs,
    coveragePct,
    runMs,
    runPct,
    cadenceBreached: longestGapMs > expectedCadenceMs,
    longestGapMs,
    lastDecision: {
      action: lastSorted.action,
      reasonCode: lastSorted.reasonCode,
      timestamp: lastSorted.timestamp.toISOString(),
    },
  };
}

// ── Helpers ──────────────────────────────────────────────

function findLastIndexBefore(sorted: HeartbeatEvent[], beforeMs: number): number {
  let result = -1;
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].timestamp.getTime() <= beforeMs) {
      result = i;
    } else {
      break;
    }
  }
  return result;
}
