import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const TEST_API_KEY = "test-internal-api-key-that-is-at-least-32-chars";

const mockIncidentFindUnique = vi.fn();
const mockLiveEAInstanceFindFirst = vi.fn();

vi.mock("@/lib/csrf", () => ({
  timingSafeEqual: (a: string, b: string) => a === b,
}));

const mockCheckRateLimit = vi.fn();

vi.mock("@/lib/rate-limit", () => ({
  internalIncidentDrilldownRateLimiter: {},
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getClientIp: () => "127.0.0.1",
  createRateLimitHeaders: vi.fn().mockReturnValue({}),
  formatRateLimitError: vi.fn().mockReturnValue("Rate limit exceeded."),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    incident: {
      findUnique: (...args: unknown[]) => mockIncidentFindUnique(...args),
    },
    liveEAInstance: {
      findFirst: (...args: unknown[]) => mockLiveEAInstanceFindFirst(...args),
    },
  },
}));

function makeRequest(apiKey?: string) {
  const headers: Record<string, string> = {};
  if (apiKey) headers["x-internal-api-key"] = apiKey;
  return new NextRequest("http://localhost/api/internal/incidents/inc_1", {
    method: "GET",
    headers,
  });
}

const incidentRow = {
  id: "inc_1",
  strategyId: "strat_1",
  status: "OPEN",
  severity: "AT_RISK",
  triggerRecordId: "rec_1",
  reasonCodes: ["MONITORING_DRAWDOWN_BREACH"],
  snapshotHash: "abc123",
  configVersion: "2.3.2",
  thresholdsHash: "hash_1",
  ackDeadlineAt: new Date("2026-03-01T11:00:00Z"),
  invalidateDeadlineAt: null,
  lastEscalatedAt: null,
  escalationCount: 0,
  closedAt: null,
  closeReason: null,
  closedBy: null,
  openedAt: new Date("2026-03-01T10:00:00Z"),
  updatedAt: new Date("2026-03-01T10:00:00Z"),
};

const instanceRow = {
  id: "inst_1",
  lifecycleState: "EDGE_AT_RISK",
  operatorHold: "NONE",
  monitoringSuppressedUntil: null,
};

const paramsPromise = Promise.resolve({ id: "inc_1" });

describe("GET /api/internal/incidents/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INTERNAL_API_KEY = TEST_API_KEY;
    mockCheckRateLimit.mockResolvedValue({
      success: true,
      limit: 30,
      remaining: 29,
      resetAt: new Date(),
    });
    mockIncidentFindUnique.mockResolvedValue(incidentRow);
    mockLiveEAInstanceFindFirst.mockResolvedValue(instanceRow);
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

  it("returns 404 when incident not found", async () => {
    mockIncidentFindUnique.mockResolvedValue(null);

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY), { params: paramsPromise });
    expect(res.status).toBe(404);

    const json = await res.json();
    expect(json.code).toBe("NOT_FOUND");
  });

  it("returns correct shape with incident + context", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY), { params: paramsPromise });
    const json = await res.json();

    expect(res.status).toBe(200);

    // Incident fields are whitelisted
    expect(json.incident).toEqual(
      expect.objectContaining({
        id: "inc_1",
        strategyId: "strat_1",
        status: "OPEN",
        severity: "AT_RISK",
        triggerRecordId: "rec_1",
        reasonCodes: ["MONITORING_DRAWDOWN_BREACH"],
        escalationCount: 0,
        configVersion: "2.3.2",
      })
    );

    // Context includes lifecycle info
    expect(json.context).toEqual({
      instanceId: "inst_1",
      lifecycleState: "EDGE_AT_RISK",
      operatorHold: "NONE",
      monitoringSuppressedUntil: null,
    });
  });

  it("returns context: null when no instance found", async () => {
    mockLiveEAInstanceFindFirst.mockResolvedValue(null);

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY), { params: paramsPromise });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.incident.id).toBe("inc_1");
    expect(json.context).toBeNull();
  });

  it("returns 500 on DB error", async () => {
    mockIncidentFindUnique.mockRejectedValue(new Error("DB crash"));

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY), { params: paramsPromise });

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.code).toBe("INTERNAL_ERROR");
  });
});
