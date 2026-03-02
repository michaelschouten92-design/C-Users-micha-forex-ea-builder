import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const TEST_API_KEY = "test-internal-api-key-that-is-at-least-32-chars";

const mockMonitoringRunFindMany = vi.fn();
const mockIncidentFindMany = vi.fn();
const mockOverrideRequestFindMany = vi.fn();

vi.mock("@/lib/csrf", () => ({
  timingSafeEqual: (a: string, b: string) => a === b,
}));

const mockCheckRateLimit = vi.fn();

vi.mock("@/lib/rate-limit", () => ({
  internalStrategyTrendsRateLimiter: {},
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getClientIp: () => "127.0.0.1",
  createRateLimitHeaders: vi.fn().mockReturnValue({}),
  formatRateLimitError: vi.fn().mockReturnValue("Rate limit exceeded."),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    monitoringRun: {
      findMany: (...args: unknown[]) => mockMonitoringRunFindMany(...args),
    },
    incident: {
      findMany: (...args: unknown[]) => mockIncidentFindMany(...args),
    },
    overrideRequest: {
      findMany: (...args: unknown[]) => mockOverrideRequestFindMany(...args),
    },
  },
}));

function makeRequest(apiKey?: string, window?: number) {
  const headers: Record<string, string> = {};
  if (apiKey) headers["x-internal-api-key"] = apiKey;
  const url = window
    ? `http://localhost/api/internal/strategies/strat_1/trends?window=${window}`
    : "http://localhost/api/internal/strategies/strat_1/trends";
  return new NextRequest(url, { method: "GET", headers });
}

const paramsPromise = Promise.resolve({ id: "strat_1" });

