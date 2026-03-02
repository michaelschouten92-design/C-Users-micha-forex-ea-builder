import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const TEST_API_KEY = "test-internal-api-key-that-is-at-least-32-chars";

const mockDeliverTransitionAlert = vi.fn();
const mockAlertOutboxFindMany = vi.fn();
const mockAlertOutboxUpdateMany = vi.fn();
const mockAlertOutboxUpdate = vi.fn();
const mockAlertOutboxCount = vi.fn();

vi.mock("@/lib/csrf", () => ({
  timingSafeEqual: (a: string, b: string) => a === b,
}));

const mockCheckRateLimit = vi.fn();

vi.mock("@/lib/rate-limit", () => ({
  internalNotificationProcessRateLimiter: {},
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getClientIp: () => "127.0.0.1",
  createRateLimitHeaders: vi.fn().mockReturnValue({}),
  formatRateLimitError: vi.fn().mockReturnValue("Rate limit exceeded. Try again in 60 seconds."),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    alertOutbox: {
      findMany: (...args: unknown[]) => mockAlertOutboxFindMany(...args),
      updateMany: (...args: unknown[]) => mockAlertOutboxUpdateMany(...args),
      update: (...args: unknown[]) => mockAlertOutboxUpdate(...args),
      count: (...args: unknown[]) => mockAlertOutboxCount(...args),
    },
  },
}));

vi.mock("@/lib/notifications/notify", () => ({
  deliverTransitionAlert: (...args: unknown[]) => mockDeliverTransitionAlert(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  },
}));

function makePostRequest(body?: object | null, apiKey?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers["x-internal-api-key"] = apiKey;
  }
  return new NextRequest("http://localhost/api/internal/notifications/process", {
    method: "POST",
    headers,
    body: body !== null ? JSON.stringify(body ?? {}) : undefined,
  });
}

function makeGetRequest(apiKey?: string) {
  const headers: Record<string, string> = {};
  if (apiKey) {
    headers["x-internal-api-key"] = apiKey;
  }
  return new NextRequest("http://localhost/api/internal/notifications/process", {
    method: "GET",
    headers,
  });
}

const SAMPLE_PAYLOAD = {
  strategyId: "strat_1",
  fromState: "LIVE_MONITORING",
  toState: "EDGE_AT_RISK",
  monitoringVerdict: "AT_RISK",
  reasonCodes: ["DRAWDOWN_BREACH"],
  tradeSnapshotHash: "snap_hash",
  configVersion: "2.0.0",
  thresholdsHash: "th_hash",
  recordId: "rec_1",
};

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "alert_1",
    status: "PENDING",
    attempts: 0,
    payload: SAMPLE_PAYLOAD,
    createdAt: new Date(),
    ...overrides,
  };
}

