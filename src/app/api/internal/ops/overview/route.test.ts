import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const TEST_API_KEY = "test-internal-api-key-that-is-at-least-32-chars";

const mockIncidentCount = vi.fn();
const mockIncidentFindMany = vi.fn();
const mockOverrideRequestFindMany = vi.fn();
const mockLiveEAInstanceFindMany = vi.fn();
const mockAlertOutboxCount = vi.fn();
const mockAlertOutboxFindFirst = vi.fn();

vi.mock("@/lib/csrf", () => ({
  timingSafeEqual: (a: string, b: string) => a === b,
}));

const mockCheckRateLimit = vi.fn();

vi.mock("@/lib/rate-limit", () => ({
  internalOpsOverviewRateLimiter: {},
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getClientIp: () => "127.0.0.1",
  createRateLimitHeaders: vi.fn().mockReturnValue({}),
  formatRateLimitError: vi.fn().mockReturnValue("Rate limit exceeded."),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    incident: {
      count: (...args: unknown[]) => mockIncidentCount(...args),
      findMany: (...args: unknown[]) => mockIncidentFindMany(...args),
    },
    overrideRequest: {
      findMany: (...args: unknown[]) => mockOverrideRequestFindMany(...args),
    },
    liveEAInstance: {
      findMany: (...args: unknown[]) => mockLiveEAInstanceFindMany(...args),
    },
    alertOutbox: {
      count: (...args: unknown[]) => mockAlertOutboxCount(...args),
      findFirst: (...args: unknown[]) => mockAlertOutboxFindFirst(...args),
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  },
}));

function makeRequest(apiKey?: string) {
  const headers: Record<string, string> = {};
  if (apiKey) {
    headers["x-internal-api-key"] = apiKey;
  }
  return new NextRequest("http://localhost/api/internal/ops/overview", {
    method: "GET",
    headers,
  });
}

const incidentRow = {
  id: "inc_1",
  strategyId: "strat_1",
  status: "OPEN",
  severity: "AT_RISK",
  openedAt: new Date("2026-03-01T10:00:00Z"),
  ackDeadlineAt: new Date("2026-03-01T11:00:00Z"),
  escalationCount: 0,
  triggerRecordId: "rec_1",
  reasonCodes: ["MONITORING_DRAWDOWN_BREACH"],
};

const escalatedRow = {
  ...incidentRow,
  id: "inc_2",
  status: "ESCALATED",
  ackDeadlineAt: new Date("2026-03-01T12:00:00Z"),
  escalationCount: 2,
};

const overrideRow = {
  id: "or_1",
  strategyId: "strat_1",
  status: "APPROVED",
  requestedBy: "operator_alice",
  requestedAt: new Date("2026-03-01T09:00:00Z"),
  approvedBy: "operator_bob",
  expiresAt: new Date("2026-03-01T10:00:00Z"),
  requestRecordId: "rec_or_1",
};

const holdRow = {
  id: "inst_1",
  operatorHold: "HALTED",
  updatedAt: new Date("2026-03-01T08:00:00Z"),
  monitoringSuppressedUntil: null,
  strategyVersion: {
    strategyIdentity: { strategyId: "strat_1" },
  },
};

