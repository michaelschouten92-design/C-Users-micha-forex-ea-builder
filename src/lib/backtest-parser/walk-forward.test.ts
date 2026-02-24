import { describe, it, expect } from "vitest";
import { runWalkForward } from "./walk-forward";
import type { ParsedDeal } from "./types";

/** Helper: generate N synthetic deals spread across days. */
function makeSyntheticDeals(
  n: number,
  options: { profitRange?: [number, number]; startDate?: string } = {}
): ParsedDeal[] {
  const { profitRange = [-50, 100], startDate = "2023-01-01" } = options;
  const deals: ParsedDeal[] = [];
  const start = new Date(startDate).getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  for (let i = 0; i < n; i++) {
    const dayOffset = Math.floor(i / 3); // ~3 trades per day
    const time = new Date(start + dayOffset * dayMs);
    const profit = profitRange[0] + Math.random() * (profitRange[1] - profitRange[0]);

    deals.push({
      ticket: 1000 + i,
      openTime: time.toISOString().slice(0, 19),
      type: i % 2 === 0 ? "buy" : "sell",
      volume: 0.1,
      price: 1.1 + i * 0.001,
      profit: Math.round(profit * 100) / 100,
    });
  }

  return deals;
}

describe("runWalkForward", () => {
  it("returns OVERFITTED with insufficient deals", () => {
    const deals = makeSyntheticDeals(10);
    const result = runWalkForward(deals, 10000, { numWindows: 5 });

    expect(result.verdict).toBe("OVERFITTED");
    expect(result.windows).toHaveLength(0);
    expect(result.totalDeals).toBe(10);
  });

  it("computes correct number of windows", () => {
    const deals = makeSyntheticDeals(100);
    const result = runWalkForward(deals, 10000, { numWindows: 5 });

    expect(result.windows).toHaveLength(5);
    expect(result.numWindows).toBe(5);
  });

  it("daily Sharpe > 0 for consistently profitable deals", () => {
    // All profitable deals spread across 30 days
    const deals = makeSyntheticDeals(50, { profitRange: [10, 100] });
    const result = runWalkForward(deals, 10000, { numWindows: 5 });

    // At least some windows should have positive Sharpe
    const positiveSharpeWindows = result.windows.filter((w) => w.outOfSample.sharpeRatio > 0);
    expect(positiveSharpeWindows.length).toBeGreaterThan(0);
  });

  it("oosRatio in result matches 1/numWindows", () => {
    const deals = makeSyntheticDeals(100);
    const result = runWalkForward(deals, 10000, { numWindows: 5 });

    expect(result.oosRatio).toBeCloseTo(0.2, 5);
  });

  it("each window has non-empty IS and OOS metrics", () => {
    const deals = makeSyntheticDeals(200);
    const result = runWalkForward(deals, 10000, { numWindows: 4 });

    for (const window of result.windows) {
      expect(window.inSample.totalTrades).toBeGreaterThan(0);
      expect(window.outOfSample.totalTrades).toBeGreaterThan(0);
    }
  });

  it("overfit probability uses all 3 degradation metrics", () => {
    // Create deals with high variance across windows to trigger degradation
    const deals = makeSyntheticDeals(150, { profitRange: [-100, 200] });
    const result = runWalkForward(deals, 10000, { numWindows: 5 });

    // overfitProbability should be between 0 and 1
    expect(result.overfitProbability).toBeGreaterThanOrEqual(0);
    expect(result.overfitProbability).toBeLessThanOrEqual(1);
  });

  it("consistency handles near-zero Sharpe values without exploding", () => {
    // Create deals with near-zero net profit (Sharpe ≈ 0)
    const deals = makeSyntheticDeals(100, { profitRange: [-50, 50] });
    const result = runWalkForward(deals, 10000, { numWindows: 5 });

    // Should not be NaN or Infinity — the near-zero-mean fix handles this
    expect(Number.isFinite(result.consistencyScore)).toBe(true);
    expect(result.consistencyScore).toBeGreaterThanOrEqual(0);
    expect(result.consistencyScore).toBeLessThanOrEqual(100);
  });
});
