import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const TEST_API_KEY = "test-internal-api-key-that-is-at-least-32-chars";

const mockAppendProofEventInTx = vi.fn();
const mockLiveEAInstanceFindFirst = vi.fn();
const mockLiveEAInstanceUpdate = vi.fn();
const mockOverrideRequestCreate = vi.fn();
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
    liveEAInstance: {
      findFirst: (...args: unknown[]) => mockLiveEAInstanceFindFirst(...args),
    },
    overrideRequest: {
      create: (...args: unknown[]) => mockOverrideRequestCreate(...args),
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

vi.mock("@/domain/verification/config-loader", () => ({
  loadActiveConfigWithFallback: () =>
    Promise.resolve({
      config: {
        configVersion: "2.3.1",
        thresholdsHash: "abc123",
        monitoringThresholds: { overrideExpiryMinutes: 60 },
      },
      source: "fallback",
    }),
}));

function makeRequest(body: object, apiKey?: string, contentType = "application/json") {
  const headers: Record<string, string> = {
    "Content-Type": contentType,
  };
  if (apiKey) {
    headers["x-internal-api-key"] = apiKey;
  }
  return new NextRequest("http://localhost/api/internal/monitoring/override/request", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    strategyId: "strat_1",
    recordId: "rec_abc",
    operatorId: "operator_alice",
    ...overrides,
  };
}

describe("POST /api/internal/monitoring/override/request", () => {
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
      operatorHold: "HALTED",
    });
    mockAppendProofEventInTx.mockResolvedValue({ sequence: 1, eventHash: "eh_1" });
    mockOverrideRequestCreate.mockResolvedValue({
      id: "or_1",
      status: "PENDING",
    });
    mockLiveEAInstanceUpdate.mockResolvedValue({ id: "inst_1", operatorHold: "OVERRIDE_PENDING" });

    mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        liveEAInstance: {
          update: (...args: unknown[]) => mockLiveEAInstanceUpdate(...args),
        },
        overrideRequest: {
          create: (...args: unknown[]) => mockOverrideRequestCreate(...args),
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

  // Test 3: Invalid body
  it("rejects invalid body (400)", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ strategyId: "" }, TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.code).toBe("VALIDATION_FAILED");
  });

  // Test 3b: Missing operatorId
  it("rejects missing operatorId (400)", async () => {
    const { POST } = await import("./route");
    const res = await POST(
      makeRequest({ strategyId: "strat_1", recordId: "rec_abc" }, TEST_API_KEY)
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.code).toBe("VALIDATION_FAILED");
  });

  // Test 3c: operatorId too short
  it("rejects operatorId shorter than 2 chars (400)", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody({ operatorId: "x" }), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.code).toBe("VALIDATION_FAILED");
  });

  // Test 4: Unknown strategy
  it("returns 404 for unknown strategy", async () => {
    mockLiveEAInstanceFindFirst.mockResolvedValue(null);

    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody(), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.code).toBe("NOT_FOUND");
  });

  // Test 5: operatorHold != HALTED
  it("rejects when operatorHold is not HALTED (400)", async () => {
    mockLiveEAInstanceFindFirst.mockResolvedValue({
      id: "inst_1",
      lifecycleState: "EDGE_AT_RISK",
      operatorHold: "NONE",
    });

    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody(), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("operatorHold=HALTED");
  });

  // Test 6: Happy path
  it("happy path: proof-first, creates OverrideRequest, operatorHold -> OVERRIDE_PENDING", async () => {
    const callOrder: string[] = [];
    mockAppendProofEventInTx.mockImplementation(async () => {
      callOrder.push("appendProofEventInTx");
      return { sequence: 1, eventHash: "eh_1" };
    });
    mockOverrideRequestCreate.mockImplementation(async () => {
      callOrder.push("overrideRequest.create");
      return { id: "or_1", status: "PENDING" };
    });
    mockLiveEAInstanceUpdate.mockImplementation(async () => {
      callOrder.push("liveEAInstance.update");
      return { id: "inst_1", operatorHold: "OVERRIDE_PENDING" };
    });

    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody(), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.overrideRequestId).toBe("or_1");
    expect(json.operatorHold).toBe("OVERRIDE_PENDING");
    expect(json.expiresAt).toBeDefined();

    // Proof-first ordering
    expect(callOrder).toEqual([
      "appendProofEventInTx",
      "overrideRequest.create",
      "liveEAInstance.update",
    ]);

    // requestedBy should be the operatorId from the request
    expect(mockAppendProofEventInTx).toHaveBeenCalledWith(
      "strat_1",
      "OVERRIDE_REQUESTED",
      expect.objectContaining({ requestedBy: "operator_alice" })
    );

    // DB create should also use operatorId
    expect(mockOverrideRequestCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ requestedBy: "operator_alice" }),
      })
    );
  });

  // Test 7: Duplicate active override (P2002)
  it("returns 409 OVERRIDE_CONFLICT on duplicate active override", async () => {
    // Use the real Prisma error class — it's available in node_modules
    const { Prisma } = await import("@prisma/client");
    const p2002Error = new Prisma.PrismaClientKnownRequestError("Unique constraint violation", {
      code: "P2002",
      clientVersion: "0",
    });
    mockTransaction.mockRejectedValue(p2002Error);

    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody(), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.code).toBe("OVERRIDE_CONFLICT");
  });

  // Test 8: Fail-closed
  it("fail-closed: appendProofEventInTx throws -> 500", async () => {
    mockAppendProofEventInTx.mockRejectedValue(new Error("Serialization failure"));

    mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        liveEAInstance: {
          update: (...args: unknown[]) => mockLiveEAInstanceUpdate(...args),
        },
        overrideRequest: {
          create: (...args: unknown[]) => mockOverrideRequestCreate(...args),
        },
      };
      return fn(tx);
    });

    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody(), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.code).toBe("INTERNAL_ERROR");
    expect(mockOverrideRequestCreate).not.toHaveBeenCalled();
    expect(mockLiveEAInstanceUpdate).not.toHaveBeenCalled();
  });
});
