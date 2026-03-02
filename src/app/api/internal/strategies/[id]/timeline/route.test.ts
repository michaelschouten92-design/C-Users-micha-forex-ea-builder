import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const TEST_API_KEY = "test-internal-api-key-that-is-at-least-32-chars";

const mockMonitoringRunFindMany = vi.fn();
const mockIncidentFindMany = vi.fn();
const mockOverrideRequestFindMany = vi.fn();
const mockProofEventLogFindMany = vi.fn();

vi.mock("@/lib/csrf", () => ({
  timingSafeEqual: (a: string, b: string) => a === b,
}));

const mockCheckRateLimit = vi.fn();

vi.mock("@/lib/rate-limit", () => ({
  internalStrategyTimelineRateLimiter: {},
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
    proofEventLog: {
      findMany: (...args: unknown[]) => mockProofEventLogFindMany(...args),
    },
  },
}));

function makeRequest(apiKey?: string, limit?: number) {
  const headers: Record<string, string> = {};
  if (apiKey) headers["x-internal-api-key"] = apiKey;
  const url = limit
    ? `http://localhost/api/internal/strategies/strat_1/timeline?limit=${limit}`
    : "http://localhost/api/internal/strategies/strat_1/timeline";
  return new NextRequest(url, { method: "GET", headers });
}

const paramsPromise = Promise.resolve({ id: "strat_1" });

