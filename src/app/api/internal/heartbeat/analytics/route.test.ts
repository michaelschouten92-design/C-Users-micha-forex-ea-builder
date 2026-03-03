import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const TEST_API_KEY = "test-internal-api-key-that-is-at-least-32-chars";

vi.mock("@/lib/csrf", () => ({
  timingSafeEqual: (a: string, b: string) => a === b,
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

const mockCheckRateLimit = vi.fn();

vi.mock("@/lib/rate-limit", () => ({
  internalHeartbeatAnalyticsRateLimiter: {},
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getClientIp: () => "127.0.0.1",
  createRateLimitHeaders: vi.fn().mockReturnValue({}),
  formatRateLimitError: vi.fn().mockReturnValue("Rate limit exceeded."),
}));

const mockFindMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    proofEventLog: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
  },
}));

function makeRequest(apiKey?: string, strategyId?: string, params?: Record<string, string>) {
  const url = new URL("http://localhost/api/internal/heartbeat/analytics");
  if (strategyId) url.searchParams.set("strategyId", strategyId);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }

  const headers: Record<string, string> = {};
  if (apiKey) headers["x-internal-api-key"] = apiKey;

  return new NextRequest(url, { method: "GET", headers });
}

describe("GET /api/internal/heartbeat/analytics", () => {
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

  // ── Auth ────────────────────────────────────────────────

  it("rejects without API key (401)", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeRequest(undefined, "strat_1"));
    expect(res.status).toBe(401);
  });

  it("rejects with wrong API key (401)", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeRequest("wrong-key", "strat_1"));
    expect(res.status).toBe(401);
  });

  // ── Rate limit ──────────────────────────────────────────

  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockResolvedValue({
      success: false,
      limit: 30,
      remaining: 0,
      resetAt: new Date(),
    });

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY, "strat_1"));
    expect(res.status).toBe(429);
  });

  // ── Validation ──────────────────────────────────────────

  it("returns 400 when strategyId is missing", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY));
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.code).toBe("VALIDATION_FAILED");
  });

  it("returns 400 when strategyId is empty", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY, "  "));
    expect(res.status).toBe(400);
  });

  // ── Happy path ──────────────────────────────────────────

  it("returns analytics metrics for valid events", async () => {
    const now = new Date();
    mockFindMany.mockResolvedValue([
      {
        meta: { action: "RUN", reasonCode: "OK" },
        createdAt: new Date(now.getTime() - 30 * 60_000),
      },
      {
        meta: { action: "PAUSE", reasonCode: "NO_INSTANCE" },
        createdAt: new Date(now.getTime() - 10 * 60_000),
      },
    ]);

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY, "strat_1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.strategyId).toBe("strat_1");
    expect(json.metrics).toBeDefined();
    expect(json.metrics.totalEvents).toBe(2);
    expect(json.metrics.coveragePct).toBeGreaterThan(0);
    expect(json.metrics.windowMs).toBeGreaterThan(0);
    expect(json.serverTime).toBeDefined();
  });

  // ── No events → fail-closed ─────────────────────────────

  it("returns fail-closed metrics when no events exist", async () => {
    mockFindMany.mockResolvedValue([]);

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY, "strat_1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.metrics.cadenceBreached).toBe(true);
    expect(json.metrics.coveragePct).toBe(0);
    expect(json.metrics.runPct).toBe(0);
    expect(json.metrics.lastDecision).toBeNull();
  });

  // ── DB error → fail-closed ──────────────────────────────

  it("returns 200 + fail-closed metrics on DB error", async () => {
    mockFindMany.mockRejectedValue(new Error("DB crash"));

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY, "strat_1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.metrics.cadenceBreached).toBe(true);
    expect(json.metrics.coveragePct).toBe(0);
    expect(json.metrics.runPct).toBe(0);
    expect(json.metrics.failClosed).toBe(true);
  });

  // ── No secrets in response ──────────────────────────────

  it("does not leak internal data in response", async () => {
    mockFindMany.mockResolvedValue([
      {
        meta: {
          action: "RUN",
          reasonCode: "OK",
          eventType: "HEARTBEAT_DECISION_MADE",
          recordId: "secret-record-id",
          governanceSnapshot: { secret: true },
          sessionId: "session-123",
          eventHash: "hash-abc",
        },
        createdAt: new Date(),
      },
    ]);

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY, "strat_1"));
    const text = JSON.stringify(await res.json());

    expect(text).not.toContain("secret-record-id");
    expect(text).not.toContain("governanceSnapshot");
    expect(text).not.toContain("session-123");
    expect(text).not.toContain("hash-abc");
  });

  // ── windowHours defaults + clamping ─────────────────────

  it("defaults windowHours to 24 when not provided", async () => {
    mockFindMany.mockResolvedValue([]);

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY, "strat_1"));
    const json = await res.json();

    // 24h = 86_400_000 ms
    expect(json.metrics.windowMs).toBe(86_400_000);
  });

  it("clamps windowHours to minimum 1", async () => {
    mockFindMany.mockResolvedValue([]);

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY, "strat_1", { windowHours: "0" }));
    const json = await res.json();

    // 1h = 3_600_000 ms
    expect(json.metrics.windowMs).toBe(3_600_000);
  });

  it("clamps windowHours to maximum 720", async () => {
    mockFindMany.mockResolvedValue([]);

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY, "strat_1", { windowHours: "9999" }));
    const json = await res.json();

    // 720h = 2_592_000_000 ms
    expect(json.metrics.windowMs).toBe(2_592_000_000);
  });

  // ── cadenceSeconds defaults + clamping ──────────────────

  it("defaults cadenceSeconds to 60 when not provided", async () => {
    mockFindMany.mockResolvedValue([]);

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY, "strat_1"));
    const json = await res.json();

    expect(json.metrics.expectedCadenceMs).toBe(60_000);
  });

  it("clamps cadenceSeconds to minimum 5", async () => {
    mockFindMany.mockResolvedValue([]);

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY, "strat_1", { cadenceSeconds: "1" }));
    const json = await res.json();

    expect(json.metrics.expectedCadenceMs).toBe(5_000);
  });

  it("clamps cadenceSeconds to maximum 3600", async () => {
    mockFindMany.mockResolvedValue([]);

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY, "strat_1", { cadenceSeconds: "99999" }));
    const json = await res.json();

    expect(json.metrics.expectedCadenceMs).toBe(3_600_000);
  });

  // ── Response shape ──────────────────────────────────────

  it("response has exactly 3 top-level keys: strategyId, metrics, serverTime", async () => {
    mockFindMany.mockResolvedValue([]);

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY, "strat_1"));
    const json = await res.json();

    expect(Object.keys(json).sort()).toEqual(["metrics", "serverTime", "strategyId"]);
  });

  it("serverTime is parseable UTC ISO-8601", async () => {
    mockFindMany.mockResolvedValue([]);

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY, "strat_1"));
    const json = await res.json();

    const parsed = new Date(json.serverTime);
    expect(parsed.getTime()).not.toBeNaN();
    expect(json.serverTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
  });
});
