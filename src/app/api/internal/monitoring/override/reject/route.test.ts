import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const TEST_API_KEY = "test-internal-api-key-that-is-at-least-32-chars";

const mockAppendProofEventInTx = vi.fn();
const mockOverrideRequestFindFirst = vi.fn();
const mockOverrideRequestUpdate = vi.fn();
const mockLiveEAInstanceUpdateMany = vi.fn();
const mockTransaction = vi.fn();

vi.mock("@/lib/csrf", () => ({
  timingSafeEqual: (a: string, b: string) => a === b,
}));

const mockCheckRateLimit = vi.fn();

vi.mock("@/lib/rate-limit", () => ({
  internalOverrideRateLimiter: {},
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getClientIp: () => "127.0.0.1",
  createRateLimitHeaders: vi.fn().mockReturnValue({}),
  formatRateLimitError: vi.fn().mockReturnValue("Rate limit exceeded. Try again in 60 seconds."),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: (...args: unknown[]) => mockTransaction(...args),
    overrideRequest: {
      findFirst: (...args: unknown[]) => mockOverrideRequestFindFirst(...args),
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
  return new NextRequest("http://localhost/api/internal/monitoring/override/reject", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    strategyId: "strat_1",
    recordId: "rec_abc",
    overrideRequestId: "or_1",
    operatorId: "operator_bob",
    ...overrides,
  };
}

describe("POST /api/internal/monitoring/override/reject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INTERNAL_API_KEY = TEST_API_KEY;
    mockCheckRateLimit.mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      resetAt: new Date(),
    });
    mockOverrideRequestFindFirst.mockResolvedValue({
      id: "or_1",
      strategyId: "strat_1",
      status: "PENDING",
    });
    mockAppendProofEventInTx.mockResolvedValue({ sequence: 1, eventHash: "eh_1" });
    mockOverrideRequestUpdate.mockResolvedValue({ id: "or_1", status: "REJECTED" });
    mockLiveEAInstanceUpdateMany.mockResolvedValue({ count: 1 });

    mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        overrideRequest: {
          update: (...args: unknown[]) => mockOverrideRequestUpdate(...args),
        },
        liveEAInstance: {
          updateMany: (...args: unknown[]) => mockLiveEAInstanceUpdateMany(...args),
        },
      };
      return fn(tx);
    });
  });

  // Test 1: Auth / validation / not-found
  it("rejects requests without API key (401)", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody()));
    expect(res.status).toBe(401);
  });

  it("rejects invalid body (400)", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ strategyId: "" }, TEST_API_KEY));
    expect(res.status).toBe(400);
  });

  it("rejects missing operatorId (400)", async () => {
    const { POST } = await import("./route");
    const res = await POST(
      makeRequest(
        { strategyId: "strat_1", recordId: "rec_abc", overrideRequestId: "or_1" },
        TEST_API_KEY
      )
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.code).toBe("VALIDATION_FAILED");
  });

  it("rejects operatorId shorter than 2 chars (400)", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody({ operatorId: "x" }), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.code).toBe("VALIDATION_FAILED");
  });

  it("returns 404 when override request not found", async () => {
    mockOverrideRequestFindFirst.mockResolvedValue(null);

    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody(), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.code).toBe("NOT_FOUND");
  });

  // Test 2: Happy reject from PENDING
  it("happy reject from PENDING: proof-first, status -> REJECTED, operatorHold -> HALTED", async () => {
    const callOrder: string[] = [];
    mockAppendProofEventInTx.mockImplementation(async () => {
      callOrder.push("appendProofEventInTx");
      return { sequence: 1, eventHash: "eh_1" };
    });
    mockOverrideRequestUpdate.mockImplementation(async () => {
      callOrder.push("overrideRequest.update");
      return { id: "or_1", status: "REJECTED" };
    });
    mockLiveEAInstanceUpdateMany.mockImplementation(async () => {
      callOrder.push("liveEAInstance.updateMany");
      return { count: 1 };
    });

    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody(), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true, status: "REJECTED", operatorHold: "HALTED" });

    // Proof-first ordering
    expect(callOrder).toEqual([
      "appendProofEventInTx",
      "overrideRequest.update",
      "liveEAInstance.updateMany",
    ]);

    // rejectedBy should be the operatorId from the request
    expect(mockAppendProofEventInTx).toHaveBeenCalledWith(
      "strat_1",
      "OVERRIDE_REJECTED",
      expect.objectContaining({ rejectedBy: "operator_bob" })
    );
  });

  // Test 3: Happy reject from APPROVED
  it("happy reject from APPROVED", async () => {
    mockOverrideRequestFindFirst.mockResolvedValue({
      id: "or_1",
      strategyId: "strat_1",
      status: "APPROVED",
    });

    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody(), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe("REJECTED");
  });

  // Test 4: Reject from APPLIED (terminal)
  it("rejects reject from APPLIED state (400)", async () => {
    mockOverrideRequestFindFirst.mockResolvedValue({
      id: "or_1",
      strategyId: "strat_1",
      status: "APPLIED",
    });

    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody(), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("APPLIED");
  });

  // Test 5: Fail-closed
  it("fail-closed: appendProofEventInTx throws -> 500", async () => {
    mockAppendProofEventInTx.mockRejectedValue(new Error("Serialization failure"));

    mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        overrideRequest: {
          update: (...args: unknown[]) => mockOverrideRequestUpdate(...args),
        },
        liveEAInstance: {
          updateMany: (...args: unknown[]) => mockLiveEAInstanceUpdateMany(...args),
        },
      };
      return fn(tx);
    });

    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody(), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.code).toBe("INTERNAL_ERROR");
    expect(mockOverrideRequestUpdate).not.toHaveBeenCalled();
  });
});
