import { describe, it, expect } from "vitest";
import type { TradeFact } from "@prisma/client";
import { deriveIntermediateResults } from "./derive-intermediate-results";

function makeTradeFact(overrides: Partial<TradeFact> & { id: string }): TradeFact {
  return {
    strategyId: "strat_1",
    source: "BACKTEST",
    sourceRunId: "run_1",
    sourceTicket: 1001,
    symbol: "EURUSD",
    direction: "BUY",
    volume: 0.1,
    openPrice: 1.1234,
    closePrice: null,
    sl: null,
    tp: null,
    profit: 50,
    executedAt: new Date("2025-01-15T10:00:00Z"),
    ingestedAt: new Date(),
    instanceId: null,
    comment: null,
    ...overrides,
  };
}

describe("deriveIntermediateResults", () => {
  it("MC tradePnls matches snapshot order (sorted by executedAt, id)", () => {
    const facts = [
      makeTradeFact({ id: "c", profit: 300, executedAt: new Date("2025-01-17T10:00:00Z") }),
      makeTradeFact({ id: "a", profit: 100, executedAt: new Date("2025-01-15T10:00:00Z") }),
      makeTradeFact({ id: "b", profit: 200, executedAt: new Date("2025-01-16T10:00:00Z") }),
    ];

    const result = deriveIntermediateResults(facts, 10000);

    expect(result.monteCarlo.tradePnls).toEqual([100, 200, 300]);
    expect(result.monteCarlo.initialBalance).toBe(10000);
  });

  it("returns only monteCarlo in result shape", () => {
    const facts = [makeTradeFact({ id: "a" })];
    const result = deriveIntermediateResults(facts, 5000);

    expect(result).toHaveProperty("monteCarlo");
    expect(Object.keys(result)).toEqual(["monteCarlo"]);
  });

  it("handles single fact correctly", () => {
    const facts = [makeTradeFact({ id: "a", profit: 42 })];
    const result = deriveIntermediateResults(facts, 1000);

    expect(result.monteCarlo.tradePnls).toEqual([42]);
    expect(result.monteCarlo.initialBalance).toBe(1000);
  });

  it("sorts by id when executedAt is identical", () => {
    const sameTime = new Date("2025-01-15T10:00:00Z");
    const facts = [
      makeTradeFact({ id: "z", profit: 30, executedAt: sameTime }),
      makeTradeFact({ id: "a", profit: 10, executedAt: sameTime }),
      makeTradeFact({ id: "m", profit: 20, executedAt: sameTime }),
    ];

    const result = deriveIntermediateResults(facts, 10000);

    expect(result.monteCarlo.tradePnls).toEqual([10, 20, 30]);
  });
});
