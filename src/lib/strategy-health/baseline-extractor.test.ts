import { describe, it, expect } from "vitest";
import { extractBaselineMetrics, estimateBacktestDuration } from "./baseline-extractor";

describe("extractBaselineMetrics", () => {
  it("normalizes return to 30-day window", () => {
    const { metrics } = extractBaselineMetrics(
      {
        totalTrades: 300,
        winRate: 55,
        profitFactor: 1.5,
        maxDrawdown: 1000,
        maxDrawdownPercent: 10,
        netProfit: 3000,
        sharpeRatio: 1.0,
        initialDeposit: 10000,
        finalBalance: 13000,
      },
      90 // 90 day backtest
    );

    // netReturnPct = (3000/10000)*100 = 30%
    // dailyReturnPct = 30/90 = 0.333...
    // returnPct30d = 0.333... * 30 = 10%
    expect(metrics.returnPct).toBeCloseTo(10, 1);
  });

  it("computes avgTradesPerDay correctly", () => {
    const { raw } = extractBaselineMetrics(
      {
        totalTrades: 200,
        winRate: 50,
        profitFactor: 1.2,
        maxDrawdown: 500,
        maxDrawdownPercent: 5,
        netProfit: 1000,
        sharpeRatio: 0.8,
        initialDeposit: 10000,
        finalBalance: 11000,
      },
      100
    );

    expect(raw.avgTradesPerDay).toBeCloseTo(2, 1);
  });

  it("computes volatility from Sharpe ratio when available", () => {
    const { metrics } = extractBaselineMetrics(
      {
        totalTrades: 300,
        winRate: 55,
        profitFactor: 1.5,
        maxDrawdown: 1000,
        maxDrawdownPercent: 10,
        netProfit: 3000,
        sharpeRatio: 1.5,
        initialDeposit: 10000,
        finalBalance: 13000,
      },
      90
    );

    // volatility should be computed and non-null
    expect(metrics.volatility).not.toBeNull();
    expect(metrics.volatility).toBeGreaterThan(0);
  });

  it("defaults initialDeposit to 10000 when 0", () => {
    const { raw } = extractBaselineMetrics(
      {
        totalTrades: 100,
        winRate: 50,
        profitFactor: 1.0,
        maxDrawdown: 0,
        maxDrawdownPercent: 0,
        netProfit: 0,
        sharpeRatio: 0,
        initialDeposit: 0,
        finalBalance: 0,
      },
      30
    );

    expect(raw.initialDeposit).toBe(10000);
  });
});

describe("estimateBacktestDuration", () => {
  it("estimates duration from trade count at ~2 trades/day", () => {
    const duration = estimateBacktestDuration({
      totalTrades: 200,
      winRate: 50,
      profitFactor: 1.0,
      maxDrawdown: 0,
      maxDrawdownPercent: 0,
      netProfit: 0,
      sharpeRatio: 0,
      initialDeposit: 10000,
      finalBalance: 10000,
    });

    // 200 trades / 2 per day = 100 days
    expect(duration).toBe(100);
  });

  it("returns minimum 30 days", () => {
    const duration = estimateBacktestDuration({
      totalTrades: 10,
      winRate: 50,
      profitFactor: 1.0,
      maxDrawdown: 0,
      maxDrawdownPercent: 0,
      netProfit: 0,
      sharpeRatio: 0,
      initialDeposit: 10000,
      finalBalance: 10000,
    });

    // 10/2 = 5, but min is 30
    expect(duration).toBe(30);
  });
});