describe("GET /api/internal/strategies/[id]/trends", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INTERNAL_API_KEY = TEST_API_KEY;
    mockCheckRateLimit.mockResolvedValue({
      success: true,
      limit: 60,
      remaining: 59,
      resetAt: new Date(),
    });
    mockMonitoringRunFindMany.mockResolvedValue([]);
    mockIncidentFindMany.mockResolvedValue([]);
    mockOverrideRequestFindMany.mockResolvedValue([]);
  });

  it("rejects without API key (401)", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeRequest(), { params: paramsPromise });
    expect(res.status).toBe(401);
  });

  it("rejects with wrong API key (401)", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeRequest("wrong-key"), { params: paramsPromise });
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockResolvedValue({
      success: false,
      limit: 60,
      remaining: 0,
      resetAt: new Date(),
    });

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY), { params: paramsPromise });
    expect(res.status).toBe(429);

    const json = await res.json();
    expect(json.code).toBe("RATE_LIMITED");
  });

  it("returns correct empty shape", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY), { params: paramsPromise });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.strategyId).toBe("strat_1");
    expect(json.window).toBe(30);

    expect(json.monitoring).toEqual({
      totalRuns: 0,
      healthyCount: 0,
      atRiskCount: 0,
      invalidatedCount: 0,
      failedCount: 0,
      mostCommonReasons: [],
      lastRuns: [],
    });

    expect(json.incidents).toEqual({
      openedInWindow: 0,
      escalatedInWindow: 0,
      autoInvalidatedInWindow: 0,
      lastIncident: null,
    });

    expect(json.overrides).toEqual({
      requestedInWindow: 0,
      appliedInWindow: 0,
      expiredInWindow: 0,
    });
  });

  it("aggregates monitoring runs correctly", async () => {
    mockMonitoringRunFindMany.mockResolvedValue([
      {
        id: "mr_1",
        completedAt: new Date("2026-03-01T12:00:00Z"),
        status: "COMPLETED",
        verdict: "AT_RISK",
        reasons: ["MONITORING_DRAWDOWN_BREACH", "MONITORING_SHARPE_DEGRADATION"],
      },
      {
        id: "mr_2",
        completedAt: new Date("2026-03-01T11:00:00Z"),
        status: "COMPLETED",
        verdict: "AT_RISK",
        reasons: ["MONITORING_DRAWDOWN_BREACH"],
      },
      {
        id: "mr_3",
        completedAt: new Date("2026-03-01T10:00:00Z"),
        status: "COMPLETED",
        verdict: "HEALTHY",
        reasons: [],
      },
      {
        id: "mr_4",
        completedAt: null,
        status: "FAILED",
        verdict: null,
        reasons: null,
      },
      {
        id: "mr_5",
        completedAt: new Date("2026-03-01T08:00:00Z"),
        status: "COMPLETED",
        verdict: "INVALIDATED",
        reasons: ["MONITORING_LOSING_STREAK"],
      },
    ]);

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY), { params: paramsPromise });
    const json = await res.json();

    const m = json.monitoring;
    expect(m.totalRuns).toBe(5);
    expect(m.healthyCount).toBe(1);
    expect(m.atRiskCount).toBe(2);
    expect(m.invalidatedCount).toBe(1);
    expect(m.failedCount).toBe(1);

    // Top reasons: DRAWDOWN=2, SHARPE=1, LOSING=1
    expect(m.mostCommonReasons[0]).toEqual({
      reasonCode: "MONITORING_DRAWDOWN_BREACH",
      count: 2,
    });
    expect(m.mostCommonReasons).toHaveLength(3);

    // Last 10 runs (we have 5)
    expect(m.lastRuns).toHaveLength(5);
    expect(m.lastRuns[0].verdict).toBe("AT_RISK");
  });

  it("aggregates incidents correctly", async () => {
    mockIncidentFindMany.mockResolvedValue([
      {
        id: "inc_1",
        status: "ESCALATED",
        openedAt: new Date("2026-03-01T10:00:00Z"),
        closedAt: null,
        closeReason: null,
      },
      {
        id: "inc_2",
        status: "CLOSED",
        openedAt: new Date("2026-02-28T10:00:00Z"),
        closedAt: new Date("2026-02-28T14:00:00Z"),
        closeReason: "AUTO_INVALIDATED",
      },
      {
        id: "inc_3",
        status: "CLOSED",
        openedAt: new Date("2026-02-27T10:00:00Z"),
        closedAt: new Date("2026-02-27T12:00:00Z"),
        closeReason: "RECOVERED",
      },
    ]);

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY), { params: paramsPromise });
    const json = await res.json();

    expect(json.incidents.openedInWindow).toBe(3);
    expect(json.incidents.escalatedInWindow).toBe(1);
    expect(json.incidents.autoInvalidatedInWindow).toBe(1);
    expect(json.incidents.lastIncident).toEqual(
      expect.objectContaining({ id: "inc_1", status: "ESCALATED" })
    );
  });

  it("aggregates overrides correctly", async () => {
    mockOverrideRequestFindMany.mockResolvedValue([
      { status: "APPLIED" },
      { status: "APPLIED" },
      { status: "EXPIRED" },
      { status: "PENDING" },
    ]);

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY), { params: paramsPromise });
    const json = await res.json();

    expect(json.overrides.requestedInWindow).toBe(4);
    expect(json.overrides.appliedInWindow).toBe(2);
    expect(json.overrides.expiredInWindow).toBe(1);
  });

  it("respects window query parameter", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY, 7), { params: paramsPromise });
    const json = await res.json();

    expect(json.window).toBe(7);

    // Verify the window filter was passed to queries
    const callArg = mockMonitoringRunFindMany.mock.calls[0][0];
    expect(callArg.where.strategyId).toBe("strat_1");
    expect(callArg.where.requestedAt.gte).toBeInstanceOf(Date);
  });

  it("returns 500 on DB error", async () => {
    mockMonitoringRunFindMany.mockRejectedValue(new Error("DB crash"));

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY), { params: paramsPromise });

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.code).toBe("INTERNAL_ERROR");
  });
});
