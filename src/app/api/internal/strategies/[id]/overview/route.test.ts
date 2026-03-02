import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const TEST_API_KEY = "test-internal-api-key-that-is-at-least-32-chars";

const mockLiveEAInstanceFindFirst = vi.fn();
const mockMonitoringRunFindMany = vi.fn();
const mockIncidentFindMany = vi.fn();
const mockOverrideRequestFindMany = vi.fn();

vi.mock("@/lib/csrf", () => ({
  timingSafeEqual: (a: string, b: string) => a === b,
}));

const mockCheckRateLimit = vi.fn();

vi.mock("@/lib/rate-limit", () => ({
  internalStrategyOverviewRateLimiter: {},
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getClientIp: () => "127.0.0.1",
  createRateLimitHeaders: vi.fn().mockReturnValue({}),
  formatRateLimitError: vi.fn().mockReturnValue("Rate limit exceeded."),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    liveEAInstance: {
      findFirst: (...args: unknown[]) => mockLiveEAInstanceFindFirst(...args),
    },
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

function makeRequest(apiKey?: string) {
  const headers: Record<string, string> = {};
  if (apiKey) headers["x-internal-api-key"] = apiKey;
  return new NextRequest("http://localhost/api/internal/strategies/strat_1/overview", {
    method: "GET",
    headers,
  });
}

const instanceRow = {
  id: "inst_1",
  lifecycleState: "EDGE_AT_RISK",
  operatorHold: "NONE",
  monitoringSuppressedUntil: null,
};

const monitoringRunRow = {
  id: "mr_1",
  completedAt: new Date("2026-03-01T12:00:00Z"),
  status: "COMPLETED",
  verdict: "AT_RISK",
  reasons: ["MONITORING_DRAWDOWN_BREACH"],
  tradeSnapshotHash: "snap_hash_1",
  configVersion: "2.3.2",
  thresholdsHash: "thresh_hash_1",
};

const incidentRow = {
  id: "inc_1",
  status: "OPEN",
  openedAt: new Date("2026-03-01T10:00:00Z"),
  closedAt: null,
  closeReason: null,
  ackDeadlineAt: new Date("2026-03-01T11:00:00Z"),
  escalationCount: 0,
  triggerRecordId: "rec_1",
};

const overrideRow = {
  id: "or_1",
  status: "APPROVED",
  requestedAt: new Date("2026-03-01T09:00:00Z"),
  requestedBy: "operator_alice",
  approvedAt: new Date("2026-03-01T09:30:00Z"),
  approvedBy: "operator_bob",
  appliedAt: null,
  expiresAt: new Date("2026-03-02T09:00:00Z"),
  requestRecordId: "rec_or_1",
};

const paramsPromise = Promise.resolve({ id: "strat_1" });

describe("GET /api/internal/strategies/[id]/overview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INTERNAL_API_KEY = TEST_API_KEY;
    mockCheckRateLimit.mockResolvedValue({
      success: true,
      limit: 60,
      remaining: 59,
      resetAt: new Date(),
    });
    mockLiveEAInstanceFindFirst.mockResolvedValue(instanceRow);
    mockMonitoringRunFindMany.mockResolvedValue([monitoringRunRow]);
    mockIncidentFindMany.mockResolvedValue([incidentRow]);
    mockOverrideRequestFindMany.mockResolvedValue([overrideRow]);
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

  it("returns correct shape with all sections populated", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY), { params: paramsPromise });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.strategyId).toBe("strat_1");

    // Instance context
    expect(json.instance).toEqual({
      instanceId: "inst_1",
      lifecycleState: "EDGE_AT_RISK",
      operatorHold: "NONE",
      monitoringSuppressedUntil: null,
    });

    // Monitoring runs — field mapping
    expect(json.latestMonitoringRuns).toHaveLength(1);
    expect(json.latestMonitoringRuns[0]).toEqual(
      expect.objectContaining({
        id: "mr_1",
        status: "COMPLETED",
        verdict: "AT_RISK",
        reasonCodes: ["MONITORING_DRAWDOWN_BREACH"],
        snapshotHash: "snap_hash_1",
        configVersion: "2.3.2",
        thresholdsHash: "thresh_hash_1",
      })
    );

    // Incidents — field mapping
    expect(json.incidents).toHaveLength(1);
    expect(json.incidents[0]).toEqual(
      expect.objectContaining({
        id: "inc_1",
        status: "OPEN",
        escalationCount: 0,
        recordId: "rec_1",
      })
    );

    // Overrides — field mapping
    expect(json.overrides).toHaveLength(1);
    expect(json.overrides[0]).toEqual(
      expect.objectContaining({
        id: "or_1",
        status: "APPROVED",
        requestedBy: "operator_alice",
        approvedBy: "operator_bob",
        recordId: "rec_or_1",
      })
    );
  });

  it("returns instance: null when no instance found", async () => {
    mockLiveEAInstanceFindFirst.mockResolvedValue(null);
    mockMonitoringRunFindMany.mockResolvedValue([]);
    mockIncidentFindMany.mockResolvedValue([]);
    mockOverrideRequestFindMany.mockResolvedValue([]);

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY), { params: paramsPromise });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.strategyId).toBe("strat_1");
    expect(json.instance).toBeNull();
    expect(json.latestMonitoringRuns).toEqual([]);
    expect(json.incidents).toEqual([]);
    expect(json.overrides).toEqual([]);
  });

  it("queries monitoring runs ordered by completedAt desc", async () => {
    const { GET } = await import("./route");
    await GET(makeRequest(TEST_API_KEY), { params: paramsPromise });

    expect(mockMonitoringRunFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { strategyId: "strat_1" },
        orderBy: { completedAt: "desc" },
        take: 20,
      })
    );
  });

  it("queries incidents ordered by openedAt desc", async () => {
    const { GET } = await import("./route");
    await GET(makeRequest(TEST_API_KEY), { params: paramsPromise });

    expect(mockIncidentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { strategyId: "strat_1" },
        orderBy: { openedAt: "desc" },
        take: 20,
      })
    );
  });

  it("queries overrides ordered by requestedAt desc", async () => {
    const { GET } = await import("./route");
    await GET(makeRequest(TEST_API_KEY), { params: paramsPromise });

    expect(mockOverrideRequestFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { strategyId: "strat_1" },
        orderBy: { requestedAt: "desc" },
        take: 20,
      })
    );
  });

  it("returns 500 on DB error", async () => {
    mockLiveEAInstanceFindFirst.mockRejectedValue(new Error("DB crash"));

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY), { params: paramsPromise });

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.code).toBe("INTERNAL_ERROR");
  });
});
