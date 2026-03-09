import { describe, it, expect } from "vitest";
import {
  computeLiveMaxDrawdownPct,
  computeSharpe,
  computeLiveProfitFactor,
  computeLiveWinRate,
  computeCurrentLosingStreak,
  computeDaysSinceLastTrade,
} from "./live-metrics";

describe("computeLiveMaxDrawdownPct", () => {
  it("returns 0 for empty array", () => {
    expect(computeLiveMaxDrawdownPct([], 10000)).toBe(0);
  });

  it("returns 0 when no drawdown occurs", () => {
    expect(computeLiveMaxDrawdownPct([100, 200, 300], 10000)).toBe(0);
  });

  it("computes correct drawdown from peak", () => {
    // Start 10000, +500 → 10500 (peak), -1050 → 9450
    // DD = (10500 - 9450) / 10500 = 10%
    const result = computeLiveMaxDrawdownPct([500, -1050], 10000);
    expect(result).toBeCloseTo(10, 1);
  });

  it("tracks multiple peaks and finds worst drawdown", () => {
    // 10000 → 11000 → 10000 → 10500 → 9000
    // First DD: (11000-10000)/11000 = 9.09%
    // Second DD: (11000-9000)/11000 = 18.18% (peak is still 11000)
    const result = computeLiveMaxDrawdownPct([1000, -1000, 500, -1500], 10000);
    expect(result).toBeCloseTo(18.18, 1);
  });

  it("returns 0 for zero initialBalance", () => {
    expect(computeLiveMaxDrawdownPct([100, -50], 0)).toBe(0);
  });
});

describe("computeSharpe", () => {
  it("returns 0 for fewer than 2 trades", () => {
    expect(computeSharpe([])).toBe(0);
    expect(computeSharpe([100])).toBe(0);
  });

  it("returns 0 when all trades are equal (zero stdDev)", () => {
    expect(computeSharpe([100, 100, 100])).toBe(0);
  });

  it("computes positive Sharpe for profitable trades", () => {
    const result = computeSharpe([100, 200, 150, 180]);
    expect(result).toBeGreaterThan(0);
  });

  it("computes negative Sharpe for losing trades", () => {
    const result = computeSharpe([-100, -200, -150, -180]);
    expect(result).toBeLessThan(0);
  });

  it("is deterministic — same inputs produce same output", () => {
    const pnls = [100, -50, 200, -30, 80];
    expect(computeSharpe(pnls)).toBe(computeSharpe(pnls));
  });

  it("rounds to 2 decimal places", () => {
    const result = computeSharpe([100, -50, 200, -30]);
    const str = result.toString();
    const decimals = str.includes(".") ? str.split(".")[1].length : 0;
    expect(decimals).toBeLessThanOrEqual(2);
  });
});

describe("computeLiveProfitFactor", () => {
  it("returns 0 for empty array", () => {
    expect(computeLiveProfitFactor([])).toBe(0);
  });

  it("returns 0 when no winning trades and no losing trades", () => {
    expect(computeLiveProfitFactor([0, 0])).toBe(0);
  });

  it("returns Infinity when all trades are profitable", () => {
    expect(computeLiveProfitFactor([100, 200, 300])).toBe(Infinity);
  });

  it("computes correct ratio of gross profit to gross loss", () => {
    // Gross profit: 200+100 = 300, Gross loss: |-50|+|-100| = 150
    // PF = 300/150 = 2.0
    expect(computeLiveProfitFactor([200, -50, 100, -100])).toBe(2.0);
  });

  it("rounds to 2 decimal places", () => {
    // Gross profit: 100, Gross loss: 70 → PF = 1.428... → 1.43
    expect(computeLiveProfitFactor([100, -70])).toBe(1.43);
  });

  it("is deterministic", () => {
    const pnls = [100, -50, 200, -30];
    expect(computeLiveProfitFactor(pnls)).toBe(computeLiveProfitFactor(pnls));
  });
});

describe("computeLiveWinRate", () => {
  it("returns 0 for empty array", () => {
    expect(computeLiveWinRate([])).toBe(0);
  });

  it("returns 0 when no winning trades", () => {
    expect(computeLiveWinRate([-100, -50, 0])).toBe(0);
  });

  it("returns 1.0 when all trades are profitable", () => {
    expect(computeLiveWinRate([100, 200, 300])).toBe(1.0);
  });

  it("computes correct win rate", () => {
    // 3 wins out of 5 → 0.6
    expect(computeLiveWinRate([100, -50, 200, -30, 80])).toBe(0.6);
  });

  it("treats zero profit as a loss (not a win)", () => {
    // 1 win out of 2 → 0.5
    expect(computeLiveWinRate([100, 0])).toBe(0.5);
  });

  it("rounds to 2 decimal places", () => {
    // 1 win out of 3 → 0.333... → 0.33
    expect(computeLiveWinRate([100, -50, -30])).toBe(0.33);
  });

  it("is deterministic", () => {
    const pnls = [100, -50, 200, -30];
    expect(computeLiveWinRate(pnls)).toBe(computeLiveWinRate(pnls));
  });
});

describe("computeCurrentLosingStreak", () => {
  it("returns 0 for empty array", () => {
    expect(computeCurrentLosingStreak([])).toBe(0);
  });

  it("returns 0 when last trade is profitable", () => {
    expect(computeCurrentLosingStreak([100, -50, 200])).toBe(0);
  });

  it("counts consecutive losses from the end", () => {
    expect(computeCurrentLosingStreak([100, -50, -30, -20])).toBe(3);
  });

  it("treats zero profit as a loss", () => {
    expect(computeCurrentLosingStreak([100, 0])).toBe(1);
  });

  it("returns full length when all trades are losses", () => {
    expect(computeCurrentLosingStreak([-10, -20, -30])).toBe(3);
  });
});

describe("computeDaysSinceLastTrade", () => {
  it("returns 0 when trade was today", () => {
    const now = new Date("2025-06-15T12:00:00Z");
    const latest = new Date("2025-06-15T08:00:00Z");
    expect(computeDaysSinceLastTrade(latest, now)).toBe(0);
  });

  it("returns correct number of days", () => {
    const now = new Date("2025-06-15T12:00:00Z");
    const latest = new Date("2025-06-10T12:00:00Z");
    expect(computeDaysSinceLastTrade(latest, now)).toBe(5);
  });

  it("floors partial days", () => {
    const now = new Date("2025-06-15T18:00:00Z");
    const latest = new Date("2025-06-14T20:00:00Z");
    // 22 hours → 0 days (floors)
    expect(computeDaysSinceLastTrade(latest, now)).toBe(0);
  });
});
