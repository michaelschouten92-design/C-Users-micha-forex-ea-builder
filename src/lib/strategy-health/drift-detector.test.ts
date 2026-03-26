import { describe, it, expect } from "vitest";
import { computeTradeReturns } from "./drift-detector";

describe("computeTradeReturns", () => {
  it("returns finite values for normal trades", () => {
    const returns = computeTradeReturns(
      [
        { profit: 50, swap: -1, commission: -2 },
        { profit: -30, swap: 0, commission: -2 },
        { profit: 100, swap: -3, commission: -2 },
      ],
      1000
    );

    expect(returns).toHaveLength(3);
    for (const r of returns) {
      expect(Number.isFinite(r)).toBe(true);
    }
  });

  it("produces finite return even when pnl equals negative balance (BD1)", () => {
    // Catastrophic loss: pnl = -1000 on balance 1000 → total wipeout
    const returns = computeTradeReturns(
      [{ profit: -1000, swap: 0, commission: 0 }],
      1000
    );

    expect(returns).toHaveLength(1);
    expect(Number.isFinite(returns[0])).toBe(true);
    expect(returns[0]).toBeLessThan(0); // Must be negative
  });

  it("produces finite return when pnl exceeds negative balance (BD1)", () => {
    // Loss greater than balance: pnl = -1500 on balance 1000
    const returns = computeTradeReturns(
      [{ profit: -1500, swap: 0, commission: 0 }],
      1000
    );

    expect(returns).toHaveLength(1);
    expect(Number.isFinite(returns[0])).toBe(true);
    expect(returns[0]).toBeLessThan(-100); // Extreme but finite
  });

  it("does not produce -Infinity or NaN", () => {
    const extremeCases = [
      [{ profit: -999.99, swap: 0, commission: -0.01 }], // exactly -balance
      [{ profit: -2000, swap: 0, commission: 0 }],       // exceeds balance
      [{ profit: -10000, swap: 0, commission: 0 }],      // 10x balance
    ];

    for (const trades of extremeCases) {
      const returns = computeTradeReturns(trades, 1000);
      for (const r of returns) {
        expect(r).not.toBe(-Infinity);
        expect(r).not.toBe(Infinity);
        expect(Number.isNaN(r)).toBe(false);
      }
    }
  });

  it("returns empty for zero start balance", () => {
    const returns = computeTradeReturns(
      [{ profit: 50, swap: 0, commission: 0 }],
      0
    );
    expect(returns).toHaveLength(0);
  });
});
