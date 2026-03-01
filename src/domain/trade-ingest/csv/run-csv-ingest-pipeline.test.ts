import { describe, it, expect, vi, beforeEach } from "vitest";

const mockParseCsvDeals = vi.fn();
const mockIngestTradeFactsFromDeals = vi.fn();
const mockBuildTradeSnapshot = vi.fn();
const mockFindMany = vi.fn();
const mockAppendProofEvent = vi.fn();

vi.mock("./parse-csv-deals", () => {
  class CsvParseError extends Error {
    details: string[];
    constructor(message: string, details: string[]) {
      super(message);
      this.name = "CsvParseError";
      this.details = details;
    }
  }
  return {
    parseCsvDeals: (...args: unknown[]) => mockParseCsvDeals(...args),
    CsvParseError,
  };
});

vi.mock("@/domain/trade-ingest", () => {
  class TradeFactValidationError extends Error {
    violations: string[];
    constructor(message: string, _ticket: number, violations: string[]) {
      super(message);
      this.name = "TradeFactValidationError";
      this.violations = violations;
    }
  }
  return {
    ingestTradeFactsFromDeals: (...args: unknown[]) => mockIngestTradeFactsFromDeals(...args),
    buildTradeSnapshot: (...args: unknown[]) => mockBuildTradeSnapshot(...args),
    TradeFactValidationError,
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tradeFact: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
  },
}));

vi.mock("@/lib/proof/events", () => ({
  appendProofEvent: (...args: unknown[]) => mockAppendProofEvent(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: { child: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }) },
}));

const FAKE_UUID = "11111111-1111-1111-1111-111111111111";

describe("runCsvIngestPipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("crypto", { randomUUID: () => FAKE_UUID });

    mockParseCsvDeals.mockReturnValue([
      { ticket: 1001, type: "buy", profit: 50 },
      { ticket: 1002, type: "sell", profit: -30 },
    ]);
    mockIngestTradeFactsFromDeals.mockResolvedValue({
      inserted: 2,
      skippedDuplicates: 0,
    });
    mockFindMany.mockResolvedValue([
      { id: "f1", profit: 50 },
      { id: "f2", profit: -30 },
    ]);
    mockBuildTradeSnapshot.mockReturnValue({
      snapshotHash: "snap_hash_abc",
      factCount: 2,
    });
    mockAppendProofEvent.mockResolvedValue({ sequence: 1, eventHash: "eh_1" });
  });

  async function importPipeline() {
    const { runCsvIngestPipeline } = await import("./run-csv-ingest-pipeline");
    return runCsvIngestPipeline;
  }

  const baseParams = {
    strategyId: "strat_1",
    source: "BACKTEST" as const,
    csv: "ticket,openTime,type,volume,price,profit\n1001,2025-01-15,buy,0.1,1.12,50",
    initialBalance: 10000,
  };

  it("happy path returns all fields including UUID recordId", async () => {
    const run = await importPipeline();
    const result = await run(baseParams);

    expect(result).toEqual({
      insertedCount: 2,
      skippedCount: 0,
      tradeFactCount: 2,
      tradeSnapshotHash: "snap_hash_abc",
      recordId: FAKE_UUID,
    });
  });

  it("propagates CsvParseError from parseCsvDeals", async () => {
    const { CsvParseError } = await import("./parse-csv-deals");
    mockParseCsvDeals.mockImplementation(() => {
      throw new CsvParseError("bad csv", ["missing ticket"]);
    });

    const run = await importPipeline();
    await expect(run(baseParams)).rejects.toThrow("bad csv");
  });

  it("propagates TradeFactValidationError from ingest", async () => {
    const { TradeFactValidationError } = await import("@/domain/trade-ingest");
    mockIngestTradeFactsFromDeals.mockRejectedValue(
      new TradeFactValidationError("invalid deal", 1001, ["negative volume"])
    );

    const run = await importPipeline();
    await expect(run(baseParams)).rejects.toThrow("invalid deal");
  });

  it("propagates generic ingest errors (not swallowed)", async () => {
    mockIngestTradeFactsFromDeals.mockRejectedValue(new Error("DB timeout"));

    const run = await importPipeline();
    await expect(run(baseParams)).rejects.toThrow("DB timeout");
  });

  it("throws when no facts found after ingest", async () => {
    mockFindMany.mockResolvedValue([]);

    const run = await importPipeline();
    await expect(run(baseParams)).rejects.toThrow("No trade facts found after ingest");
  });

  it("propagates appendProofEvent failure (fail-closed)", async () => {
    mockAppendProofEvent.mockRejectedValue(new Error("Serialization failure"));

    const run = await importPipeline();
    await expect(run(baseParams)).rejects.toThrow("Serialization failure");
  });

  it("merges proofPayloadExtras into proof payload", async () => {
    const run = await importPipeline();
    await run({ ...baseParams, proofPayloadExtras: { webhookVerified: true } });

    expect(mockAppendProofEvent).toHaveBeenCalledWith(
      "strat_1",
      "TRADE_FACTS_INGESTED",
      expect.objectContaining({ webhookVerified: true })
    );
  });

  it("uses backtestRunId as sourceRunId when provided", async () => {
    const run = await importPipeline();
    await run({ ...baseParams, backtestRunId: "run_42" });

    expect(mockIngestTradeFactsFromDeals).toHaveBeenCalledWith(
      expect.objectContaining({ sourceRunId: "run_42" })
    );
  });

  it("falls back to csv-import-<timestamp> sourceRunId when backtestRunId omitted", async () => {
    const run = await importPipeline();
    await run(baseParams);

    const call = mockIngestTradeFactsFromDeals.mock.calls[0][0];
    expect(call.sourceRunId).toMatch(/^csv-import-\d+$/);
  });
});
