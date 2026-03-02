import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const TEST_API_KEY = "test-internal-api-key-that-is-at-least-32-chars";

const mockAppendProofEventInTx = vi.fn();
const mockLiveEAInstanceFindFirst = vi.fn();
const mockLiveEAInstanceUpdate = vi.fn();
const mockTransaction = vi.fn();

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

function makeRequest(body: object, apiKey?: string, contentType = "application/json") {
  const headers: Record<string, string> = {
    "Content-Type": contentType,
  };
  if (apiKey) {
    headers["x-internal-api-key"] = apiKey;
  }
  return new NextRequest("http://localhost/api/internal/monitoring/operator-hold", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    strategyId: "strat_1",
    recordId: "rec_abc",
    action: "HALT",
    ...overrides,
  };
}

describe("POST /api/internal/monitoring/operator-hold", () => {
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
      operatorHold: "NONE",
    });
    mockAppendProofEventInTx.mockResolvedValue({ sequence: 1, eventHash: "eh_1" });
    mockLiveEAInstanceUpdate.mockResolvedValue({ id: "inst_1", operatorHold: "HALTED" });

    // $transaction executes callback with mock tx
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        liveEAInstance: {
          update: (...args: unknown[]) => mockLiveEAInstanceUpdate(...args),
        },
      };
      return fn(tx);
    });
  });

  // Test 1: No API key
  it("rejects requests without API key (401)", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody()));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.code).toBe("UNAUTHORIZED");
  });

  // Test 2: Rate limited
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

  // Test 3: Wrong content-type
  it("rejects wrong content-type (400)", async () => {
    const { POST } = await import("./route");
    const req = new NextRequest("http://localhost/api/internal/monitoring/operator-hold", {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
        "x-internal-api-key": TEST_API_KEY,
      },
      body: JSON.stringify(validBody()),
    });
    const res = await POST(req);

    expect(res.status).toBe(415);
  });

  // Test 4: Invalid body (missing fields)
  it("rejects invalid body with missing fields (400)", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ strategyId: "" }, TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.code).toBe("VALIDATION_FAILED");
  });

  // Test 5: Note > 280 chars
  it("rejects note exceeding 280 characters (400)", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody({ note: "a".repeat(281) }), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.code).toBe("VALIDATION_FAILED");
  });

  // Test 6: Unknown strategy
  it("returns 404 for unknown strategy", async () => {
    mockLiveEAInstanceFindFirst.mockResolvedValue(null);

    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody(), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.code).toBe("NOT_FOUND");
  });

  // Test 7: HALT when already HALTED
  it("rejects HALT when operatorHold is already HALTED (400)", async () => {
    mockLiveEAInstanceFindFirst.mockResolvedValue({
      id: "inst_1",
      lifecycleState: "EDGE_AT_RISK",
      operatorHold: "HALTED",
    });

    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody({ action: "HALT" }), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("HALT requires operatorHold=NONE");
  });

  // Test 8: HALT when not EDGE_AT_RISK
  it("rejects HALT when lifecycleState is not EDGE_AT_RISK (400)", async () => {
    mockLiveEAInstanceFindFirst.mockResolvedValue({
      id: "inst_1",
      lifecycleState: "LIVE_MONITORING",
      operatorHold: "NONE",
    });

    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody({ action: "HALT" }), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("HALT requires lifecycleState=EDGE_AT_RISK");
  });

  // Test 9: RESUME when operatorHold=NONE
  it("rejects RESUME when operatorHold is NONE (400)", async () => {
    mockLiveEAInstanceFindFirst.mockResolvedValue({
      id: "inst_1",
      lifecycleState: "EDGE_AT_RISK",
      operatorHold: "NONE",
    });

    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody({ action: "RESUME" }), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("RESUME requires operatorHold=HALTED");
  });

  // Test 10: Happy HALT — proof-first, operatorHold→HALTED
  it("happy HALT: proof event written first, operatorHold updated to HALTED", async () => {
    const callOrder: string[] = [];
    mockAppendProofEventInTx.mockImplementation(async () => {
      callOrder.push("appendProofEventInTx");
      return { sequence: 1, eventHash: "eh_1" };
    });
    mockLiveEAInstanceUpdate.mockImplementation(async () => {
      callOrder.push("liveEAInstance.update");
      return { id: "inst_1", operatorHold: "HALTED" };
    });

    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody({ action: "HALT" }), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true, operatorHold: "HALTED" });

    // Proof-first: appendProofEventInTx called before liveEAInstance.update
    expect(callOrder).toEqual(["appendProofEventInTx", "liveEAInstance.update"]);

    expect(mockAppendProofEventInTx).toHaveBeenCalledWith(
      "strat_1",
      "OPERATOR_HALT_APPLIED",
      expect.objectContaining({
        eventType: "OPERATOR_HALT_APPLIED",
        recordId: "rec_abc",
        strategyId: "strat_1",
        previousHold: "NONE",
        newHold: "HALTED",
        actor: "operator",
        lifecycleState: "EDGE_AT_RISK",
      })
    );

    expect(mockLiveEAInstanceUpdate).toHaveBeenCalledWith({
      where: { id: "inst_1" },
      data: { operatorHold: "HALTED" },
    });
  });

  // Test 11: Happy RESUME — proof-first, operatorHold→NONE
  it("happy RESUME: proof event written first, operatorHold updated to NONE", async () => {
    mockLiveEAInstanceFindFirst.mockResolvedValue({
      id: "inst_1",
      lifecycleState: "EDGE_AT_RISK",
      operatorHold: "HALTED",
    });

    const callOrder: string[] = [];
    mockAppendProofEventInTx.mockImplementation(async () => {
      callOrder.push("appendProofEventInTx");
      return { sequence: 2, eventHash: "eh_2" };
    });
    mockLiveEAInstanceUpdate.mockImplementation(async () => {
      callOrder.push("liveEAInstance.update");
      return { id: "inst_1", operatorHold: "NONE" };
    });

    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody({ action: "RESUME" }), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true, operatorHold: "NONE" });

    expect(callOrder).toEqual(["appendProofEventInTx", "liveEAInstance.update"]);

    expect(mockAppendProofEventInTx).toHaveBeenCalledWith(
      "strat_1",
      "OPERATOR_HALT_RELEASED",
      expect.objectContaining({
        eventType: "OPERATOR_HALT_RELEASED",
        previousHold: "HALTED",
        newHold: "NONE",
        actor: "operator",
      })
    );

    expect(mockLiveEAInstanceUpdate).toHaveBeenCalledWith({
      where: { id: "inst_1" },
      data: { operatorHold: "NONE" },
    });
  });

  // Test 12: Fail-closed — appendProofEventInTx throws → update NOT called
  it("fail-closed: proof event failure prevents operatorHold update (500)", async () => {
    mockAppendProofEventInTx.mockRejectedValue(new Error("Serialization failure"));

    // Make $transaction propagate the error
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        liveEAInstance: {
          update: (...args: unknown[]) => mockLiveEAInstanceUpdate(...args),
        },
      };
      return fn(tx);
    });

    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody({ action: "HALT" }), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.code).toBe("INTERNAL_ERROR");
    expect(mockLiveEAInstanceUpdate).not.toHaveBeenCalled();
  });
});
