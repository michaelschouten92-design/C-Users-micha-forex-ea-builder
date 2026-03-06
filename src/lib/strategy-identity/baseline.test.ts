import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockInfo } = vi.hoisted(() => ({
  mockInfo: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { child: () => ({ info: mockInfo, error: vi.fn() }) },
}));

vi.mock("@/lib/strategy-health/baseline-extractor", async () => {
  const actual = await vi.importActual("@/lib/strategy-health/baseline-extractor");
  return actual;
});

import { parsePeriodDays, createBaselineFromBacktest } from "./baseline";
import type { BacktestRunForBaseline } from "./baseline";

// ── parsePeriodDays ──────────────────────────────────────

describe("parsePeriodDays", () => {
  it("parses dot-separated period string", () => {
    expect(parsePeriodDays("2020.01.01 - 2024.12.31")).toBe(1826);
  });

  it("parses dash-separated dates", () => {
    expect(parsePeriodDays("2023-01-01 - 2023-12-31")).toBe(364);
  });

  it("parses without spaces around separator", () => {
    expect(parsePeriodDays("2020.01.01-2021.01.01")).toBe(366); // 2020 is leap year
  });

  it("returns null for invalid format", () => {
    expect(parsePeriodDays("Jan 2020 - Dec 2024")).toBeNull();
  });

  it("returns null for reversed dates", () => {
    expect(parsePeriodDays("2024.01.01 - 2020.01.01")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parsePeriodDays("")).toBeNull();
  });
});

// ── createBaselineFromBacktest ────────────────────────────

const BACKTEST_RUN: BacktestRunForBaseline = {
  id: "run_1",
  totalTrades: 500,
  winRate: 62,
  profitFactor: 1.8,
  maxDrawdownPct: 12.5,
  sharpeRatio: 1.5,
  initialDeposit: 10000,
  totalNetProfit: 4500,
  period: "2020.01.01 - 2024.12.31",
};

function makeTx(overrides: Record<string, unknown> = {}) {
  return {
    backtestBaseline: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
        id: "bl_new",
        ...data,
      })),
      ...overrides,
    },
  } as unknown as Parameters<typeof createBaselineFromBacktest>[0];
}

describe("createBaselineFromBacktest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates baseline with correct metrics from BacktestRun", async () => {
    const tx = makeTx();
    const result = await createBaselineFromBacktest(tx, "ver_1", BACKTEST_RUN);

    expect(result.isNew).toBe(true);
    expect(result.id).toBe("bl_new");

    const createCall = (tx.backtestBaseline.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const data = createCall.data;

    expect(data.strategyVersionId).toBe("ver_1");
    expect(data.backtestResultId).toBe("run_1");
    expect(data.totalTrades).toBe(500);
    expect(data.winRate).toBe(62);
    expect(data.profitFactor).toBe(1.8);
    expect(data.maxDrawdownPct).toBe(12.5);
    expect(data.sharpeRatio).toBe(1.5);
    expect(data.initialDeposit).toBe(10000);
    expect(data.backtestDurationDays).toBe(1826);
    expect(data.avgTradesPerDay).toBeCloseTo(500 / 1826, 2);
    expect(data.netReturnPct).toBeCloseTo(45, 1);
  });

  it("returns existing baseline without creating (idempotent)", async () => {
    const tx = makeTx({
      findUnique: vi.fn().mockResolvedValue({ id: "bl_existing" }),
    });

    const result = await createBaselineFromBacktest(tx, "ver_1", BACKTEST_RUN);

    expect(result).toEqual({ id: "bl_existing", isNew: false });
    expect(tx.backtestBaseline.create).not.toHaveBeenCalled();
  });

  it("falls back to estimated duration when period is unparseable", async () => {
    const tx = makeTx();
    const run = { ...BACKTEST_RUN, period: "invalid" };

    await createBaselineFromBacktest(tx, "ver_1", run);

    const data = (tx.backtestBaseline.create as ReturnType<typeof vi.fn>).mock.calls[0][0].data;
    // estimateBacktestDuration returns max(30, round(totalTrades / 2)) = 250
    expect(data.backtestDurationDays).toBe(250);
  });

  it("handles null sharpeRatio", async () => {
    const tx = makeTx();
    const run = { ...BACKTEST_RUN, sharpeRatio: null };

    await createBaselineFromBacktest(tx, "ver_1", run);

    const data = (tx.backtestBaseline.create as ReturnType<typeof vi.fn>).mock.calls[0][0].data;
    expect(data.sharpeRatio).toBe(0);
  });

  it("produces deterministic output for same input", async () => {
    const tx1 = makeTx();
    const tx2 = makeTx();

    await createBaselineFromBacktest(tx1, "ver_1", BACKTEST_RUN);
    await createBaselineFromBacktest(tx2, "ver_1", BACKTEST_RUN);

    const data1 = (tx1.backtestBaseline.create as ReturnType<typeof vi.fn>).mock.calls[0][0].data;
    const data2 = (tx2.backtestBaseline.create as ReturnType<typeof vi.fn>).mock.calls[0][0].data;

    // All numeric fields should be identical
    expect(data1.totalTrades).toBe(data2.totalTrades);
    expect(data1.netReturnPct).toBe(data2.netReturnPct);
    expect(data1.avgTradesPerDay).toBe(data2.avgTradesPerDay);
    expect(data1.backtestDurationDays).toBe(data2.backtestDurationDays);
  });

  it("stores rawMetrics as JSON", async () => {
    const tx = makeTx();
    await createBaselineFromBacktest(tx, "ver_1", BACKTEST_RUN);

    const data = (tx.backtestBaseline.create as ReturnType<typeof vi.fn>).mock.calls[0][0].data;
    expect(data.rawMetrics).toBeDefined();
    expect(typeof data.rawMetrics).toBe("object");
    expect(data.rawMetrics.totalTrades).toBe(500);
  });
});
