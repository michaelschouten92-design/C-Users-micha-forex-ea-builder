import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

const mockFindFirst = vi.fn();
const mockProjectCount = vi.fn();
const mockLiveEACount = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    liveEAInstance: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      count: (...args: unknown[]) => mockLiveEACount(...args),
    },
    project: {
      count: (...args: unknown[]) => mockProjectCount(...args),
    },
  },
}));

vi.mock("@/lib/csrf", () => ({
  timingSafeEqual: (a: string, b: string) => a === b,
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: () => Promise.resolve({ success: true }),
  internalHeartbeatRateLimiter: {},
  getClientIp: () => "127.0.0.1",
  createRateLimitHeaders: () => ({}),
  formatRateLimitError: () => "rate limited",
}));

vi.mock("@/lib/proof/events", () => ({
  appendProofEvent: vi.fn().mockResolvedValue(undefined),
}));

// ── Helpers ────────────────────────────────────────────────

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/internal/heartbeat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-api-key": "test-key",
    },
    body: JSON.stringify(body),
  });
}

// ── Tests ──────────────────────────────────────────────────

describe("Heartbeat authority guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INTERNAL_API_KEY = "test-key";
  });

  it("returns PAUSE + AUTHORITY_UNINITIALIZED when user has 0 strategies and 0 live EAs", async () => {
    mockFindFirst.mockResolvedValue({
      userId: "user-1",
      lifecycleState: "HEALTHY",
      operatorHold: "NONE",
      monitoringSuppressedUntil: null,
    });
    mockProjectCount.mockResolvedValue(0);
    mockLiveEACount.mockResolvedValue(0);

    const { POST } = await import("./route");
    const res = await POST(makeRequest({ strategyId: "strat-1" }));
    const data = await res.json();

    expect(data.action).toBe("PAUSE");
    expect(data.reasonCode).toBe("AUTHORITY_UNINITIALIZED");
    expect(data.authorityReasons).toContain("NO_STRATEGIES");
    expect(data.authorityReasons).toContain("NO_LIVE_INSTANCE");
  });

  it("returns PAUSE + AUTHORITY_UNINITIALIZED when user has strategies but 0 live EAs (1,0)", async () => {
    mockFindFirst.mockResolvedValue({
      userId: "user-1",
      lifecycleState: "HEALTHY",
      operatorHold: "NONE",
      monitoringSuppressedUntil: null,
    });
    mockProjectCount.mockResolvedValue(1);
    mockLiveEACount.mockResolvedValue(0);

    const { POST } = await import("./route");
    const res = await POST(makeRequest({ strategyId: "strat-1" }));
    const data = await res.json();

    expect(data.action).toBe("PAUSE");
    expect(data.reasonCode).toBe("AUTHORITY_UNINITIALIZED");
    expect(data.authorityReasons).toEqual(["NO_LIVE_INSTANCE"]);
  });

  it("returns PAUSE + AUTHORITY_UNINITIALIZED when user has live EAs but 0 strategies (0,1)", async () => {
    mockFindFirst.mockResolvedValue({
      userId: "user-1",
      lifecycleState: "HEALTHY",
      operatorHold: "NONE",
      monitoringSuppressedUntil: null,
    });
    mockProjectCount.mockResolvedValue(0);
    mockLiveEACount.mockResolvedValue(1);

    const { POST } = await import("./route");
    const res = await POST(makeRequest({ strategyId: "strat-1" }));
    const data = await res.json();

    expect(data.action).toBe("PAUSE");
    expect(data.reasonCode).toBe("AUTHORITY_UNINITIALIZED");
    expect(data.authorityReasons).toEqual(["NO_STRATEGIES"]);
  });

  it("PAUSE takes priority over statistical inputs when authority is not ready", async () => {
    // Even with a perfectly healthy instance, authority block → PAUSE
    mockFindFirst.mockResolvedValue({
      userId: "user-1",
      lifecycleState: "HEALTHY",
      operatorHold: "NONE",
      monitoringSuppressedUntil: null,
    });
    mockProjectCount.mockResolvedValue(0);
    mockLiveEACount.mockResolvedValue(0);

    const { POST } = await import("./route");
    const res = await POST(makeRequest({ strategyId: "strat-1" }));
    const data = await res.json();

    // Must be PAUSE, not RUN, despite healthy lifecycle
    expect(data.action).toBe("PAUSE");
    expect(data.reasonCode).toBe("AUTHORITY_UNINITIALIZED");
  });

  it("fail-closed: PAUSE when DB count query throws", async () => {
    mockFindFirst.mockResolvedValue({
      userId: "user-1",
      lifecycleState: "HEALTHY",
      operatorHold: "NONE",
      monitoringSuppressedUntil: null,
    });
    mockProjectCount.mockRejectedValue(new Error("DB connection lost"));
    mockLiveEACount.mockRejectedValue(new Error("DB connection lost"));

    const { POST } = await import("./route");
    const res = await POST(makeRequest({ strategyId: "strat-1" }));
    const data = await res.json();

    expect(data.action).toBe("PAUSE");
    expect(data.reasonCode).toBe("AUTHORITY_UNINITIALIZED");
  });

  it("proceeds to normal decision logic when authority is ready (1,1)", async () => {
    mockFindFirst.mockResolvedValue({
      userId: "user-1",
      lifecycleState: "HEALTHY",
      operatorHold: "NONE",
      monitoringSuppressedUntil: null,
    });
    mockProjectCount.mockResolvedValue(1);
    mockLiveEACount.mockResolvedValue(1);

    const { POST } = await import("./route");
    const res = await POST(makeRequest({ strategyId: "strat-1" }));
    const data = await res.json();

    // Authority ready → normal decision logic → healthy instance → RUN
    expect(data.action).toBe("RUN");
    expect(data.reasonCode).toBe("OK");
  });

  it("regression: existing HALTED decision still works when authority is ready", async () => {
    mockFindFirst.mockResolvedValue({
      userId: "user-1",
      lifecycleState: "HEALTHY",
      operatorHold: "HALTED",
      monitoringSuppressedUntil: null,
    });
    mockProjectCount.mockResolvedValue(2);
    mockLiveEACount.mockResolvedValue(1);

    const { POST } = await import("./route");
    const res = await POST(makeRequest({ strategyId: "strat-1" }));
    const data = await res.json();

    // Authority ready → normal decision logic → HALTED → STOP
    expect(data.action).toBe("STOP");
    expect(data.reasonCode).toBe("STRATEGY_HALTED");
  });

  it("regression: NO_INSTANCE still returned when instance does not exist", async () => {
    mockFindFirst.mockResolvedValue(null);

    const { POST } = await import("./route");
    const res = await POST(makeRequest({ strategyId: "strat-1" }));
    const data = await res.json();

    // No instance → existing NO_INSTANCE path (authority guard skipped)
    expect(data.action).toBe("PAUSE");
    expect(data.reasonCode).toBe("NO_INSTANCE");
    // Count queries should not have been called
    expect(mockProjectCount).not.toHaveBeenCalled();
    expect(mockLiveEACount).not.toHaveBeenCalled();
  });
});
