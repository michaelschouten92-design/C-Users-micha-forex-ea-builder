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
  internalHeartbeatRateLimiter: {},
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getClientIp: () => "127.0.0.1",
  createRateLimitHeaders: vi.fn().mockReturnValue({}),
  formatRateLimitError: vi.fn().mockReturnValue("Rate limit exceeded."),
}));

const mockFindFirst = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    proofEventLog: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
    },
  },
}));

function makeRequest(apiKey?: string, strategyId?: string) {
  const url = new URL("http://localhost/api/internal/heartbeat/latest");
  if (strategyId) url.searchParams.set("strategyId", strategyId);

  const headers: Record<string, string> = {};
  if (apiKey) headers["x-internal-api-key"] = apiKey;

  return new NextRequest(url, { method: "GET", headers });
}

describe("GET /api/internal/heartbeat/latest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INTERNAL_API_KEY = TEST_API_KEY;
    mockCheckRateLimit.mockResolvedValue({
      success: true,
      limit: 60,
      remaining: 59,
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

  it("auth failure does not leak internal data", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeRequest("wrong-key", "strat_1"));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.action).toBeUndefined();
    expect(json.reasonCode).toBeUndefined();
    expect(json.serverTime).toBeUndefined();
    expect(json.decidedAt).toBeUndefined();
  });

  // ── Rate limit ──────────────────────────────────────────

  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockResolvedValue({
      success: false,
      limit: 60,
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

  it("returns latest decision from proof event", async () => {
    mockFindFirst.mockResolvedValue({
      meta: { action: "RUN", reasonCode: "OK" },
      createdAt: new Date("2026-03-03T12:00:00Z"),
    });

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY, "strat_1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.strategyId).toBe("strat_1");
    expect(json.action).toBe("RUN");
    expect(json.reasonCode).toBe("OK");
    expect(json.serverTime).toBeDefined();
    expect(json.decidedAt).toBe("2026-03-03T12:00:00.000Z");
  });

  it("returns PAUSE decision from proof event", async () => {
    mockFindFirst.mockResolvedValue({
      meta: { action: "PAUSE", reasonCode: "NO_INSTANCE" },
      createdAt: new Date("2026-03-03T11:00:00Z"),
    });

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY, "strat_1"));
    const json = await res.json();

    expect(json.action).toBe("PAUSE");
    expect(json.reasonCode).toBe("NO_INSTANCE");
  });

  it("returns STOP decision from proof event", async () => {
    mockFindFirst.mockResolvedValue({
      meta: { action: "STOP", reasonCode: "STRATEGY_HALTED" },
      createdAt: new Date("2026-03-03T11:00:00Z"),
    });

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY, "strat_1"));
    const json = await res.json();

    expect(json.action).toBe("STOP");
    expect(json.reasonCode).toBe("STRATEGY_HALTED");
  });

  // ── No proof event fallback ─────────────────────────────

  it("returns PAUSE + NO_HEARTBEAT_PROOF when no events exist", async () => {
    mockFindFirst.mockResolvedValue(null);

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY, "strat_1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.strategyId).toBe("strat_1");
    expect(json.action).toBe("PAUSE");
    expect(json.reasonCode).toBe("NO_HEARTBEAT_PROOF");
    expect(json.decidedAt).toBeNull();
  });

  // ── Fail-closed on DB error ─────────────────────────────

  it("returns 200 + PAUSE + COMPUTATION_FAILED on DB error", async () => {
    mockFindFirst.mockRejectedValue(new Error("DB crash"));

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY, "strat_1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.action).toBe("PAUSE");
    expect(json.reasonCode).toBe("COMPUTATION_FAILED");
    expect(json.decidedAt).toBeNull();
  });

  // ── Response shape (golden contract) ────────────────────

  it("response has exactly 5 keys: strategyId, action, reasonCode, serverTime, decidedAt", async () => {
    mockFindFirst.mockResolvedValue({
      meta: { action: "RUN", reasonCode: "OK" },
      createdAt: new Date("2026-03-03T12:00:00Z"),
    });

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY, "strat_1"));
    const json = await res.json();

    expect(Object.keys(json).sort()).toEqual(
      ["action", "decidedAt", "reasonCode", "serverTime", "strategyId"].sort()
    );
  });

  it("fail-closed response also has exactly 5 keys", async () => {
    mockFindFirst.mockRejectedValue(new Error("DB crash"));

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY, "strat_1"));
    const json = await res.json();

    expect(Object.keys(json).sort()).toEqual(
      ["action", "decidedAt", "reasonCode", "serverTime", "strategyId"].sort()
    );
  });

  it("no-proof response also has exactly 5 keys", async () => {
    mockFindFirst.mockResolvedValue(null);

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY, "strat_1"));
    const json = await res.json();

    expect(Object.keys(json).sort()).toEqual(
      ["action", "decidedAt", "reasonCode", "serverTime", "strategyId"].sort()
    );
  });

  // ── No secrets ──────────────────────────────────────────

  it("does not leak meta payload, sessionId, or internal IDs", async () => {
    mockFindFirst.mockResolvedValue({
      meta: {
        action: "RUN",
        reasonCode: "OK",
        eventType: "HEARTBEAT_DECISION_MADE",
        recordId: "secret-record-id",
        strategyId: "strat_1",
        timestamp: "2026-03-03T12:00:00.000Z",
      },
      createdAt: new Date("2026-03-03T12:00:00Z"),
    });

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY, "strat_1"));
    const json = await res.json();

    // Only whitelisted fields
    expect(json.eventType).toBeUndefined();
    expect(json.recordId).toBeUndefined();
    expect(json.timestamp).toBeUndefined();
    expect(json.meta).toBeUndefined();
    expect(json.sessionId).toBeUndefined();
  });

  // ── Defensive: malformed meta ───────────────────────────

  it("defaults to PAUSE on malformed meta (null meta)", async () => {
    mockFindFirst.mockResolvedValue({
      meta: null,
      createdAt: new Date("2026-03-03T12:00:00Z"),
    });

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY, "strat_1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.action).toBe("PAUSE");
    expect(json.reasonCode).toBe("COMPUTATION_FAILED");
  });

  it("defaults to PAUSE on meta with non-string action", async () => {
    mockFindFirst.mockResolvedValue({
      meta: { action: 42, reasonCode: "OK" },
      createdAt: new Date("2026-03-03T12:00:00Z"),
    });

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY, "strat_1"));
    const json = await res.json();

    expect(json.action).toBe("PAUSE");
  });

  it("serverTime is parseable UTC ISO-8601", async () => {
    mockFindFirst.mockResolvedValue({
      meta: { action: "RUN", reasonCode: "OK" },
      createdAt: new Date("2026-03-03T12:00:00Z"),
    });

    const { GET } = await import("./route");
    const res = await GET(makeRequest(TEST_API_KEY, "strat_1"));
    const json = await res.json();

    const parsed = new Date(json.serverTime);
    expect(parsed.getTime()).not.toBeNaN();
    expect(json.serverTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
  });
});
