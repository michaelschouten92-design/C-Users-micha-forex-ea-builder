import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ParsedDeal } from "@/lib/backtest-parser/types";

const mockCreateMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tradeFact: {
      createMany: (...args: unknown[]) => mockCreateMany(...args),
    },
  },
}));

// Import after mocking
const { ingestTradeFactsFromDeals } = await import("./ingest-facts");

function makeDeal(overrides: Partial<ParsedDeal> = {}): ParsedDeal {
  return {
    ticket: 1001,
    openTime: "2025-01-15T10:30:00.000Z",
    type: "buy",
    volume: 0.1,
    price: 1.1234,
    profit: 50.25,
    symbol: "EURUSD",
    ...overrides,
  };
}

describe("ingestTradeFactsFromDeals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateMany.mockResolvedValue({ count: 0 });
  });

  it("filters balance deals before validation", async () => {
    mockCreateMany.mockResolvedValue({ count: 1 });

    const deals = [
      makeDeal({ ticket: 1, type: "balance", volume: 0, price: 0, profit: 10000 }),
      makeDeal({ ticket: 2 }),
    ];

    const result = await ingestTradeFactsFromDeals({
      strategyId: "strat_1",
      source: "BACKTEST",
      sourceRunId: "run_1",
      deals,
      symbolFallback: "EURUSD",
    });

    // Only the non-balance deal should be in createMany
    expect(mockCreateMany).toHaveBeenCalledTimes(1);
    const data = mockCreateMany.mock.calls[0][0].data;
    expect(data).toHaveLength(1);
    expect(data[0].sourceTicket).toBe(2);
    expect(result.inserted).toBe(1);
  });

  it("returns zeros for empty deals", async () => {
    const result = await ingestTradeFactsFromDeals({
      strategyId: "strat_1",
      source: "BACKTEST",
      sourceRunId: "run_1",
      deals: [],
      symbolFallback: "EURUSD",
    });

    expect(result).toEqual({ inserted: 0, skippedDuplicates: 0 });
    expect(mockCreateMany).not.toHaveBeenCalled();
  });

  it("returns zeros when all deals are balance type", async () => {
    const result = await ingestTradeFactsFromDeals({
      strategyId: "strat_1",
      source: "BACKTEST",
      sourceRunId: "run_1",
      deals: [makeDeal({ ticket: 1, type: "balance", volume: 0, price: 0, profit: 10000 })],
      symbolFallback: "EURUSD",
    });

    expect(result).toEqual({ inserted: 0, skippedDuplicates: 0 });
    expect(mockCreateMany).not.toHaveBeenCalled();
  });

  it("aborts entire batch if any deal fails validation", async () => {
    const deals = [
      makeDeal({ ticket: 1 }),
      makeDeal({ ticket: 2, volume: -1 }), // invalid
      makeDeal({ ticket: 3 }),
    ];

    await expect(
      ingestTradeFactsFromDeals({
        strategyId: "strat_1",
        source: "BACKTEST",
        sourceRunId: "run_1",
        deals,
        symbolFallback: "EURUSD",
      })
    ).rejects.toThrow("TradeFact validation failed");

    // createMany should never be called
    expect(mockCreateMany).not.toHaveBeenCalled();
  });

  it("uses skipDuplicates for idempotent replay", async () => {
    mockCreateMany.mockResolvedValue({ count: 0 });

    await ingestTradeFactsFromDeals({
      strategyId: "strat_1",
      source: "BACKTEST",
      sourceRunId: "run_1",
      deals: [makeDeal({ ticket: 1 })],
      symbolFallback: "EURUSD",
    });

    expect(mockCreateMany).toHaveBeenCalledWith(expect.objectContaining({ skipDuplicates: true }));
  });

  it("calculates skippedDuplicates correctly", async () => {
    // 3 candidates, but only 1 actually inserted (2 were duplicates)
    mockCreateMany.mockResolvedValue({ count: 1 });

    const result = await ingestTradeFactsFromDeals({
      strategyId: "strat_1",
      source: "BACKTEST",
      sourceRunId: "run_1",
      deals: [makeDeal({ ticket: 1 }), makeDeal({ ticket: 2 }), makeDeal({ ticket: 3 })],
      symbolFallback: "EURUSD",
    });

    expect(result).toEqual({ inserted: 1, skippedDuplicates: 2 });
  });

  it("passes strategyId, source, sourceRunId to all rows", async () => {
    mockCreateMany.mockResolvedValue({ count: 2 });

    await ingestTradeFactsFromDeals({
      strategyId: "strat_xyz",
      source: "BACKTEST",
      sourceRunId: "run_abc",
      deals: [makeDeal({ ticket: 1 }), makeDeal({ ticket: 2 })],
      symbolFallback: "EURUSD",
    });

    const data = mockCreateMany.mock.calls[0][0].data;
    for (const row of data) {
      expect(row.strategyId).toBe("strat_xyz");
      expect(row.source).toBe("BACKTEST");
      expect(row.sourceRunId).toBe("run_abc");
    }
  });

  it("normalizes deal direction to uppercase", async () => {
    mockCreateMany.mockResolvedValue({ count: 2 });

    await ingestTradeFactsFromDeals({
      strategyId: "strat_1",
      source: "BACKTEST",
      sourceRunId: "run_1",
      deals: [makeDeal({ ticket: 1, type: "buy" }), makeDeal({ ticket: 2, type: "sell" })],
      symbolFallback: "EURUSD",
    });

    const data = mockCreateMany.mock.calls[0][0].data;
    expect(data[0].direction).toBe("BUY");
    expect(data[1].direction).toBe("SELL");
  });
});
