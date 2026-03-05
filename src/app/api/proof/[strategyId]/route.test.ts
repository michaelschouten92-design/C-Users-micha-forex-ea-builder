import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── mocks ────────────────────────────────────────────────────────────
const mockIdentityFindUnique = vi.fn();
const mockUserFindUnique = vi.fn();
const mockBacktestRunFindFirst = vi.fn();
const mockThresholdFindMany = vi.fn();
const mockInstanceFindUnique = vi.fn();
const mockTrackStateFindUnique = vi.fn();
const mockHealthFindFirst = vi.fn();
const mockEventCount = vi.fn();
const mockCheckpointFindFirst = vi.fn();
const mockHeartbeatFindMany = vi.fn();
const mockEventFindMany = vi.fn();
const mockPageUpdate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    strategyIdentity: {
      findUnique: (...args: unknown[]) => mockIdentityFindUnique(...args),
    },
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
    backtestRun: {
      findFirst: (...args: unknown[]) => mockBacktestRunFindFirst(...args),
    },
    proofThreshold: {
      findMany: (...args: unknown[]) => mockThresholdFindMany(...args),
    },
    liveEAInstance: {
      findUnique: (...args: unknown[]) => mockInstanceFindUnique(...args),
    },
    trackRecordState: {
      findUnique: (...args: unknown[]) => mockTrackStateFindUnique(...args),
    },
    healthSnapshot: {
      findFirst: (...args: unknown[]) => mockHealthFindFirst(...args),
    },
    trackRecordEvent: {
      count: (...args: unknown[]) => mockEventCount(...args),
      findMany: (...args: unknown[]) => mockEventFindMany(...args),
    },
    trackRecordCheckpoint: {
      findFirst: (...args: unknown[]) => mockCheckpointFindFirst(...args),
    },
    eAHeartbeat: {
      findMany: (...args: unknown[]) => mockHeartbeatFindMany(...args),
    },
    verifiedStrategyPage: {
      update: (...args: unknown[]) => mockPageUpdate(...args),
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/track-record/metrics", () => ({
  computeMetrics: () => ({
    sharpeRatio: 0,
    sortinoRatio: 0,
    calmarRatio: 0,
    profitFactor: 0,
  }),
}));

vi.mock("@/lib/proof/ladder", () => ({
  computeLadderLevel: () => "SUBMITTED",
  mergeThresholds: () => ({
    VALIDATED_MIN_SCORE: 60,
    VALIDATED_MIN_SURVIVAL: 0.6,
    MIN_TRADES_VALIDATION: 200,
    MIN_LIVE_TRADES_VERIFIED: 50,
    MIN_LIVE_DAYS_PROVEN: 90,
    PROVEN_MAX_DRAWDOWN_PCT: 25,
    PROVEN_MIN_SCORE_STABILITY: 50,
  }),
  LADDER_META: {
    SUBMITTED: { label: "Submitted", color: "#7C8DB0", description: "Pending" },
    VALIDATED: { label: "Validated", color: "#F59E0B", description: "Validated" },
    VERIFIED: { label: "Verified", color: "#10B981", description: "Verified" },
    PROVEN: { label: "Proven", color: "#6366F1", description: "Proven" },
    INSTITUTIONAL: { label: "Institutional", color: "#8B5CF6", description: "Institutional" },
  },
}));

const mockCheckRateLimit = vi.fn();

vi.mock("@/lib/rate-limit", () => ({
  publicApiRateLimiter: {},
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getClientIp: () => "127.0.0.1",
  createRateLimitHeaders: vi.fn().mockReturnValue({}),
  formatRateLimitError: vi.fn().mockReturnValue("Rate limited"),
}));

// ── helpers ──────────────────────────────────────────────────────────
function makeRequest(strategyId = "AS-10F10DCA") {
  return new NextRequest(`http://localhost/api/proof/${strategyId}`, { method: "GET" });
}

function makeParams(strategyId = "AS-10F10DCA") {
  return { params: Promise.resolve({ strategyId }) };
}

