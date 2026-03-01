import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const TEST_API_KEY = "test-internal-api-key-that-is-at-least-32-chars";

const mockRunVerification = vi.fn();

vi.mock("@/domain/verification/verification-service", () => ({
  runVerification: (...args: unknown[]) => mockRunVerification(...args),
}));

vi.mock("@/lib/proof/events", () => ({
  appendProofEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/csrf", () => ({
  timingSafeEqual: (a: string, b: string) => a === b,
}));

const mockCheckRateLimit = vi.fn();

vi.mock("@/lib/rate-limit", () => ({
  internalVerifyRateLimiter: {},
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getClientIp: () => "127.0.0.1",
  createRateLimitHeaders: vi.fn().mockReturnValue({}),
  formatRateLimitError: vi.fn().mockReturnValue("Rate limit exceeded. Try again in 60 seconds."),
}));

function makeRequest(body: object, apiKey?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers["x-internal-api-key"] = apiKey;
  }
  return new NextRequest("http://localhost/api/internal/verify", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function validBody() {
  return {
    strategyId: "strat_1",
    strategyVersion: 1,
    currentLifecycleState: "BACKTESTED",
    tradeHistory: Array.from({ length: 100 }, (_, i) => ({ id: i })),
    backtestParameters: {},
  };
}

describe("POST /api/internal/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INTERNAL_API_KEY = TEST_API_KEY;
    mockCheckRateLimit.mockResolvedValue({
      success: true,
      limit: 20,
      remaining: 19,
      resetAt: new Date(),
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

  it("rejects requests when INTERNAL_API_KEY is not configured", async () => {
    delete process.env.INTERNAL_API_KEY;
    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody(), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.code).toBe("UNAUTHORIZED");
  });

  it("rejects invalid request body with 400", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ strategyId: "" }, TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.code).toBe("VALIDATION_FAILED");
    expect(json.details).toBeDefined();
  });

  it("returns verdictResult, lifecycleState, and decision on success", async () => {
    const mockResult = {
      verdictResult: {
        strategyId: "strat_1",
        strategyVersion: 1,
        verdict: "UNCERTAIN",
        reasonCodes: ["COMPOSITE_IN_UNCERTAIN_BAND"],
        scores: {
          composite: 0.6,
          walkForwardDegradationPct: null,
          walkForwardOosSampleSize: null,
          monteCarloRuinProbability: null,
          sampleSize: 100,
        },
        thresholdsUsed: {
          configVersion: "1.0.0",
          thresholdsHash: "abc123",
          minTradeCount: 30,
          readyConfidenceThreshold: 0.75,
          notDeployableThreshold: 0.45,
          maxSharpeDegradationPct: 40,
          extremeSharpeDegradationPct: 80,
          minOosTradeCount: 20,
          ruinProbabilityCeiling: 0.15,
        },
        warnings: [],
      },
      lifecycleState: "BACKTESTED",
      decision: { kind: "NO_TRANSITION", reason: "verdict_uncertain" },
    };
    mockRunVerification.mockResolvedValueOnce(mockResult);

    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody(), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.verdictResult.verdict).toBe("UNCERTAIN");
    expect(json.lifecycleState).toBe("BACKTESTED");
    expect(json.decision).toEqual({ kind: "NO_TRANSITION", reason: "verdict_uncertain" });
    expect(mockRunVerification).toHaveBeenCalledWith(
      expect.objectContaining({
        strategyId: "strat_1",
        strategyVersion: 1,
        currentLifecycleState: "BACKTESTED",
      })
    );
  });

  it("returns 500 when runVerification throws", async () => {
    mockRunVerification.mockRejectedValueOnce(new Error("DB write failed"));

    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody(), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.code).toBe("INTERNAL_ERROR");
  });

  it("returns 429 when rate limit is exceeded", async () => {
    mockCheckRateLimit.mockResolvedValueOnce({
      success: false,
      limit: 20,
      remaining: 0,
      resetAt: new Date(Date.now() + 60_000),
    });

    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody(), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(429);
    expect(json.code).toBe("RATE_LIMITED");
  });

  it("schema accepts optional backtestRunId", async () => {
    mockRunVerification.mockResolvedValueOnce({
      verdictResult: {
        verdict: "UNCERTAIN",
        reasonCodes: [],
        scores: {},
        thresholdsUsed: {},
        warnings: [],
      },
      lifecycleState: "BACKTESTED",
      decision: { kind: "NO_TRANSITION", reason: "verdict_uncertain" },
    });

    const { POST } = await import("./route");
    const body = { ...validBody(), backtestRunId: "run_abc123" };
    const res = await POST(makeRequest(body, TEST_API_KEY));

    expect(res.status).toBe(200);
  });

  it("backtestRunId is passed through to runVerification", async () => {
    mockRunVerification.mockResolvedValueOnce({
      verdictResult: {
        verdict: "UNCERTAIN",
        reasonCodes: [],
        scores: {},
        thresholdsUsed: {},
        warnings: [],
      },
      lifecycleState: "BACKTESTED",
      decision: { kind: "NO_TRANSITION", reason: "verdict_uncertain" },
    });

    const { POST } = await import("./route");
    const body = { ...validBody(), backtestRunId: "run_xyz789" };
    await POST(makeRequest(body, TEST_API_KEY));

    expect(mockRunVerification).toHaveBeenCalledWith(
      expect.objectContaining({ backtestRunId: "run_xyz789" })
    );
  });
});
