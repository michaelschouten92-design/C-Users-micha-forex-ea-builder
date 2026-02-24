import { describe, it, expect } from "vitest";
import { computeHealthScore } from "./health-scorer";
import type { ParsedMetrics } from "./types";

/** Helper: build a valid ParsedMetrics with sensible defaults. */
function makeMetrics(overrides: Partial<ParsedMetrics> = {}): ParsedMetrics {
  return {
    totalNetProfit: 5000,
    profitFactor: 1.8,
    maxDrawdownPct: 12,
    maxDrawdownAbs: 1200,
    sharpeRatio: 1.2,
    recoveryFactor: 3.0,
    expectedPayoff: 10,
    totalTrades: 500,
    winRate: 55,
    longWinRate: 56,
    shortWinRate: 54,
    ...overrides,
  };
}

describe("computeHealthScore", () => {
  // ─── Test 1: INSUFFICIENT_DATA when < 30 trades ─────────────
  it("returns INSUFFICIENT_DATA when totalTrades < 30", () => {
    const result = computeHealthScore(makeMetrics({ totalTrades: 15 }), 10000);

    expect(result.status).toBe("INSUFFICIENT_DATA");
    expect(result.score).toBe(0);
    expect(result.breakdown).toHaveLength(0);
    expect(result.warnings.some((w) => w.includes("minimum 30 required"))).toBe(true);
  });

  // ─── Test 2: caps score at 79 when < 100 trades ─────────────
  it("caps score at 79 when totalTrades < 100 and metrics are excellent", () => {
    const result = computeHealthScore(
      makeMetrics({
        totalTrades: 80,
        profitFactor: 2.5,
        maxDrawdownPct: 5,
        winRate: 65,
        sharpeRatio: 2.0,
        recoveryFactor: 8,
        expectedPayoff: 20,
      }),
      10000
    );

    expect(result.score).toBeLessThanOrEqual(79);
    expect(result.status).toBe("MODERATE");
    expect(result.warnings.some((w) => w.includes("capped to 79"))).toBe(true);
  });

  // ─── Test 3: excludes maxDrawdownPct=0 with warning ──────────
  it("excludes maxDrawdownPct=0 from scoring with warning", () => {
    const result = computeHealthScore(makeMetrics({ maxDrawdownPct: 0, totalTrades: 200 }), 10000);

    expect(result.warnings.some((w) => w.includes("drawdown") && w.includes("0%"))).toBe(true);
    // maxDrawdownPct should NOT appear in breakdown
    const ddBreakdown = result.breakdown.find((b) => b.metric === "maxDrawdownPct");
    expect(ddBreakdown).toBeUndefined();
  });

  // ─── Test 4: excludes NaN metrics with warning ──────────────
  it("excludes NaN metrics with warning", () => {
    const result = computeHealthScore(makeMetrics({ sharpeRatio: NaN }), 10000);

    expect(result.warnings.some((w) => w.includes("invalid value"))).toBe(true);
    const sharpeBreakdown = result.breakdown.find((b) => b.metric === "sharpeRatio");
    expect(sharpeBreakdown).toBeUndefined();
  });

  // ─── Test 5: excludes Infinity metrics with warning ─────────
  it("excludes Infinity metrics with warning", () => {
    const result = computeHealthScore(makeMetrics({ profitFactor: Infinity }), 10000);

    expect(result.warnings.some((w) => w.includes("invalid value"))).toBe(true);
    const pfBreakdown = result.breakdown.find((b) => b.metric === "profitFactor");
    expect(pfBreakdown).toBeUndefined();
  });

  // ─── Test 6: flags outlier dependency ───────────────────────
  it("flags outlier dependency when largest trade > 30% of net profit", () => {
    const result = computeHealthScore(
      makeMetrics({
        totalNetProfit: 10000,
        largestProfitTrade: 8000,
        totalTrades: 200,
      }),
      10000
    );

    expect(result.warnings.some((w) => w.includes("outlier"))).toBe(true);
  });

  // ─── Test 7: flags martingale pattern ──────────────────────
  it("flags martingale pattern when winRate > 80% and avgLoss > 3x avgWin", () => {
    const result = computeHealthScore(
      makeMetrics({
        winRate: 90,
        avgProfitTrade: 10,
        avgLossTrade: -50,
        totalTrades: 200,
      }),
      10000
    );

    expect(result.warnings.some((w) => w.includes("martingale"))).toBe(true);
  });

  // ─── Test 8: scores a healthy strategy as ROBUST ────────────
  it("scores a baseline healthy strategy as ROBUST", () => {
    const result = computeHealthScore(
      makeMetrics({
        profitFactor: 1.8,
        maxDrawdownPct: 12,
        totalTrades: 500,
        winRate: 55,
        sharpeRatio: 1.2,
        recoveryFactor: 3.0,
        expectedPayoff: 10,
      }),
      10000
    );

    expect(result.score).toBeGreaterThanOrEqual(60);
    expect(["ROBUST", "MODERATE"]).toContain(result.status);
    // Should not have any red flags
    expect(result.warnings.some((w) => w.includes("martingale"))).toBe(false);
    expect(result.warnings.some((w) => w.includes("outlier"))).toBe(false);
  });

  // ─── Test 9: normalizes expectedPayoff with initialDeposit ──
  it("normalizes expectedPayoff as % of initialDeposit", () => {
    // $10 payoff on $10K deposit = 0.1% → should be scored against normalized breakpoints
    const withDeposit = computeHealthScore(makeMetrics({ expectedPayoff: 10 }), 10000);
    const payoffBreakdown = withDeposit.breakdown.find((b) => b.metric === "expectedPayoff");
    expect(payoffBreakdown).toBeDefined();
    // The normalized value should be 0.1 (10/10000 * 100)
    expect(payoffBreakdown!.value).toBeCloseTo(0.1, 2);
  });

  // ─── Test 10: excludes expectedPayoff when deposit unknown ──
  it("excludes expectedPayoff when initialDeposit is 0", () => {
    const result = computeHealthScore(makeMetrics({ expectedPayoff: 50 }), 0);
    expect(result.warnings.some((w) => w.includes("Initial deposit is unknown"))).toBe(true);
    const payoffBreakdown = result.breakdown.find((b) => b.metric === "expectedPayoff");
    expect(payoffBreakdown).toBeUndefined();
  });
});
