import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockFindUnique = vi.fn();
const mockTrackRecordStateFind = vi.fn();
const mockTrackRecordEventCount = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    strategyIdentity: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
    trackRecordState: {
      findUnique: (...args: unknown[]) => mockTrackRecordStateFind(...args),
    },
    trackRecordEvent: {
      count: (...args: unknown[]) => mockTrackRecordEventCount(...args),
    },
  },
}));

const mockCheckRateLimit = vi.fn();

vi.mock("@/lib/rate-limit", () => ({
  publicApiRateLimiter: {},
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getClientIp: () => "127.0.0.1",
  createRateLimitHeaders: vi.fn().mockReturnValue({}),
  formatRateLimitError: vi.fn().mockReturnValue("Rate limit exceeded."),
}));

function makeRequest(strategyId = "AS-10F10DCA") {
  return new NextRequest(`http://localhost/api/proof/${strategyId}/verification`, {
    method: "GET",
  });
}

function makeParams(strategyId = "AS-10F10DCA") {
  return { params: Promise.resolve({ strategyId }) };
}

function makeIdentity(overrides: Record<string, unknown> = {}) {
  return {
    strategyId: "AS-10F10DCA",
    publicPage: {
      isPublic: true,
      pinnedInstanceId: "inst_1",
      ladderLevel: "VALIDATED",
    },
    versions: [
      {
        binding: {
          snapshotHash: "abc123def456",
          baselineHash: "def456abc789",
        },
      },
    ],
    project: {
      backtestUploads: [
        {
          runs: [{ totalTrades: 450 }],
        },
      ],
    },
    ...overrides,
  };
}

