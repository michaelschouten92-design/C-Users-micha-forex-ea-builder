import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const TEST_API_KEY = "test-internal-api-key-that-is-at-least-32-chars";

const mockRunCsvIngestPipeline = vi.fn();

// Mock the shared pipeline — the route only calls this
vi.mock("@/domain/trade-ingest/csv/run-csv-ingest-pipeline", async () => {
  // CsvParseError is a real class used for instanceof checks
  class CsvParseError extends Error {
    details: string[];
    constructor(message: string, _line: number | null, details: string[]) {
      super(message);
      this.name = "CsvParseError";
      this.details = details;
    }
  }
  class TradeFactValidationError extends Error {
    violations: string[];
    constructor(message: string, _ticket: number, violations: string[]) {
      super(message);
      this.name = "TradeFactValidationError";
      this.violations = violations;
    }
  }
  return {
    runCsvIngestPipeline: (...args: unknown[]) => mockRunCsvIngestPipeline(...args),
    CsvParseError,
    TradeFactValidationError,
  };
});

vi.mock("@/lib/csrf", () => ({
  timingSafeEqual: (a: string, b: string) => a === b,
}));

const mockCheckRateLimit = vi.fn();

vi.mock("@/lib/rate-limit", () => ({
  internalTradeImportRateLimiter: {},
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getClientIp: () => "127.0.0.1",
  createRateLimitHeaders: vi.fn().mockReturnValue({}),
  formatRateLimitError: vi.fn().mockReturnValue("Rate limit exceeded. Try again in 60 seconds."),
}));

const VALID_CSV = `ticket,openTime,type,volume,price,profit,symbol
1001,2025-01-15T10:30:00.000Z,buy,0.1,1.1234,50.25,EURUSD
1002,2025-01-15T11:00:00.000Z,sell,0.2,1.1200,-30.50,EURUSD`;

function makeRequest(body: object, apiKey?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers["x-internal-api-key"] = apiKey;
  }
  return new NextRequest("http://localhost/api/internal/trades/import-csv", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function validBody() {
  return {
    strategyId: "strat_1",
    source: "BACKTEST" as const,
    csv: VALID_CSV,
    initialBalance: 10000,
  };
}

describe("POST /api/internal/trades/import-csv", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INTERNAL_API_KEY = TEST_API_KEY;
    mockCheckRateLimit.mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      resetAt: new Date(),
    });
    mockRunCsvIngestPipeline.mockResolvedValue({
      insertedCount: 2,
      skippedCount: 0,
      tradeFactCount: 2,
      tradeSnapshotHash: "abc123hash",
      recordId: "00000000-0000-0000-0000-000000000001",
    });
  });

  it("rejects requests without api key with 401", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody()));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.code).toBe("UNAUTHORIZED");
  });

  it("rejects requests with wrong api key with 401", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody(), "wrong-key-that-is-definitely-not-correct"));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.code).toBe("UNAUTHORIZED");
  });

  it("returns 429 when rate limit is exceeded", async () => {
    mockCheckRateLimit.mockResolvedValueOnce({
      success: false,
      limit: 10,
      remaining: 0,
      resetAt: new Date(Date.now() + 60_000),
    });

    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody(), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(429);
    expect(json.code).toBe("RATE_LIMITED");
  });

  it("rejects invalid request body with 400", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ strategyId: "" }, TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.code).toBe("VALIDATION_FAILED");
    expect(json.details).toBeDefined();
  });

  it("returns 400 for CsvParseError from pipeline", async () => {
    const { CsvParseError } = await import("@/domain/trade-ingest/csv/run-csv-ingest-pipeline");
    mockRunCsvIngestPipeline.mockRejectedValueOnce(
      new CsvParseError("bad csv", null, ["missing ticket column"])
    );

    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody(), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.code).toBe("PARSE_FAILED");
    expect(json.details).toBeDefined();
  });

  it("returns 400 for TradeFactValidationError from pipeline", async () => {
    const { TradeFactValidationError } =
      await import("@/domain/trade-ingest/csv/run-csv-ingest-pipeline");
    mockRunCsvIngestPipeline.mockRejectedValueOnce(
      new TradeFactValidationError("bad deal", 1001, ["negative volume"])
    );

    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody(), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.code).toBe("VALIDATION_FAILED");
  });

  it("returns 500 for unexpected pipeline errors", async () => {
    mockRunCsvIngestPipeline.mockRejectedValueOnce(new Error("DB connection lost"));

    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody(), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.code).toBe("INTERNAL_ERROR");
  });

  it("happy path returns snapshotHash and counts", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody(), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.insertedCount).toBe(2);
    expect(json.skippedCount).toBe(0);
    expect(json.tradeFactCount).toBe(2);
    expect(json.tradeSnapshotHash).toBe("abc123hash");
  });

  it("includes backtestRunId in response when provided", async () => {
    const { POST } = await import("./route");
    const body = { ...validBody(), backtestRunId: "run_abc123" };
    const res = await POST(makeRequest(body, TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.backtestRunId).toBe("run_abc123");
  });

  it("omits backtestRunId from response when not provided", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody(), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.backtestRunId).toBeUndefined();
  });

  it("passes correct params to pipeline", async () => {
    const { POST } = await import("./route");
    const body = { ...validBody(), backtestRunId: "run_1", symbolFallback: "GBPUSD" };
    await POST(makeRequest(body, TEST_API_KEY));

    expect(mockRunCsvIngestPipeline).toHaveBeenCalledWith({
      strategyId: "strat_1",
      source: "BACKTEST",
      csv: VALID_CSV,
      backtestRunId: "run_1",
      symbolFallback: "GBPUSD",
      initialBalance: 10000,
    });
  });
});
