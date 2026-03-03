import { describe, it, expect } from "vitest";
import { computeHeartbeatAnalytics, HeartbeatEvent } from "./heartbeat-analytics";

// ── Helpers ──────────────────────────────────────────────

function ev(isoOrMs: string | number, action = "RUN", reasonCode = "OK"): HeartbeatEvent {
  return {
    timestamp: typeof isoOrMs === "string" ? new Date(isoOrMs) : new Date(isoOrMs),
    action,
    reasonCode,
  };
}

const HOUR = 3_600_000;
const MIN = 60_000;

// Canonical window: 1h starting at T12:00
const W_START = new Date("2026-03-03T12:00:00Z");
const W_END = new Date("2026-03-03T13:00:00Z");
const CADENCE = 5 * MIN; // 5 minutes

describe("computeHeartbeatAnalytics", () => {
  // ── No events → fail-closed ────────────────────────────

  it("returns fail-closed shape when no events", () => {
    const r = computeHeartbeatAnalytics([], W_START, W_END, CADENCE);

    expect(r.cadenceBreached).toBe(true);
    expect(r.coveragePct).toBe(0);
    expect(r.runPct).toBe(0);
    expect(r.totalEvents).toBe(0);
    expect(r.lastDecision).toBeNull();
    expect(r.windowMs).toBe(HOUR);
    expect(r.longestGapMs).toBe(HOUR);
  });

  // ── Single event at windowStart covering full window ───

  it("single RUN event at windowStart → 100% coverage + run", () => {
    const r = computeHeartbeatAnalytics([ev("2026-03-03T12:00:00Z")], W_START, W_END, CADENCE);

    expect(r.totalEvents).toBe(1);
    expect(r.coverageMs).toBe(HOUR);
    expect(r.coveragePct).toBe(100);
    expect(r.runMs).toBe(HOUR);
    expect(r.runPct).toBe(100);
    // Gap from event to windowEnd = 1h > 5min cadence
    expect(r.cadenceBreached).toBe(true);
    expect(r.longestGapMs).toBe(HOUR);
  });

  // ── Anchor event before windowStart (clamped) ──────────

  it("anchor event before windowStart is clamped", () => {
    const r = computeHeartbeatAnalytics(
      [ev("2026-03-03T11:50:00Z"), ev("2026-03-03T12:30:00Z", "PAUSE", "NO_INSTANCE")],
      W_START,
      W_END,
      CADENCE
    );

    // First segment: windowStart → 12:30 = 30min of RUN
    // Second segment: 12:30 → windowEnd = 30min of PAUSE
    expect(r.coverageMs).toBe(HOUR);
    expect(r.coveragePct).toBe(100);
    expect(r.runMs).toBe(30 * MIN);
    expect(r.runPct).toBe(50);
  });

  // ── Two events: RUN then PAUSE at midpoint → runPct ≈ 50 ─

  it("RUN then PAUSE at midpoint → runPct 50", () => {
    const r = computeHeartbeatAnalytics(
      [ev("2026-03-03T12:00:00Z"), ev("2026-03-03T12:30:00Z", "PAUSE", "NO_INSTANCE")],
      W_START,
      W_END,
      CADENCE
    );

    expect(r.runMs).toBe(30 * MIN);
    expect(r.runPct).toBe(50);
    expect(r.coveragePct).toBe(100);
  });

  // ── Large gap triggers cadenceBreached ─────────────────

  it("large gap between events triggers cadenceBreached", () => {
    const r = computeHeartbeatAnalytics(
      [ev("2026-03-03T12:00:00Z"), ev("2026-03-03T12:10:00Z")],
      W_START,
      W_END,
      CADENCE
    );

    // Gap between events = 10min > 5min cadence
    expect(r.cadenceBreached).toBe(true);
    expect(r.longestGapMs).toBeGreaterThanOrEqual(10 * MIN);
  });

  // ── Events within cadence → no breach ──────────────────

  it("events within cadence → cadenceBreached false", () => {
    // Events every 4 minutes for 1 hour → no gap > 5min
    const events: HeartbeatEvent[] = [];
    for (let i = 0; i <= 15; i++) {
      events.push(ev(W_START.getTime() + i * 4 * MIN));
    }
    // Last event at T12:60 = T13:00 = windowEnd exactly
    const r = computeHeartbeatAnalytics(events, W_START, W_END, CADENCE);

    expect(r.cadenceBreached).toBe(false);
    expect(r.longestGapMs).toBeLessThanOrEqual(CADENCE);
  });

  // ── Gap from last event to windowEnd triggers breach ───

  it("gap from last event to windowEnd triggers cadenceBreached", () => {
    // Single event at windowStart, gap to windowEnd = 1h >> cadence
    const r = computeHeartbeatAnalytics([ev("2026-03-03T12:00:00Z")], W_START, W_END, CADENCE);

    expect(r.cadenceBreached).toBe(true);
    expect(r.longestGapMs).toBe(HOUR);
  });

  // ── Zero-length window ─────────────────────────────────

  it("zero-length window returns fail-closed shape", () => {
    const r = computeHeartbeatAnalytics(
      [ev("2026-03-03T12:00:00Z")],
      W_START,
      W_START, // same as start
      CADENCE
    );

    expect(r.windowMs).toBe(0);
    expect(r.cadenceBreached).toBe(true);
    expect(r.coveragePct).toBe(0);
    expect(r.runPct).toBe(0);
  });

  // ── Events outside window ignored ──────────────────────

  it("events entirely outside window are ignored in coverage", () => {
    const r = computeHeartbeatAnalytics(
      [ev("2026-03-03T14:00:00Z"), ev("2026-03-03T15:00:00Z")],
      W_START,
      W_END,
      CADENCE
    );

    expect(r.coverageMs).toBe(0);
    expect(r.coveragePct).toBe(0);
    expect(r.cadenceBreached).toBe(true);
  });

  // ── Determinism ────────────────────────────────────────

  it("identical inputs produce identical outputs", () => {
    const events = [ev("2026-03-03T12:00:00Z"), ev("2026-03-03T12:30:00Z", "PAUSE", "NO_INSTANCE")];

    const r1 = computeHeartbeatAnalytics(events, W_START, W_END, CADENCE);
    const r2 = computeHeartbeatAnalytics(events, W_START, W_END, CADENCE);

    expect(r1).toEqual(r2);
  });

  // ── Mixed actions accumulation ─────────────────────────

  it("RUN/PAUSE/STOP segments accumulate correctly", () => {
    const r = computeHeartbeatAnalytics(
      [
        ev("2026-03-03T12:00:00Z", "RUN", "OK"), // 0-20min RUN
        ev("2026-03-03T12:20:00Z", "PAUSE", "NO_INSTANCE"), // 20-40min PAUSE
        ev("2026-03-03T12:40:00Z", "STOP", "STRATEGY_HALTED"), // 40-60min STOP
      ],
      W_START,
      W_END,
      CADENCE
    );

    expect(r.coverageMs).toBe(HOUR);
    expect(r.coveragePct).toBe(100);
    expect(r.runMs).toBe(20 * MIN);
    expect(r.runPct).toBeCloseTo(33.33, 1);
  });

  // ── lastDecision extraction ────────────────────────────

  it("lastDecision reflects the latest event", () => {
    const r = computeHeartbeatAnalytics(
      [ev("2026-03-03T12:00:00Z", "RUN", "OK"), ev("2026-03-03T12:30:00Z", "PAUSE", "NO_INSTANCE")],
      W_START,
      W_END,
      CADENCE
    );

    expect(r.lastDecision).toEqual({
      action: "PAUSE",
      reasonCode: "NO_INSTANCE",
      timestamp: "2026-03-03T12:30:00.000Z",
    });
  });

  // ── Unsorted input is handled ──────────────────────────

  it("handles unsorted input by sorting defensively", () => {
    const r = computeHeartbeatAnalytics(
      [ev("2026-03-03T12:30:00Z", "PAUSE", "NO_INSTANCE"), ev("2026-03-03T12:00:00Z", "RUN", "OK")],
      W_START,
      W_END,
      CADENCE
    );

    expect(r.runMs).toBe(30 * MIN);
    expect(r.runPct).toBe(50);
    expect(r.lastDecision?.action).toBe("PAUSE");
  });
});
