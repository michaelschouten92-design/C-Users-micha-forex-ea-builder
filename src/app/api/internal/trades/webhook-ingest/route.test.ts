import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createHmac } from "node:crypto";

const WEBHOOK_SECRET = "test-webhook-secret-at-least-32-chars-long";

const mockRunCsvIngestPipeline = vi.fn();

vi.mock("@/domain/trade-ingest/csv/run-csv-ingest-pipeline", async () => {
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

vi.mock("@/lib/webhook-signature", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/webhook-signature")>();
  return { ...actual };
});

vi.mock("@/lib/csrf", () => ({
  timingSafeEqual: (a: string, b: string) => a === b,
}));

const mockCheckRateLimit = vi.fn();

vi.mock("@/lib/rate-limit", () => ({
  internalWebhookIngestRateLimiter: {},
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getClientIp: () => "127.0.0.1",
  createRateLimitHeaders: vi.fn().mockReturnValue({}),
  formatRateLimitError: vi.fn().mockReturnValue("Rate limit exceeded. Try again in 60 seconds."),
}));

const VALID_CSV = `ticket,openTime,type,volume,price,profit,symbol
1001,2025-01-15T10:30:00.000Z,buy,0.1,1.1234,50.25,EURUSD
1002,2025-01-15T11:00:00.000Z,sell,0.2,1.1200,-30.50,EURUSD`;

function validBody() {
  return {
    strategyId: "strat_1",
    source: "BACKTEST" as const,
    csv: VALID_CSV,
    initialBalance: 10000,
  };
}

function sign(body: string, secret = WEBHOOK_SECRET): { signature: string; timestamp: string } {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return { signature, timestamp };
}

function makeRequest(
  body: object,
  opts?: { signature?: string; timestamp?: string; skipSign?: boolean }
) {
  const jsonBody = JSON.stringify(body);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (!opts?.skipSign) {
    const signed = sign(jsonBody);
    headers["x-ingest-signature"] = opts?.signature ?? signed.signature;
    headers["x-ingest-timestamp"] = opts?.timestamp ?? signed.timestamp;
  }

  return new NextRequest("http://localhost/api/internal/trades/webhook-ingest", {
    method: "POST",
    headers,
    body: jsonBody,
  });
}

describe("POST /api/internal/trades/webhook-ingest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INGEST_WEBHOOK_SECRET = WEBHOOK_SECRET;
    mockCheckRateLimit.mockResolvedValue({
      success: true,
      limit: 30,
      remaining: 29,
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

  it("happy path with valid signature returns 200 with all fields + recordId", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody()));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.insertedCount).toBe(2);
    expect(json.skippedCount).toBe(0);
    expect(json.tradeFactCount).toBe(2);
    expect(json.tradeSnapshotHash).toBe("abc123hash");
    expect(json.recordId).toBe("00000000-0000-0000-0000-000000000001");
  });

  it("rejects missing signature header with 401", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody(), { skipSign: true }));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.code).toBe("UNAUTHORIZED");
  });

  it("rejects invalid signature with 401", async () => {
    const { POST } = await import("./route");
    const res = await POST(
      makeRequest(validBody(), {
        signature: "a".repeat(64),
        timestamp: String(Math.floor(Date.now() / 1000)),
      })
    );
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.code).toBe("UNAUTHORIZED");
  });

  it("rejects expired timestamp with 401", async () => {
    const body = validBody();
    const jsonBody = JSON.stringify(body);
    const expiredTs = String(Math.floor(Date.now() / 1000) - 400);
    const sig = createHmac("sha256", WEBHOOK_SECRET)
      .update(`${expiredTs}.${jsonBody}`)
      .digest("hex");

    const { POST } = await import("./route");
    const req = new NextRequest("http://localhost/api/internal/trades/webhook-ingest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-ingest-signature": sig,
        "x-ingest-timestamp": expiredTs,
      },
      body: jsonBody,
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.code).toBe("UNAUTHORIZED");
  });

  it("returns 429 when rate limit is exceeded", async () => {
    mockCheckRateLimit.mockResolvedValueOnce({
      success: false,
      limit: 30,
      remaining: 0,
      resetAt: new Date(Date.now() + 60_000),
    });

    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody()));
    const json = await res.json();

    expect(res.status).toBe(429);
    expect(json.code).toBe("RATE_LIMITED");
  });

  it("returns 400 for invalid JSON body", async () => {
    const rawBody = "not-json{{{";
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = createHmac("sha256", WEBHOOK_SECRET)
      .update(`${timestamp}.${rawBody}`)
      .digest("hex");

    const { POST } = await import("./route");
    const req = new NextRequest("http://localhost/api/internal/trades/webhook-ingest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-ingest-signature": signature,
        "x-ingest-timestamp": timestamp,
      },
      body: rawBody,
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.code).toBe("INVALID_JSON");
  });

  it("returns 400 for failed Zod validation", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ strategyId: "" }));
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
    const res = await POST(makeRequest(validBody()));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.code).toBe("PARSE_FAILED");
  });

  it("returns 400 for TradeFactValidationError from pipeline", async () => {
    const { TradeFactValidationError } =
      await import("@/domain/trade-ingest/csv/run-csv-ingest-pipeline");
    mockRunCsvIngestPipeline.mockRejectedValueOnce(
      new TradeFactValidationError("bad deal", 1001, ["negative volume"])
    );

    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody()));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.code).toBe("VALIDATION_FAILED");
  });

  it("returns 500 for pipeline errors (proof failure)", async () => {
    mockRunCsvIngestPipeline.mockRejectedValueOnce(new Error("Serialization failure"));

    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody()));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.code).toBe("INTERNAL_ERROR");
  });

  it("response always includes recordId", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody()));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.recordId).toBeDefined();
    expect(typeof json.recordId).toBe("string");
  });
});
