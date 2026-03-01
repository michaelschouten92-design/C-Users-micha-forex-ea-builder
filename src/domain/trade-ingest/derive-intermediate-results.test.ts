import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TradeFact } from "@prisma/client";

const mockRunWalkForward = vi.fn();

vi.mock("@/lib/backtest-parser/walk-forward", () => ({
  runWalkForward: (...args: unknown[]) => mockRunWalkForward(...args),
}));

const { deriveIntermediateResults } = await import("./derive-intermediate-results");

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
    comment: null,
    ...overrides,
  };
}

describe("deriveIntermediateResults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("MC tradePnls matches snapshot order (sorted by executedAt, id)", () => {
    mockRunWalkForward.mockReturnValue({ windows: [] });

    const facts = [
      makeTradeFact({ id: "c", profit: 300, executedAt: new Date("2025-01-17T10:00:00Z") }),
      makeTradeFact({ id: "a", profit: 100, executedAt: new Date("2025-01-15T10:00:00Z") }),
      makeTradeFact({ id: "b", profit: 200, executedAt: new Date("2025-01-16T10:00:00Z") }),
    ];

    const result = deriveIntermediateResults(facts, 10000);

    expect(result.monteCarlo.tradePnls).toEqual([100, 200, 300]);
    expect(result.monteCarlo.initialBalance).toBe(10000);
  });

  it("WF sharpeDegradationPct is average of window degradations", () => {
    mockRunWalkForward.mockReturnValue({
      windows: [
        { degradation: { sharpeRatio: 20 }, outOfSample: { totalTrades: 50 } },
        { degradation: { sharpeRatio: 40 }, outOfSample: { totalTrades: 30 } },
        { degradation: { sharpeRatio: 60 }, outOfSample: { totalTrades: 40 } },
      ],
    });

    const facts = [makeTradeFact({ id: "a" })];
    const result = deriveIntermediateResults(facts, 10000);

    expect(result.walkForward.sharpeDegradationPct).toBe(40); // (20+40+60)/3
  });

  it("WF outOfSampleTradeCount is minimum window OOS count", () => {
    mockRunWalkForward.mockReturnValue({
      windows: [
        { degradation: { sharpeRatio: 10 }, outOfSample: { totalTrades: 50 } },
        { degradation: { sharpeRatio: 10 }, outOfSample: { totalTrades: 25 } },
        { degradation: { sharpeRatio: 10 }, outOfSample: { totalTrades: 40 } },
      ],
    });

    const facts = [makeTradeFact({ id: "a" })];
    const result = deriveIntermediateResults(facts, 10000);

    expect(result.walkForward.outOfSampleTradeCount).toBe(25);
  });

  it("empty windows returns zero values", () => {
    mockRunWalkForward.mockReturnValue({ windows: [] });

    const facts = [makeTradeFact({ id: "a" })];
    const result = deriveIntermediateResults(facts, 10000);

    expect(result.walkForward.sharpeDegradationPct).toBe(0);
    expect(result.walkForward.outOfSampleTradeCount).toBe(0);
  });

  it("reconstructed deals passed to runWalkForward have correct shape", () => {
    mockRunWalkForward.mockReturnValue({ windows: [] });

    const facts = [
      makeTradeFact({
        id: "a",
        sourceTicket: 999,
        direction: "SELL",
        volume: 0.5,
        openPrice: 1.234,
        sl: 1.24,
        tp: 1.22,
        profit: -30,
        executedAt: new Date("2025-03-01T14:00:00Z"),
        symbol: "GBPUSD",
        comment: "test comment",
      }),
    ];

    deriveIntermediateResults(facts, 5000);

    const [deals, initialDeposit] = mockRunWalkForward.mock.calls[0];
    expect(initialDeposit).toBe(5000);
    expect(deals).toHaveLength(1);
    expect(deals[0]).toEqual({
      ticket: 999,
      openTime: "2025-03-01T14:00:00.000Z",
      type: "sell",
      volume: 0.5,
      price: 1.234,
      sl: 1.24,
      tp: 1.22,
      profit: -30,
      symbol: "GBPUSD",
      comment: "test comment",
    });
  });

  it("null sl/tp/comment become undefined in reconstructed deal", () => {
    mockRunWalkForward.mockReturnValue({ windows: [] });

    const facts = [makeTradeFact({ id: "a", sl: null, tp: null, comment: null })];

    deriveIntermediateResults(facts, 10000);

    const deal = mockRunWalkForward.mock.calls[0][0][0];
    expect(deal.sl).toBeUndefined();
    expect(deal.tp).toBeUndefined();
    expect(deal.comment).toBeUndefined();
  });

  it("single window uses that window's values directly", () => {
    mockRunWalkForward.mockReturnValue({
      windows: [{ degradation: { sharpeRatio: 35 }, outOfSample: { totalTrades: 42 } }],
    });

    const facts = [makeTradeFact({ id: "a" })];
    const result = deriveIntermediateResults(facts, 10000);

    expect(result.walkForward.sharpeDegradationPct).toBe(35);
    expect(result.walkForward.outOfSampleTradeCount).toBe(42);
  });

  it("negative degradation values are handled correctly", () => {
    mockRunWalkForward.mockReturnValue({
      windows: [
        { degradation: { sharpeRatio: -10 }, outOfSample: { totalTrades: 50 } },
        { degradation: { sharpeRatio: 30 }, outOfSample: { totalTrades: 50 } },
      ],
    });

    const facts = [makeTradeFact({ id: "a" })];
    const result = deriveIntermediateResults(facts, 10000);

    expect(result.walkForward.sharpeDegradationPct).toBe(10); // (-10+30)/2
  });
});