describe("GET /api/proof/[strategyId]/verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({
      success: true,
      limit: 30,
      remaining: 29,
      resetAt: new Date(),
    });
  });

  it("returns 404 when strategy not found", async () => {
    mockFindUnique.mockResolvedValue(null);

    const { GET } = await import("./route");
    const res = await GET(makeRequest(), makeParams());

    expect(res.status).toBe(404);
    // 404 must also have Cache-Control to prevent CDN caching
    expect(res.headers.get("cache-control")).toBe("private, no-store, max-age=0");
  });

  it("returns 404 when isPublic is false", async () => {
    mockFindUnique.mockResolvedValue(
      makeIdentity({
        publicPage: { isPublic: false, pinnedInstanceId: null, ladderLevel: "SUBMITTED" },
      })
    );

    const { GET } = await import("./route");
    const res = await GET(makeRequest(), makeParams());

    expect(res.status).toBe(404);
    // Must have Cache-Control on 404 too
    expect(res.headers.get("cache-control")).toBe("private, no-store, max-age=0");
  });

  // A2b — 404 for non-public uses same error shape as unknown (no enumeration leak)
  it("returns identical error shape for non-public and unknown strategies", async () => {
    // Unknown
    mockFindUnique.mockResolvedValue(null);
    const { GET } = await import("./route");
    const unknownRes = await GET(makeRequest("AS-UNKNOWN1"), makeParams("AS-UNKNOWN1"));
    const unknownJson = await unknownRes.json();

    // Non-public
    vi.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({
      success: true,
      limit: 30,
      remaining: 29,
      resetAt: new Date(),
    });
    mockFindUnique.mockResolvedValue(
      makeIdentity({
        publicPage: { isPublic: false, pinnedInstanceId: null, ladderLevel: "SUBMITTED" },
      })
    );
    const privateRes = await GET(makeRequest("AS-PRIVATE1"), makeParams("AS-PRIVATE1"));
    const privateJson = await privateRes.json();

    // Same status + same error message (no way to distinguish)
    expect(unknownRes.status).toBe(privateRes.status);
    expect(unknownJson.error).toBe(privateJson.error);
  });

  it("returns valid verification payload for public strategy", async () => {
    mockFindUnique.mockResolvedValue(makeIdentity());
    mockTrackRecordStateFind.mockResolvedValue({
      lastEventHash: "chainhead123",
      totalTrades: 120,
    });
    mockTrackRecordEventCount.mockResolvedValue(1234);

    const { GET } = await import("./route");
    const res = await GET(makeRequest(), makeParams());

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.strategyId).toBe("AS-10F10DCA");
    expect(json.snapshotHash).toBe("abc123def456");
    expect(json.baselineMetricsHash).toBe("def456abc789");
    expect(json.tradeChainHead).toBe("chainhead123");
    expect(json.tradeChainLength).toBe(1234);
    expect(json.backtestTradeCount).toBe(450);
    expect(json.liveTradeCount).toBe(120);
    expect(json.ladderLevel).toBe("VALIDATED");
    expect(json.generatedAt).toBeDefined();
  });

  it("has Cache-Control: no-store header", async () => {
    mockFindUnique.mockResolvedValue(makeIdentity());
    mockTrackRecordStateFind.mockResolvedValue(null);
    mockTrackRecordEventCount.mockResolvedValue(0);

    const { GET } = await import("./route");
    const res = await GET(makeRequest(), makeParams());

    expect(res.headers.get("cache-control")).toBe("private, no-store, max-age=0");
  });

  it("returns null fields when no binding/chain exists", async () => {
    mockFindUnique.mockResolvedValue(
      makeIdentity({
        publicPage: { isPublic: true, pinnedInstanceId: null, ladderLevel: "SUBMITTED" },
        versions: [{ binding: null }],
        project: { backtestUploads: [] },
      })
    );

    const { GET } = await import("./route");
    const res = await GET(makeRequest(), makeParams());

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.snapshotHash).toBeNull();
    expect(json.baselineMetricsHash).toBeNull();
    expect(json.tradeChainHead).toBeNull();
    expect(json.tradeChainLength).toBeNull();
    expect(json.backtestTradeCount).toBeNull();
    expect(json.liveTradeCount).toBeNull();
  });

  // A4c — exports force-dynamic and revalidate=0
  it("exports force-dynamic and revalidate=0", async () => {
    const mod = await import("./route");
    expect(mod.dynamic).toBe("force-dynamic");
    expect(mod.revalidate).toBe(0);
  });

  // A6 — response does NOT contain internal IDs
  it("does not leak internal IDs in 200 response", async () => {
    mockFindUnique.mockResolvedValue(makeIdentity());
    mockTrackRecordStateFind.mockResolvedValue({ lastEventHash: "hash1", totalTrades: 10 });
    mockTrackRecordEventCount.mockResolvedValue(50);

    const { GET } = await import("./route");
    const res = await GET(makeRequest(), makeParams());

    const json = await res.json();
    const raw = JSON.stringify(json);
    // Must not contain internal field names
    expect(raw).not.toMatch(/"id"\s*:/);
    expect(raw).not.toContain("userId");
    expect(raw).not.toContain("projectId");
    expect(raw).not.toContain("pinnedInstanceId");
    expect(raw).not.toContain("inst_1");
    // Allowed fields only
    const keys = Object.keys(json);
    expect(keys.sort()).toEqual([
      "backtestTradeCount",
      "baselineMetricsHash",
      "generatedAt",
      "ladderLevel",
      "liveTradeCount",
      "snapshotHash",
      "strategyId",
      "tradeChainHead",
      "tradeChainLength",
    ]);
  });

  // Rate-limit returns 429
  it("returns 429 when rate-limited", async () => {
    mockCheckRateLimit.mockResolvedValue({
      success: false,
      limit: 30,
      remaining: 0,
      resetAt: new Date(),
    });

    const { GET } = await import("./route");
    const res = await GET(makeRequest(), makeParams());

    expect(res.status).toBe(429);
  });

  // Case-insensitivity
  it("normalizes strategyId to uppercase", async () => {
    mockFindUnique.mockResolvedValue(makeIdentity());
    mockTrackRecordStateFind.mockResolvedValue({ lastEventHash: "h", totalTrades: 1 });
    mockTrackRecordEventCount.mockResolvedValue(1);

    const { GET } = await import("./route");
    const res = await GET(makeRequest("as-10f10dca"), makeParams("as-10f10dca"));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.strategyId).toBe("AS-10F10DCA");
  });
});