describe("POST /api/internal/notifications/process", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INTERNAL_API_KEY = TEST_API_KEY;
    mockCheckRateLimit.mockResolvedValue({
      success: true,
      limit: 5,
      remaining: 4,
      resetAt: new Date(),
    });
    mockAlertOutboxFindMany.mockResolvedValue([]);
    mockAlertOutboxUpdateMany.mockResolvedValue({ count: 1 });
    mockAlertOutboxUpdate.mockResolvedValue({});
    mockDeliverTransitionAlert.mockResolvedValue(undefined);
  });

  // ── Auth ──────────────────────────────────────────────────────────
  it("returns 401 when no API key provided", async () => {
    const { POST } = await import("./route");
    const res = await POST(makePostRequest({}, undefined));
    expect(res.status).toBe(401);
  });

  it("returns 401 when wrong API key provided", async () => {
    const { POST } = await import("./route");
    const res = await POST(makePostRequest({}, "wrong-key"));
    expect(res.status).toBe(401);
  });

  it("returns 401 when INTERNAL_API_KEY is not configured", async () => {
    delete process.env.INTERNAL_API_KEY;
    const { POST } = await import("./route");
    const res = await POST(makePostRequest({}, TEST_API_KEY));
    expect(res.status).toBe(401);
  });

  // ── Rate limit ────────────────────────────────────────────────────
  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockResolvedValue({
      success: false,
      limit: 5,
      remaining: 0,
      resetAt: new Date(),
    });

    const { POST } = await import("./route");
    const res = await POST(makePostRequest({}, TEST_API_KEY));
    expect(res.status).toBe(429);
  });

  // ── Validation ────────────────────────────────────────────────────
  it("rejects limit > 100", async () => {
    const { POST } = await import("./route");
    const res = await POST(makePostRequest({ limit: 101 }, TEST_API_KEY));
    expect(res.status).toBe(400);
  });

  it("uses default limit when no body provided", async () => {
    const { POST } = await import("./route");
    const res = await POST(makePostRequest(null, TEST_API_KEY));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data).toEqual({ processed: 0, sent: 0, failed: 0 });
  });

  // ── Processing ────────────────────────────────────────────────────
  it("processes PENDING rows and marks SENT on success", async () => {
    const row = makeRow();
    mockAlertOutboxFindMany.mockResolvedValue([row]);

    const { POST } = await import("./route");
    const res = await POST(makePostRequest({}, TEST_API_KEY));
    const data = await res.json();

    expect(data).toEqual({ processed: 1, sent: 1, failed: 0 });
    expect(mockDeliverTransitionAlert).toHaveBeenCalledWith(SAMPLE_PAYLOAD);
    expect(mockAlertOutboxUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "alert_1" },
        data: { status: "SENT" },
      })
    );
  });

  it("processes FAILED rows with passed nextAttemptAt", async () => {
    const row = makeRow({ id: "alert_2", status: "FAILED", attempts: 1 });
    mockAlertOutboxFindMany.mockResolvedValue([row]);

    const { POST } = await import("./route");
    const res = await POST(makePostRequest({}, TEST_API_KEY));
    const data = await res.json();

    expect(data).toEqual({ processed: 1, sent: 1, failed: 0 });
  });

  it("marks FAILED with incremented attempts and backoff on webhook error", async () => {
    const row = makeRow({ attempts: 2 });
    mockAlertOutboxFindMany.mockResolvedValue([row]);
    mockDeliverTransitionAlert.mockRejectedValue(new Error("Webhook returned 503"));

    const { POST } = await import("./route");
    const now = Date.now();
    const res = await POST(makePostRequest({}, TEST_API_KEY));
    const data = await res.json();

    expect(data).toEqual({ processed: 1, sent: 0, failed: 1 });
    expect(mockAlertOutboxUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "alert_1" },
        data: expect.objectContaining({
          status: "FAILED",
          attempts: 3,
          lastError: "Webhook returned 503",
        }),
      })
    );

    // Verify backoff: 2^3 * 30000 = 240000ms (4 min)
    const updateCall = mockAlertOutboxUpdate.mock.calls[0][0];
    const nextAttempt = updateCall.data.nextAttemptAt.getTime();
    expect(nextAttempt).toBeGreaterThanOrEqual(now + 240_000 - 1000);
    expect(nextAttempt).toBeLessThanOrEqual(now + 240_000 + 5000);
  });

  it("caps lastError at 500 characters", async () => {
    const row = makeRow();
    mockAlertOutboxFindMany.mockResolvedValue([row]);
    mockDeliverTransitionAlert.mockRejectedValue(new Error("x".repeat(600)));

    const { POST } = await import("./route");
    await POST(makePostRequest({}, TEST_API_KEY));

    const updateCall = mockAlertOutboxUpdate.mock.calls[0][0];
    expect(updateCall.data.lastError.length).toBe(500);
  });

  it("skips row when optimistic lock fails (status already changed)", async () => {
    const row = makeRow();
    mockAlertOutboxFindMany.mockResolvedValue([row]);
    mockAlertOutboxUpdateMany.mockResolvedValue({ count: 0 }); // lock failed

    const { POST } = await import("./route");
    const res = await POST(makePostRequest({}, TEST_API_KEY));
    const data = await res.json();

    expect(data).toEqual({ processed: 1, sent: 0, failed: 0 });
    expect(mockDeliverTransitionAlert).not.toHaveBeenCalled();
  });

  it("returns zeros when outbox is empty", async () => {
    mockAlertOutboxFindMany.mockResolvedValue([]);

    const { POST } = await import("./route");
    const res = await POST(makePostRequest({}, TEST_API_KEY));
    const data = await res.json();

    expect(data).toEqual({ processed: 0, sent: 0, failed: 0 });
  });

  it("respects limit parameter", async () => {
    const { POST } = await import("./route");
    await POST(makePostRequest({ limit: 5 }, TEST_API_KEY));

    expect(mockAlertOutboxFindMany).toHaveBeenCalledWith(expect.objectContaining({ take: 5 }));
  });
});

describe("GET /api/internal/notifications/process", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INTERNAL_API_KEY = TEST_API_KEY;
    mockCheckRateLimit.mockResolvedValue({
      success: true,
      limit: 5,
      remaining: 4,
      resetAt: new Date(),
    });
  });

  it("returns 401 without valid API key", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });

  it("returns counts for each status", async () => {
    mockAlertOutboxCount
      .mockResolvedValueOnce(3) // pending
      .mockResolvedValueOnce(1) // failed
      .mockResolvedValueOnce(0); // sending

    const { GET } = await import("./route");
    const res = await GET(makeGetRequest(TEST_API_KEY));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ pending: 3, failed: 1, sending: 0 });
  });
});