describe("GET /api/internal/ops/overview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INTERNAL_API_KEY = TEST_API_KEY;
    mockCheckRateLimit.mockResolvedValue({
      success: true,
      limit: 30,
      remaining: 29,
      resetAt: new Date(),
    });

    // Default mocks: empty state
    mockIncidentCount.mockResolvedValue(0);
    mockIncidentFindMany.mockResolvedValue([]);
    mockOverrideRequestFindMany.mockResolvedValue([]);
    mockLiveEAInstanceFindMany.mockResolvedValue([]);
    mockAlertOutboxCount.mockResolvedValue(0);
    mockAlertOutboxFindFirst.mockResolvedValue(null);
  });

  it("rejects requests without API key (401)", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("rejects requests with wrong API key (401)", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeRequest("wrong-key"));
    expect(res.status).toBe(401);
  });

  it("rejects when rate limited (429)", async () => {
    mockCheckRateLimit.mockResolvedValue({
      success: false,
      limit: 30,
      remaining: 0,
      resetAt: new Date(),
    });

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY));
    expect(res.status).toBe(429);
  });

  it("returns correct response shape with empty state", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({
      incidents: {
        counts: { open: 0, acknowledged: 0, escalated: 0, overdueAck: 0 },
        rows: [],
      },
      overrides: { rows: [] },
      holds: { rows: [] },
      outbox: {
        counts: { pending: 0, failed: 0, sending: 0 },
        nextAttemptAt: null,
      },
    });
  });

  it("returns populated data with correct field whitelisting", async () => {
    // Incident counts: open=1, acknowledged=0, escalated=1, overdueAck=1
    mockIncidentCount
      .mockResolvedValueOnce(1) // open
      .mockResolvedValueOnce(0) // acknowledged
      .mockResolvedValueOnce(1) // escalated
      .mockResolvedValueOnce(1); // overdueAck

    mockIncidentFindMany.mockResolvedValue([incidentRow, escalatedRow]);
    mockOverrideRequestFindMany.mockResolvedValue([overrideRow]);
    mockLiveEAInstanceFindMany.mockResolvedValue([holdRow]);
    mockAlertOutboxCount
      .mockResolvedValueOnce(3) // pending
      .mockResolvedValueOnce(1) // failed
      .mockResolvedValueOnce(0); // sending
    mockAlertOutboxFindFirst.mockResolvedValue({
      nextAttemptAt: new Date("2026-03-01T10:05:00Z"),
    });

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(200);

    // Incidents
    expect(json.incidents.counts).toEqual({
      open: 1,
      acknowledged: 0,
      escalated: 1,
      overdueAck: 1,
    });
    expect(json.incidents.rows).toHaveLength(2);
    expect(json.incidents.rows[0]).toEqual(
      expect.objectContaining({
        id: "inc_1",
        strategyId: "strat_1",
        status: "OPEN",
        severity: "AT_RISK",
        escalationCount: 0,
        triggerRecordId: "rec_1",
        reasonCodes: ["MONITORING_DRAWDOWN_BREACH"],
      })
    );

    // Overrides — requestRecordId mapped to recordId
    expect(json.overrides.rows).toHaveLength(1);
    expect(json.overrides.rows[0]).toEqual(
      expect.objectContaining({
        id: "or_1",
        strategyId: "strat_1",
        status: "APPROVED",
        requestedBy: "operator_alice",
        approvedBy: "operator_bob",
        recordId: "rec_or_1",
      })
    );

    // Holds — nested strategyVersion flattened
    expect(json.holds.rows).toHaveLength(1);
    expect(json.holds.rows[0]).toEqual(
      expect.objectContaining({
        instanceId: "inst_1",
        strategyId: "strat_1",
        operatorHold: "HALTED",
        monitoringSuppressedUntil: null,
      })
    );

    // Outbox
    expect(json.outbox.counts).toEqual({ pending: 3, failed: 1, sending: 0 });
    expect(json.outbox.nextAttemptAt).toBeTruthy();
  });

  it("incidents ordered by ackDeadlineAt asc (most urgent first)", async () => {
    mockIncidentFindMany.mockResolvedValue([incidentRow, escalatedRow]);

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY));
    const json = await res.json();

    // Verify the query was called with correct ordering
    expect(mockIncidentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { ackDeadlineAt: "asc" },
        take: 20,
      })
    );

    // First row has earlier deadline
    const rows = json.incidents.rows;
    expect(rows).toHaveLength(2);
    expect(new Date(rows[0].ackDeadlineAt).getTime()).toBeLessThan(
      new Date(rows[1].ackDeadlineAt).getTime()
    );
  });

  it("overrides ordered by expiresAt asc (most urgent first)", async () => {
    const earlyExpiry = {
      ...overrideRow,
      id: "or_early",
      expiresAt: new Date("2026-03-01T09:30:00Z"),
    };
    const lateExpiry = {
      ...overrideRow,
      id: "or_late",
      expiresAt: new Date("2026-03-01T11:00:00Z"),
    };
    mockOverrideRequestFindMany.mockResolvedValue([earlyExpiry, lateExpiry]);

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY));
    const json = await res.json();

    expect(mockOverrideRequestFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { expiresAt: "asc" },
        take: 20,
      })
    );

    const rows = json.overrides.rows;
    expect(rows).toHaveLength(2);
    expect(new Date(rows[0].expiresAt).getTime()).toBeLessThan(
      new Date(rows[1].expiresAt).getTime()
    );
  });

  it("returns 500 on unexpected DB error", async () => {
    mockIncidentCount.mockRejectedValue(new Error("DB crash"));

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY));

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.code).toBe("INTERNAL_ERROR");
  });
});
