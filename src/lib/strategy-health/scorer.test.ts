import { describe, it, expect } from "vitest";
import { computeHealth } from "./scorer";
import type { LiveMetrics, BaselineMetrics } from "./types";

function makeLiveMetrics(overrides: Partial<LiveMetrics> = {}): LiveMetrics {
  return {
    returnPct: 5,
    volatility: 0.1,
    maxDrawdownPct: 8,
    winRate: 55,
    tradesPerDay: 2,
    totalTrades: 60,
    windowDays: 30,
    tradeReturns: [],
    ...overrides,
  };
}

function makeBaseline(overrides: Partial<BaselineMetrics> = {}): BaselineMetrics {
  return {
    returnPct: 5,
    maxDrawdownPct: 8,
    winRate: 55,
    tradesPerDay: 2,
    sharpeRatio: 1.2,
    volatility: 0.1,
    ...overrides,
  };
}

describe("computeHealth (live scorer)", () => {
  it("returns INSUFFICIENT_DATA when trades < MIN_TRADES_FOR_ASSESSMENT", () => {
    const result = computeHealth(
      makeLiveMetrics({ totalTrades: 3, windowDays: 30 }),
      makeBaseline()
    );

    expect(result.status).toBe("INSUFFICIENT_DATA");
    expect(result.overallScore).toBe(0);
  });

  it("returns INSUFFICIENT_DATA when windowDays < MIN_DAYS_FOR_ASSESSMENT", () => {
    const result = computeHealth(
      makeLiveMetrics({ windowDays: 3, totalTrades: 50 }),
      makeBaseline()
    );

    expect(result.status).toBe("INSUFFICIENT_DATA");
  });

  it("returns HEALTHY when live matches baseline", () => {
    const result = computeHealth(makeLiveMetrics(), makeBaseline());

    expect(result.status).toBe("HEALTHY");
    expect(result.overallScore).toBeGreaterThanOrEqual(0.7);
  });

  it("returns DEGRADED when live is much worse than baseline", () => {
    const result = computeHealth(
      makeLiveMetrics({
        returnPct: -10,
        maxDrawdownPct: 40,
        winRate: 20,
        tradesPerDay: 0.2,
      }),
      makeBaseline()
    );

    expect(result.status).toBe("DEGRADED");
    expect(result.overallScore).toBeLessThan(0.4);
  });

  it("scores without baseline using absolute heuristics", () => {
    const result = computeHealth(makeLiveMetrics(), null);

    // Without baseline, moderate live metrics should score OK
    expect(["HEALTHY", "WARNING"]).toContain(result.status);
    expect(result.baseline).toBeNull();
  });

  it("all metric scores are between 0 and 1", () => {
    const result = computeHealth(makeLiveMetrics(), makeBaseline());

    for (const key of Object.keys(result.metrics) as Array<keyof typeof result.metrics>) {
      expect(result.metrics[key].score).toBeGreaterThanOrEqual(0);
      expect(result.metrics[key].score).toBeLessThanOrEqual(1);
    }
  });
});