function mockPublicIdentity() {
  mockIdentityFindUnique.mockResolvedValue({
    strategyId: "AS-10F10DCA",
    project: {
      id: "proj_1",
      name: "Demo",
      description: null,
      userId: "user_1",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    publicPage: {
      id: "page_1",
      slug: "demo",
      isPublic: true,
      pinnedInstanceId: null,
      ladderLevel: "SUBMITTED",
      showEquityCurve: true,
      showTradeLog: false,
      showHealthStatus: true,
    },
    versions: [],
  });
  mockUserFindUnique.mockResolvedValue({ handle: "demo-user" });
  mockBacktestRunFindFirst.mockResolvedValue(null);
  mockThresholdFindMany.mockResolvedValue([]);
  mockPageUpdate.mockResolvedValue({});
}

// ── tests ────────────────────────────────────────────────────────────
describe("GET /api/proof/[strategyId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({
      success: true,
      limit: 30,
      remaining: 29,
      resetAt: new Date(),
    });
  });

  // C8 — public strategy returns 200 with expected shape
  it("returns 200 with expected JSON shape for public strategy", async () => {
    mockPublicIdentity();

    const { GET } = await import("./route");
    const res = await GET(makeRequest(), makeParams());

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("strategy");
    expect(json).toHaveProperty("ladder");
    expect(json).toHaveProperty("backtestHealth");
    expect(json).toHaveProperty("monteCarlo");
    expect(json).toHaveProperty("trackRecord");
    expect(json).toHaveProperty("chain");
    expect(json).toHaveProperty("equityCurve");
    expect(json).toHaveProperty("monitoring");
    expect(json).toHaveProperty("freshness");
    expect(json.strategy.strategyId).toBe("AS-10F10DCA");
    expect(json.strategy.slug).toBeDefined();
  });

  // C9 — unknown returns 404
  it("returns 404 for unknown strategyId", async () => {
    mockIdentityFindUnique.mockResolvedValue(null);

    const { GET } = await import("./route");
    const res = await GET(makeRequest("AS-UNKNOWN1"), makeParams("AS-UNKNOWN1"));

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBeDefined();
    // Must not leak any internal info
    expect(JSON.stringify(json)).not.toMatch(/proj_|user_|page_/);
  });

  // C10 — not public returns 404, no sensitive info
  it("returns 404 when strategy exists but isPublic is false", async () => {
    mockIdentityFindUnique.mockResolvedValue({
      strategyId: "AS-PRIVATE1",
      project: { id: "proj_2", name: "Private", userId: "user_2" },
      publicPage: { isPublic: false },
      versions: [],
    });

    const { GET } = await import("./route");
    const res = await GET(makeRequest("AS-PRIVATE1"), makeParams("AS-PRIVATE1"));

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("Strategy not found");
    // Must not contain internal IDs or strategy name
    expect(JSON.stringify(json)).not.toContain("Private");
    expect(JSON.stringify(json)).not.toContain("proj_2");
  });

  // C11 — Cache-Control header present
  it("includes Cache-Control: private, no-store, max-age=0 header", async () => {
    mockPublicIdentity();

    const { GET } = await import("./route");
    const res = await GET(makeRequest(), makeParams());

    expect(res.headers.get("cache-control")).toBe("private, no-store, max-age=0");
  });

  // C12 — exports force-dynamic and revalidate=0
  it("exports force-dynamic and revalidate=0", async () => {
    const routeModule = await import("./route");
    expect(routeModule.dynamic).toBe("force-dynamic");
    expect(routeModule.revalidate).toBe(0);
  });

  // C — rate limiting returns 429
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

  // C11b — 404 response also includes Cache-Control (prevent CDN caching 404s)
  it("includes Cache-Control on 404 responses", async () => {
    mockIdentityFindUnique.mockResolvedValue(null);

    const { GET } = await import("./route");
    const res = await GET(makeRequest("AS-UNKNOWN1"), makeParams("AS-UNKNOWN1"));

    expect(res.status).toBe(404);
    expect(res.headers.get("cache-control")).toBe("private, no-store, max-age=0");
  });

  // Case-insensitivity: lowercase strategyId is uppercased before DB lookup
  it("normalizes strategyId to uppercase", async () => {
    mockPublicIdentity();

    const { GET } = await import("./route");
    const res = await GET(makeRequest("as-10f10dca"), makeParams("as-10f10dca"));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.strategy.strategyId).toBe("AS-10F10DCA");
  });

  // B7 — null states: no backtest, no instance → safe JSON (no crash)
  it("returns safe JSON when no backtest or instance data exists", async () => {
    mockPublicIdentity();

    const { GET } = await import("./route");
    const res = await GET(makeRequest(), makeParams());

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.backtestHealth).toBeNull();
    expect(json.monteCarlo).toBeNull();
    expect(json.instance).toBeNull();
    expect(json.trackRecord).toBeNull();
    expect(json.chain).toBeNull();
    expect(json.liveMetrics).toBeNull();
  });
});