describe("GET /api/internal/strategies/[id]/timeline", () => {
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
    mockProofEventLogFindMany.mockResolvedValue([]);
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

  it("returns empty timeline array when no data exists", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY), { params: paramsPromise });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.timeline).toEqual([]);
  });

  it("maps monitoring runs to MONITORING_RUN items", async () => {
    mockMonitoringRunFindMany.mockResolvedValue([
      {
        id: "mr_1",
        completedAt: new Date("2026-03-01T12:00:00Z"),
        requestedAt: new Date("2026-03-01T11:55:00Z"),
        status: "COMPLETED",
        verdict: "AT_RISK",
        reasons: ["MONITORING_DRAWDOWN_BREACH"],
        tradeSnapshotHash: "snap_1",
        configVersion: "2.3.2",
        thresholdsHash: "th_1",
        recordId: "rec_mr_1",
      },
    ]);

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY), { params: paramsPromise });
    const json = await res.json();

    expect(json.timeline).toHaveLength(1);
    const item = json.timeline[0];
    expect(item.type).toBe("MONITORING_RUN");
    expect(item.title).toBe("Monitoring: AT_RISK");
    expect(item.severity).toBe("WARN");
    expect(item.ref.runId).toBe("mr_1");
    expect(item.ref.recordId).toBe("rec_mr_1");
    expect(item.details.reasonCodes).toEqual(["MONITORING_DRAWDOWN_BREACH"]);
    expect(item.details.snapshotHash).toBe("snap_1");
  });

  it("maps incidents to opened + closed items", async () => {
    mockIncidentFindMany.mockResolvedValue([
      {
        id: "inc_1",
        status: "CLOSED",
        severity: "AT_RISK",
        openedAt: new Date("2026-03-01T10:00:00Z"),
        closedAt: new Date("2026-03-01T14:00:00Z"),
        closeReason: "RECOVERED",
        ackDeadlineAt: new Date("2026-03-01T11:00:00Z"),
        escalationCount: 1,
        triggerRecordId: "rec_inc_1",
      },
    ]);

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY), { params: paramsPromise });
    const json = await res.json();

    // One incident produces two timeline items (opened + closed)
    expect(json.timeline).toHaveLength(2);

    const closed = json.timeline[0]; // newer first
    expect(closed.title).toBe("Incident closed (RECOVERED)");
    expect(closed.severity).toBe("INFO");
    expect(closed.ref.incidentId).toBe("inc_1");

    const opened = json.timeline[1];
    expect(opened.title).toBe("Incident opened (AT_RISK)");
    expect(opened.severity).toBe("WARN");
    expect(opened.ref.recordId).toBe("rec_inc_1");
  });

  it("maps override transitions to multiple items", async () => {
    mockOverrideRequestFindMany.mockResolvedValue([
      {
        id: "or_1",
        status: "APPLIED",
        requestedAt: new Date("2026-03-01T09:00:00Z"),
        requestedBy: "operator_alice",
        approvedAt: new Date("2026-03-01T09:30:00Z"),
        approvedBy: "operator_bob",
        appliedAt: new Date("2026-03-01T10:00:00Z"),
        rejectedAt: null,
        expiredAt: null,
        requestRecordId: "rec_or_1",
      },
    ]);

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY), { params: paramsPromise });
    const json = await res.json();

    // requested + approved + applied = 3 items
    expect(json.timeline).toHaveLength(3);
    expect(json.timeline[0].title).toBe("Override applied");
    expect(json.timeline[0].severity).toBe("WARN");
    expect(json.timeline[1].title).toBe("Override approved");
    expect(json.timeline[2].title).toBe("Override requested");
    expect(json.timeline[2].details.requestedBy).toBe("operator_alice");
  });

  it("maps proof events to HOLD / LIFECYCLE items with whitelisted meta", async () => {
    mockProofEventLogFindMany.mockResolvedValue([
      {
        type: "OPERATOR_HALT_APPLIED",
        createdAt: new Date("2026-03-01T11:00:00Z"),
        sessionId: "rec_halt_1",
        meta: {
          previousHold: "NONE",
          newHold: "HALTED",
          actor: "operator_bob",
          secretField: "leak",
        },
      },
      {
        type: "STRATEGY_RECOVERED",
        createdAt: new Date("2026-03-01T13:00:00Z"),
        sessionId: "rec_lifecycle_1",
        meta: {
          from: "EDGE_AT_RISK",
          to: "LIVE_MONITORING",
          consecutiveHealthyRuns: 3,
          secretField: "leak",
        },
      },
    ]);

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY), { params: paramsPromise });
    const json = await res.json();

    expect(json.timeline).toHaveLength(2);

    // Lifecycle is newer → first
    const lifecycle = json.timeline[0];
    expect(lifecycle.type).toBe("LIFECYCLE");
    expect(lifecycle.title).toBe("Strategy recovered");
    expect(lifecycle.severity).toBe("INFO");
    expect(lifecycle.details.from).toBe("EDGE_AT_RISK");
    expect(lifecycle.details.to).toBe("LIVE_MONITORING");
    expect(lifecycle.details.consecutiveHealthyRuns).toBe(3);
    // secretField must NOT leak
    expect(lifecycle.details.secretField).toBeUndefined();

    const hold = json.timeline[1];
    expect(hold.type).toBe("HOLD");
    expect(hold.title).toBe("Operator halt applied");
    expect(hold.severity).toBe("CRITICAL");
    expect(hold.details.previousHold).toBe("NONE");
    expect(hold.details.newHold).toBe("HALTED");
    expect(hold.details.actor).toBe("operator_bob");
    expect(hold.details.secretField).toBeUndefined();
  });

  it("interleaves items from different sources in descending order", async () => {
    mockMonitoringRunFindMany.mockResolvedValue([
      {
        id: "mr_1",
        completedAt: new Date("2026-03-01T12:00:00Z"),
        requestedAt: new Date("2026-03-01T11:55:00Z"),
        status: "COMPLETED",
        verdict: "AT_RISK",
        reasons: ["MONITORING_DRAWDOWN_BREACH"],
        tradeSnapshotHash: null,
        configVersion: "2.3.2",
        thresholdsHash: null,
        recordId: "rec_mr_1",
      },
    ]);
    mockIncidentFindMany.mockResolvedValue([
      {
        id: "inc_1",
        status: "OPEN",
        severity: "AT_RISK",
        openedAt: new Date("2026-03-01T12:05:00Z"),
        closedAt: null,
        closeReason: null,
        ackDeadlineAt: new Date("2026-03-01T13:05:00Z"),
        escalationCount: 0,
        triggerRecordId: "rec_inc_1",
      },
    ]);
    mockOverrideRequestFindMany.mockResolvedValue([
      {
        id: "or_1",
        status: "PENDING",
        requestedAt: new Date("2026-03-01T11:30:00Z"),
        requestedBy: "operator_alice",
        approvedAt: null,
        approvedBy: null,
        appliedAt: null,
        rejectedAt: null,
        expiredAt: null,
        requestRecordId: "rec_or_1",
      },
    ]);

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY), { params: paramsPromise });
    const json = await res.json();

    expect(json.timeline).toHaveLength(3);
    // Descending: incident 12:05 → monitoring 12:00 → override 11:30
    expect(json.timeline[0].type).toBe("INCIDENT");
    expect(json.timeline[1].type).toBe("MONITORING_RUN");
    expect(json.timeline[2].type).toBe("OVERRIDE");
  });

  it("respects limit query parameter", async () => {
    const { GET } = await import("./route");
    await GET(makeRequest(TEST_API_KEY, 10), { params: paramsPromise });

    expect(mockMonitoringRunFindMany).toHaveBeenCalledWith(expect.objectContaining({ take: 10 }));
    expect(mockIncidentFindMany).toHaveBeenCalledWith(expect.objectContaining({ take: 10 }));
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
