import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const TEST_API_KEY = "test-internal-api-key-that-is-at-least-32-chars";

const mockAppendProofEventInTx = vi.fn();
const mockLiveEAInstanceFindFirst = vi.fn();
const mockTransaction = vi.fn();
const mockIncidentUpdateMany = vi.fn();

vi.mock("@/lib/csrf", () => ({
  timingSafeEqual: (a: string, b: string) => a === b,
}));

const mockCheckRateLimit = vi.fn();

vi.mock("@/lib/rate-limit", () => ({
  internalOperatorActionRateLimiter: {},
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getClientIp: () => "127.0.0.1",
  createRateLimitHeaders: vi.fn().mockReturnValue({}),
  formatRateLimitError: vi.fn().mockReturnValue("Rate limit exceeded. Try again in 60 seconds."),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: (...args: unknown[]) => mockTransaction(...args),
    liveEAInstance: {
      findFirst: (...args: unknown[]) => mockLiveEAInstanceFindFirst(...args),
    },
  },
}));

vi.mock("@/lib/proof/events", () => ({
  appendProofEventInTx: (_tx: unknown, ...args: unknown[]) => mockAppendProofEventInTx(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  },
}));

function makeRequest(body: object, apiKey?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers["x-internal-api-key"] = apiKey;
  }
  return new NextRequest("http://localhost/api/internal/monitoring/operator-action", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    strategyId: "strat_1",
    recordId: "rec_abc",
    action: "ACK",
    ...overrides,
  };
}

describe("POST /api/internal/monitoring/operator-action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INTERNAL_API_KEY = TEST_API_KEY;
    mockCheckRateLimit.mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      resetAt: new Date(),
    });
    mockLiveEAInstanceFindFirst.mockResolvedValue({
      id: "inst_1",
      lifecycleState: "EDGE_AT_RISK",
    });
    mockAppendProofEventInTx.mockResolvedValue({ sequence: 1, eventHash: "eh_1" });
    mockIncidentUpdateMany.mockResolvedValue({ count: 1 });

    // $transaction executes callback with mock tx
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        incident: {
          updateMany: (...args: unknown[]) => mockIncidentUpdateMany(...args),
        },
      };
      return fn(tx);
    });
  });

  it("rejects requests without API key (401)", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody()));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.code).toBe("UNAUTHORIZED");
  });

  it("rejects requests with wrong API key (401)", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody(), "wrong-key-that-is-definitely-not-correct"));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.code).toBe("UNAUTHORIZED");
  });

  it("rejects when INTERNAL_API_KEY not configured (401)", async () => {
    delete process.env.INTERNAL_API_KEY;
    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody(), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.code).toBe("UNAUTHORIZED");
  });

  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockResolvedValueOnce({
      success: false,
      limit: 10,
      remaining: 0,
      resetAt: new Date(Date.now() + 60_000),
    });

    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody(), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(429);
    expect(json.code).toBe("RATE_LIMITED");
  });

  it("invalid body (missing fields) returns 400", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ strategyId: "" }, TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.code).toBe("VALIDATION_FAILED");
    expect(json.details).toBeDefined();
  });

  it("invalid action returns 400", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody({ action: "INVALID_ACTION" }), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.code).toBe("VALIDATION_FAILED");
  });

  it("instance not found returns 404", async () => {
    mockLiveEAInstanceFindFirst.mockResolvedValue(null);

    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody(), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.code).toBe("NOT_FOUND");
  });

  it("ACK on EDGE_AT_RISK: success, proof event written", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody({ action: "ACK" }), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(mockAppendProofEventInTx).toHaveBeenCalledWith(
      "strat_1",
      "OPERATOR_ACKNOWLEDGED_RISK",
      expect.objectContaining({
        eventType: "OPERATOR_ACKNOWLEDGED_RISK",
        action: "ACK",
        strategyId: "strat_1",
        recordId: "rec_abc",
        lifecycleState: "EDGE_AT_RISK",
      })
    );
  });

  it("ACK updates incident to ACKNOWLEDGED", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody({ action: "ACK" }), TEST_API_KEY));

    expect(res.status).toBe(200);
    expect(mockIncidentUpdateMany).toHaveBeenCalledWith({
      where: { strategyId: "strat_1", status: { in: ["OPEN", "ESCALATED"] } },
      data: { status: "ACKNOWLEDGED" },
    });
  });

  it("ACK with no open incident still succeeds", async () => {
    mockIncidentUpdateMany.mockResolvedValue({ count: 0 });

    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody({ action: "ACK" }), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
  });

  it("ACK on INVALIDATED: success, proof event written", async () => {
    mockLiveEAInstanceFindFirst.mockResolvedValue({
      id: "inst_1",
      lifecycleState: "INVALIDATED",
    });

    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody({ action: "ACK" }), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(mockAppendProofEventInTx).toHaveBeenCalledWith(
      "strat_1",
      "OPERATOR_ACKNOWLEDGED_RISK",
      expect.objectContaining({ lifecycleState: "INVALIDATED" })
    );
  });

  it("HALT on EDGE_AT_RISK: success, proof event written, no incident update", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody({ action: "HALT" }), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(mockAppendProofEventInTx).toHaveBeenCalledWith(
      "strat_1",
      "OPERATOR_REQUESTED_HALT",
      expect.objectContaining({
        eventType: "OPERATOR_REQUESTED_HALT",
        action: "HALT",
      })
    );
    // HALT does not update incident
    expect(mockIncidentUpdateMany).not.toHaveBeenCalled();
  });

  it("HALT on INVALIDATED: rejected (400)", async () => {
    mockLiveEAInstanceFindFirst.mockResolvedValue({
      id: "inst_1",
      lifecycleState: "INVALIDATED",
    });

    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody({ action: "HALT" }), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("HALT not allowed in state INVALIDATED");
  });

  it("OVERRIDE_REQUEST on EDGE_AT_RISK: success", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody({ action: "OVERRIDE_REQUEST" }), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(mockAppendProofEventInTx).toHaveBeenCalledWith(
      "strat_1",
      "OPERATOR_OVERRIDE_REQUESTED",
      expect.objectContaining({ action: "OVERRIDE_REQUEST" })
    );
  });

  it("OVERRIDE_REQUEST on INVALIDATED: rejected (400)", async () => {
    mockLiveEAInstanceFindFirst.mockResolvedValue({
      id: "inst_1",
      lifecycleState: "INVALIDATED",
    });

    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody({ action: "OVERRIDE_REQUEST" }), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("OVERRIDE_REQUEST not allowed in state INVALIDATED");
  });

  it("ACK on LIVE_MONITORING: rejected (400, not eligible)", async () => {
    mockLiveEAInstanceFindFirst.mockResolvedValue({
      id: "inst_1",
      lifecycleState: "LIVE_MONITORING",
    });

    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody({ action: "ACK" }), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("ACK not allowed in state LIVE_MONITORING");
  });

  it("note capped at 280 chars by Zod schema", async () => {
    const longNote = "a".repeat(281);
    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody({ note: longNote }), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.code).toBe("VALIDATION_FAILED");
  });

  it("proof event write failure returns 500", async () => {
    mockTransaction.mockRejectedValue(new Error("DB write failed"));

    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody(), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.code).toBe("INTERNAL_ERROR");
  });
});
