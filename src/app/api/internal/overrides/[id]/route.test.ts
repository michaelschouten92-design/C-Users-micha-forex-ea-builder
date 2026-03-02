import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const TEST_API_KEY = "test-internal-api-key-that-is-at-least-32-chars";

const mockOverrideRequestFindUnique = vi.fn();
const mockLiveEAInstanceFindFirst = vi.fn();

vi.mock("@/lib/csrf", () => ({
  timingSafeEqual: (a: string, b: string) => a === b,
}));

const mockCheckRateLimit = vi.fn();

vi.mock("@/lib/rate-limit", () => ({
  internalOverrideDrilldownRateLimiter: {},
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getClientIp: () => "127.0.0.1",
  createRateLimitHeaders: vi.fn().mockReturnValue({}),
  formatRateLimitError: vi.fn().mockReturnValue("Rate limit exceeded."),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    overrideRequest: {
      findUnique: (...args: unknown[]) => mockOverrideRequestFindUnique(...args),
    },
    liveEAInstance: {
      findFirst: (...args: unknown[]) => mockLiveEAInstanceFindFirst(...args),
    },
  },
}));

function makeRequest(apiKey?: string) {
  const headers: Record<string, string> = {};
  if (apiKey) headers["x-internal-api-key"] = apiKey;
  return new NextRequest("http://localhost/api/internal/overrides/or_1", {
    method: "GET",
    headers,
  });
}

const overrideRow = {
  id: "or_1",
  strategyId: "strat_1",
  status: "APPROVED",
  requestRecordId: "rec_or_1",
  requestNote: "Need to resume trading",
  requestedBy: "operator_alice",
  requestedAt: new Date("2026-03-01T09:00:00Z"),
  approvedBy: "operator_bob",
  approvedAt: new Date("2026-03-01T09:30:00Z"),
  approveNote: "Looks safe",
  approveRecordId: "rec_or_approve",
  rejectNote: null,
  rejectRecordId: null,
  rejectedAt: null,
  appliedAt: null,
  applyRecordId: null,
  expiredAt: null,
  expiresAt: new Date("2026-03-01T10:00:00Z"),
  configVersion: "2.3.2",
  thresholdsHash: "hash_1",
  updatedAt: new Date("2026-03-01T09:30:00Z"),
};

const instanceRow = {
  id: "inst_1",
  lifecycleState: "EDGE_AT_RISK",
  operatorHold: "OVERRIDE_PENDING",
  monitoringSuppressedUntil: null,
};

const paramsPromise = Promise.resolve({ id: "or_1" });

describe("GET /api/internal/overrides/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INTERNAL_API_KEY = TEST_API_KEY;
    mockCheckRateLimit.mockResolvedValue({
      success: true,
      limit: 30,
      remaining: 29,
      resetAt: new Date(),
    });
    mockOverrideRequestFindUnique.mockResolvedValue(overrideRow);
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

  it("returns 404 when override not found", async () => {
    mockOverrideRequestFindUnique.mockResolvedValue(null);

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY), { params: paramsPromise });
    expect(res.status).toBe(404);

    const json = await res.json();
    expect(json.code).toBe("NOT_FOUND");
  });

  it("returns correct shape with override + context", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY), { params: paramsPromise });
    const json = await res.json();

    expect(res.status).toBe(200);

    // Override fields whitelisted
    expect(json.override).toEqual(
      expect.objectContaining({
        id: "or_1",
        strategyId: "strat_1",
        status: "APPROVED",
        requestRecordId: "rec_or_1",
        requestNote: "Need to resume trading",
        requestedBy: "operator_alice",
        approvedBy: "operator_bob",
        approveNote: "Looks safe",
        configVersion: "2.3.2",
      })
    );

    // Context includes lifecycle info
    expect(json.context).toEqual({
      instanceId: "inst_1",
      lifecycleState: "EDGE_AT_RISK",
      operatorHold: "OVERRIDE_PENDING",
      monitoringSuppressedUntil: null,
    });
  });

  it("returns context: null when no instance found", async () => {
    mockLiveEAInstanceFindFirst.mockResolvedValue(null);

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY), { params: paramsPromise });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.override.id).toBe("or_1");
    expect(json.context).toBeNull();
  });

  it("returns 500 on DB error", async () => {
    mockOverrideRequestFindUnique.mockRejectedValue(new Error("DB crash"));

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY), { params: paramsPromise });

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.code).toBe("INTERNAL_ERROR");
  });
});
