import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const TEST_API_KEY = "test-internal-api-key-that-is-at-least-32-chars";

const mockFindMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    proofEventLog: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
  },
}));

vi.mock("@/lib/csrf", () => ({
  timingSafeEqual: (a: string, b: string) => a === b,
}));

const mockCheckRateLimit = vi.fn();

vi.mock("@/lib/rate-limit", () => ({
  internalProofEventsRateLimiter: {},
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getClientIp: () => "127.0.0.1",
  createRateLimitHeaders: vi.fn().mockReturnValue({}),
  formatRateLimitError: vi.fn().mockReturnValue("Rate limit exceeded. Try again in 60 seconds."),
}));

function makeRequest(params?: Record<string, string>, apiKey?: string) {
  const url = new URL("http://localhost/api/internal/proof-events");
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const headers: Record<string, string> = {};
  if (apiKey) headers["x-internal-api-key"] = apiKey;
  return new NextRequest(url, { method: "GET", headers });
}

describe("GET /api/internal/proof-events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INTERNAL_API_KEY = TEST_API_KEY;
    mockCheckRateLimit.mockResolvedValue({
      success: true,
      limit: 30,
      remaining: 29,
      resetAt: new Date(),
    });
  });

  it("rejects requests without api key with 401", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeRequest({ strategyId: "strat_1" }));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.code).toBe("UNAUTHORIZED");
  });

  it("rejects requests with wrong api key with 401", async () => {
    const { GET } = await import("./route");
    const res = await GET(
      makeRequest({ strategyId: "strat_1" }, "wrong-key-that-is-definitely-not-correct")
    );
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.code).toBe("UNAUTHORIZED");
  });

  it("rejects requests with missing strategyId with 400", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeRequest({}, TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.code).toBe("VALIDATION_FAILED");
  });

  it("returns proof events on success with meta renamed to payload", async () => {
    const mockEvents = [
      {
        createdAt: new Date().toISOString(),
        type: "VERIFICATION_STARTED",
        sessionId: "sess_1",
        meta: { foo: "bar" },
        sequence: null,
        eventHash: null,
        prevEventHash: null,
      },
    ];
    mockFindMany.mockResolvedValueOnce(mockEvents);

    const { GET } = await import("./route");
    const res = await GET(makeRequest({ strategyId: "strat_1" }, TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toEqual([
      {
        createdAt: mockEvents[0].createdAt,
        type: "VERIFICATION_STARTED",
        sessionId: "sess_1",
        payload: { foo: "bar" },
        sequence: null,
        eventHash: null,
        prevEventHash: null,
      },
    ]);
    expect(json.data[0]).not.toHaveProperty("meta");
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { strategyId: "strat_1" },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          createdAt: true,
          type: true,
          sessionId: true,
          meta: true,
          sequence: true,
          eventHash: true,
          prevEventHash: true,
        },
      })
    );
  });

  it("returns contract-shaped payload keys for verification events", async () => {
    const contractPayload = {
      eventType: "VERIFICATION_RUN_COMPLETED",
      strategyId: "strat_contract",
      strategyVersion: 2,
      verdict: "READY",
      reasonCodes: ["ALL_CHECKS_PASSED"],
      thresholdsHash: "sha256:abc123",
      recordId: "rec_001",
      timestamp: "2026-01-01T00:00:00.000Z",
    };
    const mockEvents = [
      {
        createdAt: "2026-01-01T00:00:00.000Z",
        type: "VERIFICATION_RUN_COMPLETED",
        sessionId: "sess_contract",
        meta: contractPayload,
        sequence: 1,
        eventHash: "abc123",
        prevEventHash: "0".repeat(64),
      },
    ];
    mockFindMany.mockResolvedValueOnce(mockEvents);

    const { GET } = await import("./route");
    const res = await GET(makeRequest({ strategyId: "strat_contract" }, TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(200);
    const payload = json.data[0].payload;
    expect(payload).toEqual(
      expect.objectContaining({
        eventType: "VERIFICATION_RUN_COMPLETED",
        strategyId: "strat_contract",
        strategyVersion: 2,
        verdict: "READY",
        reasonCodes: ["ALL_CHECKS_PASSED"],
        thresholdsHash: expect.any(String),
        recordId: expect.any(String),
        timestamp: expect.any(String),
      })
    );
  });

  it("returns 500 when prisma throws", async () => {
    mockFindMany.mockRejectedValueOnce(new Error("DB read failed"));

    const { GET } = await import("./route");
    const res = await GET(makeRequest({ strategyId: "strat_1" }, TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.code).toBe("INTERNAL_ERROR");
  });

  it("returns 429 when rate limit is exceeded", async () => {
    mockCheckRateLimit.mockResolvedValueOnce({
      success: false,
      limit: 30,
      remaining: 0,
      resetAt: new Date(Date.now() + 60_000),
    });

    const { GET } = await import("./route");
    const res = await GET(makeRequest({ strategyId: "strat_1" }, TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(429);
    expect(json.code).toBe("RATE_LIMITED");
  });

  it("includes chain fields in response", async () => {
    const mockEvents = [
      {
        createdAt: new Date().toISOString(),
        type: "VERIFICATION_RUN_COMPLETED",
        sessionId: "rec_001",
        meta: { recordId: "rec_001" },
        sequence: 1,
        eventHash: "a".repeat(64),
        prevEventHash: "0".repeat(64),
      },
    ];
    mockFindMany.mockResolvedValueOnce(mockEvents);

    const { GET } = await import("./route");
    const res = await GET(makeRequest({ strategyId: "strat_1" }, TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data[0]).toHaveProperty("sequence", 1);
    expect(json.data[0]).toHaveProperty("eventHash", "a".repeat(64));
    expect(json.data[0]).toHaveProperty("prevEventHash", "0".repeat(64));
  });

  it("returns chainVerification when verify=true with recordId", async () => {
    // First call: main event list
    mockFindMany.mockResolvedValueOnce([]);
    // Second call: chained events for verification
    mockFindMany.mockResolvedValueOnce([]);

    const { GET } = await import("./route");
    const res = await GET(
      makeRequest({ strategyId: "strat_1", verify: "true", recordId: "rec_001" }, TEST_API_KEY)
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toHaveProperty("chainVerification");
    expect(json.chainVerification).toEqual({ valid: true, chainLength: 0 });

    // Verify the chain query filters by sessionId (recordId), not strategyId
    const chainCall = mockFindMany.mock.calls[1][0];
    expect(chainCall.where).toEqual({ sessionId: "rec_001", sequence: { not: null } });
    expect(chainCall.orderBy).toEqual({ sequence: "asc" });
  });

  it("returns 400 when verify=true but recordId is missing", async () => {
    mockFindMany.mockResolvedValueOnce([]);

    const { GET } = await import("./route");
    const res = await GET(makeRequest({ strategyId: "strat_1", verify: "true" }, TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.code).toBe("VALIDATION_FAILED");
  });

  it("does not include chainVerification when verify is absent", async () => {
    mockFindMany.mockResolvedValueOnce([]);

    const { GET } = await import("./route");
    const res = await GET(makeRequest({ strategyId: "strat_1" }, TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).not.toHaveProperty("chainVerification");
  });
});
