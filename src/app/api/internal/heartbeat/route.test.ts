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
    liveEAInstance: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
    },
  },
}));

const mockAppendProofEvent = vi.fn();

vi.mock("@/lib/proof/events", () => ({
  appendProofEvent: (...args: unknown[]) => mockAppendProofEvent(...args),
}));

function makeRequest(apiKey?: string, body?: unknown) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers["x-internal-api-key"] = apiKey;
  return new NextRequest("http://localhost/api/internal/heartbeat", {
    method: "POST",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe("POST /api/internal/heartbeat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INTERNAL_API_KEY = TEST_API_KEY;
    mockCheckRateLimit.mockResolvedValue({
      success: true,
      limit: 60,
      remaining: 59,
      resetAt: new Date(),
    });
    mockAppendProofEvent.mockResolvedValue({ sequence: 1, eventHash: "h" });
  });

  it("rejects without API key (401)", async () => {
    const { POST } = await import("./route");
    const res = await POST(
      new NextRequest("http://localhost/api/internal/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategyId: "strat_1" }),
      })
    );
    expect(res.status).toBe(401);
  });

  it("rejects with wrong API key (401)", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest("wrong-key", { strategyId: "strat_1" }));
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockResolvedValue({
      success: false,
      limit: 60,
      remaining: 0,
      resetAt: new Date(),
    });

    const { POST } = await import("./route");
    const res = await POST(makeRequest(TEST_API_KEY, { strategyId: "strat_1" }));
    expect(res.status).toBe(429);
  });

  it("returns 400 when strategyId is missing", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest(TEST_API_KEY, {}));
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.code).toBe("VALIDATION_FAILED");
  });

  it("returns RUN + OK for healthy instance", async () => {
    mockFindFirst.mockResolvedValue({
      lifecycleState: "HEALTHY",
      operatorHold: "NONE",
      monitoringSuppressedUntil: null,
    });

    const { POST } = await import("./route");
    const res = await POST(makeRequest(TEST_API_KEY, { strategyId: "strat_1" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.strategyId).toBe("strat_1");
    expect(json.action).toBe("RUN");
    expect(json.reasonCode).toBe("OK");
    expect(json.serverTime).toBeDefined();
  });

  it("returns PAUSE + NO_INSTANCE when no instance found", async () => {
    mockFindFirst.mockResolvedValue(null);

    const { POST } = await import("./route");
    const res = await POST(makeRequest(TEST_API_KEY, { strategyId: "strat_1" }));
    const json = await res.json();

    expect(json.action).toBe("PAUSE");
    expect(json.reasonCode).toBe("NO_INSTANCE");
  });

  it("returns STOP + STRATEGY_INVALIDATED for invalidated instance", async () => {
    mockFindFirst.mockResolvedValue({
      lifecycleState: "INVALIDATED",
      operatorHold: "NONE",
      monitoringSuppressedUntil: null,
    });

    const { POST } = await import("./route");
    const res = await POST(makeRequest(TEST_API_KEY, { strategyId: "strat_1" }));
    const json = await res.json();

    expect(json.action).toBe("STOP");
    expect(json.reasonCode).toBe("STRATEGY_INVALIDATED");
  });

  it("returns STOP + STRATEGY_HALTED for halted instance", async () => {
    mockFindFirst.mockResolvedValue({
      lifecycleState: "HEALTHY",
      operatorHold: "HALTED",
      monitoringSuppressedUntil: null,
    });

    const { POST } = await import("./route");
    const res = await POST(makeRequest(TEST_API_KEY, { strategyId: "strat_1" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.action).toBe("STOP");
    expect(json.reasonCode).toBe("STRATEGY_HALTED");
  });

  it("HALTED overrides INVALIDATED at route level", async () => {
    mockFindFirst.mockResolvedValue({
      lifecycleState: "INVALIDATED",
      operatorHold: "HALTED",
      monitoringSuppressedUntil: null,
    });

    const { POST } = await import("./route");
    const res = await POST(makeRequest(TEST_API_KEY, { strategyId: "strat_1" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.action).toBe("STOP");
    expect(json.reasonCode).toBe("STRATEGY_HALTED");
  });

  it("returns 200 with PAUSE + NO_INSTANCE (not 404/500)", async () => {
    mockFindFirst.mockResolvedValue(null);

    const { POST } = await import("./route");
    const res = await POST(makeRequest(TEST_API_KEY, { strategyId: "nonexistent" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.action).toBe("PAUSE");
    expect(json.reasonCode).toBe("NO_INSTANCE");
    expect(json.serverTime).toBeDefined();
  });

  it("returns PAUSE + COMPUTATION_FAILED on DB error (fail-closed)", async () => {
    mockFindFirst.mockRejectedValue(new Error("DB crash"));

    const { POST } = await import("./route");
    const res = await POST(makeRequest(TEST_API_KEY, { strategyId: "strat_1" }));
    const json = await res.json();

    // Must NOT be 500 — fail-closed returns PAUSE
    expect(res.status).toBe(200);
    expect(json.action).toBe("PAUSE");
    expect(json.reasonCode).toBe("COMPUTATION_FAILED");
  });

  it("logs HEARTBEAT_DECISION_MADE proof event on success", async () => {
    mockFindFirst.mockResolvedValue({
      lifecycleState: "HEALTHY",
      operatorHold: "NONE",
      monitoringSuppressedUntil: null,
    });

    const { POST } = await import("./route");
    const res = await POST(makeRequest(TEST_API_KEY, { strategyId: "strat_1" }));
    expect(res.status).toBe(200);

    // Wait for fire-and-forget
    await new Promise((r) => setTimeout(r, 50));

    expect(mockAppendProofEvent).toHaveBeenCalledWith(
      "strat_1",
      "HEARTBEAT_DECISION_MADE",
      expect.objectContaining({
        eventType: "HEARTBEAT_DECISION_MADE",
        strategyId: "strat_1",
        action: "RUN",
        reasonCode: "OK",
      })
    );
  });

  it("still returns 200 when proof event logging fails", async () => {
    mockFindFirst.mockResolvedValue({
      lifecycleState: "HEALTHY",
      operatorHold: "NONE",
      monitoringSuppressedUntil: null,
    });
    mockAppendProofEvent.mockRejectedValue(new Error("Proof DB error"));

    const { POST } = await import("./route");
    const res = await POST(makeRequest(TEST_API_KEY, { strategyId: "strat_1" }));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.action).toBe("RUN");
  });

  // ── Contract: golden response shape ────────────────────

  it("response always includes strategyId, action, reasonCode, serverTime", async () => {
    mockFindFirst.mockResolvedValue({
      lifecycleState: "HEALTHY",
      operatorHold: "NONE",
      monitoringSuppressedUntil: null,
    });

    const { POST } = await import("./route");
    const res = await POST(makeRequest(TEST_API_KEY, { strategyId: "strat_1" }));
    const json = await res.json();

    expect(json).toHaveProperty("strategyId");
    expect(json).toHaveProperty("action");
    expect(json).toHaveProperty("reasonCode");
    expect(json).toHaveProperty("serverTime");
    // Exactly 4 keys — no extra fields
    expect(Object.keys(json).sort()).toEqual(
      ["action", "reasonCode", "serverTime", "strategyId"].sort()
    );
  });

  it("serverTime is parseable UTC ISO-8601", async () => {
    mockFindFirst.mockResolvedValue({
      lifecycleState: "HEALTHY",
      operatorHold: "NONE",
      monitoringSuppressedUntil: null,
    });

    const { POST } = await import("./route");
    const res = await POST(makeRequest(TEST_API_KEY, { strategyId: "strat_1" }));
    const json = await res.json();

    const parsed = new Date(json.serverTime);
    expect(parsed.getTime()).not.toBeNaN();
    // ISO-8601 with Z suffix (UTC)
    expect(json.serverTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
  });

  it("COMPUTATION_FAILED response also has golden shape (not 500)", async () => {
    mockFindFirst.mockRejectedValue(new Error("DB crash"));

    const { POST } = await import("./route");
    const res = await POST(makeRequest(TEST_API_KEY, { strategyId: "strat_1" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toHaveProperty("strategyId");
    expect(json).toHaveProperty("action");
    expect(json).toHaveProperty("reasonCode");
    expect(json).toHaveProperty("serverTime");
    expect(Object.keys(json).sort()).toEqual(
      ["action", "reasonCode", "serverTime", "strategyId"].sort()
    );
  });

  it("action is always one of RUN, PAUSE, STOP", async () => {
    const VALID_ACTIONS = new Set(["RUN", "PAUSE", "STOP"]);

    // Test RUN
    mockFindFirst.mockResolvedValue({
      lifecycleState: "HEALTHY",
      operatorHold: "NONE",
      monitoringSuppressedUntil: null,
    });
    const { POST } = await import("./route");
    const r1 = await POST(makeRequest(TEST_API_KEY, { strategyId: "strat_1" }));
    expect(VALID_ACTIONS.has((await r1.json()).action)).toBe(true);

    // Test PAUSE (no instance)
    mockFindFirst.mockResolvedValue(null);
    const r2 = await POST(makeRequest(TEST_API_KEY, { strategyId: "strat_1" }));
    expect(VALID_ACTIONS.has((await r2.json()).action)).toBe(true);

    // Test STOP (halted)
    mockFindFirst.mockResolvedValue({
      lifecycleState: "HEALTHY",
      operatorHold: "HALTED",
      monitoringSuppressedUntil: null,
    });
    const r3 = await POST(makeRequest(TEST_API_KEY, { strategyId: "strat_1" }));
    expect(VALID_ACTIONS.has((await r3.json()).action)).toBe(true);
  });

  // ── Contract: auth error behavior ────────────────────

  it("auth failure (401) does not leak heartbeat body", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest("wrong-key", { strategyId: "strat_1" }));
    const json = await res.json();

    expect(res.status).toBe(401);
    // Must NOT contain heartbeat decision fields
    expect(json.action).toBeUndefined();
    expect(json.reasonCode).toBeUndefined();
    expect(json.serverTime).toBeUndefined();
  });

  // ── Contract: no-cache headers ────────────────────────

  it("sets Cache-Control: no-store on success response", async () => {
    mockFindFirst.mockResolvedValue({
      lifecycleState: "HEALTHY",
      operatorHold: "NONE",
      monitoringSuppressedUntil: null,
    });

    const { POST } = await import("./route");
    const res = await POST(makeRequest(TEST_API_KEY, { strategyId: "strat_1" }));

    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("sets Cache-Control: no-store on fail-closed response", async () => {
    mockFindFirst.mockRejectedValue(new Error("DB crash"));

    const { POST } = await import("./route");
    const res = await POST(makeRequest(TEST_API_KEY, { strategyId: "strat_1" }));

    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  // ── Contract: no secrets ──────────────────────────────

  it("does not return instanceTag or accountId in response", async () => {
    mockFindFirst.mockResolvedValue({
      lifecycleState: "HEALTHY",
      operatorHold: "NONE",
      monitoringSuppressedUntil: null,
    });

    const { POST } = await import("./route");
    const res = await POST(
      makeRequest(TEST_API_KEY, {
        strategyId: "strat_1",
        instanceTag: "tag123",
        accountId: "acc456",
      })
    );
    const json = await res.json();

    expect(json.instanceTag).toBeUndefined();
    expect(json.accountId).toBeUndefined();
    expect(json.action).toBe("RUN");
  });
});
