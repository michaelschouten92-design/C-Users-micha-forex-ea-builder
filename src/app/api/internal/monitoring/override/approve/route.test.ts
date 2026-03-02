import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const TEST_API_KEY = "test-internal-api-key-that-is-at-least-32-chars";

const mockAppendProofEventInTx = vi.fn();
const mockOverrideRequestFindFirst = vi.fn();
const mockOverrideRequestUpdate = vi.fn();
const mockTransaction = vi.fn();
const mockLoadActiveConfigWithFallback = vi.fn();

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
      update: (...args: unknown[]) => mockOverrideRequestUpdate(...args),
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
  loadActiveConfigWithFallback: (...args: unknown[]) => mockLoadActiveConfigWithFallback(...args),
}));

function makeRequest(body: object, apiKey?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers["x-internal-api-key"] = apiKey;
  }
  return new NextRequest("http://localhost/api/internal/monitoring/override/approve", {
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

function configWithPolicy(policy: "SAME_OK" | "DIFFERENT_REQUIRED") {
  return {
    config: {
      configVersion: "2.3.1",
      thresholdsHash: "abc123",
      monitoringThresholds: {
        overrideApprovalPolicy: policy,
        overrideExpiryMinutes: 60,
      },
    },
    source: "fallback",
  };
}

describe("POST /api/internal/monitoring/override/approve", () => {
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
      requestedBy: "operator_alice",
      expiresAt: new Date(Date.now() + 60 * 60_000), // 1 hour from now
    });
    mockAppendProofEventInTx.mockResolvedValue({ sequence: 1, eventHash: "eh_1" });
    mockOverrideRequestUpdate.mockResolvedValue({ id: "or_1", status: "APPROVED" });
    // Default: DIFFERENT_REQUIRED
    mockLoadActiveConfigWithFallback.mockResolvedValue(configWithPolicy("DIFFERENT_REQUIRED"));

    mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        overrideRequest: {
          update: (...args: unknown[]) => mockOverrideRequestUpdate(...args),
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

  // Test 2: Invalid body
  it("rejects invalid body (400)", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ strategyId: "" }, TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.code).toBe("VALIDATION_FAILED");
  });

  // Test 2b: Missing operatorId
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

  // Test 2c: operatorId too short
  it("rejects operatorId shorter than 2 chars (400)", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody({ operatorId: "x" }), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.code).toBe("VALIDATION_FAILED");
  });

  // Test 3: Override request not found
  it("returns 404 when override request not found", async () => {
    mockOverrideRequestFindFirst.mockResolvedValue(null);

    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody(), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.code).toBe("NOT_FOUND");
  });

  // Test 4: Override expired
  it("returns 400 OVERRIDE_EXPIRED when override has expired", async () => {
    mockOverrideRequestFindFirst.mockResolvedValue({
      id: "or_1",
      strategyId: "strat_1",
      status: "PENDING",
      requestedBy: "operator_alice",
      expiresAt: new Date(Date.now() - 1000), // expired
    });

    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody(), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.code).toBe("OVERRIDE_EXPIRED");
    // Should have auto-expired it
    expect(mockOverrideRequestUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "or_1" },
        data: expect.objectContaining({ status: "EXPIRED" }),
      })
    );
  });

  // Test 5: Happy approve with different operator
  it("happy approve: different operator, proof-first, status -> APPROVED", async () => {
    const callOrder: string[] = [];
    mockAppendProofEventInTx.mockImplementation(async () => {
      callOrder.push("appendProofEventInTx");
      return { sequence: 1, eventHash: "eh_1" };
    });
    mockOverrideRequestUpdate.mockImplementation(async () => {
      callOrder.push("overrideRequest.update");
      return { id: "or_1", status: "APPROVED" };
    });

    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody({ operatorId: "operator_bob" }), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true, status: "APPROVED" });

    // Proof-first ordering
    expect(callOrder).toEqual(["appendProofEventInTx", "overrideRequest.update"]);

    // approvedBy should be the operatorId from the request
    expect(mockOverrideRequestUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ approvedBy: "operator_bob" }),
      })
    );

    // Proof event should include the policy
    expect(mockAppendProofEventInTx).toHaveBeenCalledWith(
      "strat_1",
      "OVERRIDE_APPROVED",
      expect.objectContaining({
        approvedBy: "operator_bob",
        overrideApprovalPolicy: "DIFFERENT_REQUIRED",
      })
    );
  });

  // Test 6: Fail-closed
  it("fail-closed: appendProofEventInTx throws -> 500", async () => {
    mockAppendProofEventInTx.mockRejectedValue(new Error("Serialization failure"));

    mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        overrideRequest: {
          update: (...args: unknown[]) => mockOverrideRequestUpdate(...args),
        },
      };
      return fn(tx);
    });

    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody({ operatorId: "operator_bob" }), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.code).toBe("INTERNAL_ERROR");
    expect(mockOverrideRequestUpdate).not.toHaveBeenCalled();
  });

  // ── Approval policy enforcement tests ─────────────────────────────

  // Test 7: DIFFERENT_REQUIRED — same operator fails
  it("rejects same operator when policy is DIFFERENT_REQUIRED (400)", async () => {
    mockOverrideRequestFindFirst.mockResolvedValue({
      id: "or_1",
      strategyId: "strat_1",
      status: "PENDING",
      requestedBy: "operator_alice",
      expiresAt: new Date(Date.now() + 60 * 60_000),
    });
    mockLoadActiveConfigWithFallback.mockResolvedValue(configWithPolicy("DIFFERENT_REQUIRED"));

    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody({ operatorId: "operator_alice" }), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.code).toBe("OVERRIDE_POLICY_VIOLATION");
    expect(json.error).toContain("DIFFERENT_REQUIRED");
    expect(json.error).toContain("operator_alice");

    // No transaction should have been initiated
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  // Test 8: DIFFERENT_REQUIRED — missing operatorId now returns 400 VALIDATION_FAILED (no default)
  it("rejects when operatorId is missing entirely (no default)", async () => {
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

  // Test 9: SAME_OK — same operator succeeds (config-driven)
  it("allows same operator when policy is SAME_OK", async () => {
    mockOverrideRequestFindFirst.mockResolvedValue({
      id: "or_1",
      strategyId: "strat_1",
      status: "PENDING",
      requestedBy: "operator_alice",
      expiresAt: new Date(Date.now() + 60 * 60_000),
    });
    mockLoadActiveConfigWithFallback.mockResolvedValue(configWithPolicy("SAME_OK"));

    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody({ operatorId: "operator_alice" }), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true, status: "APPROVED" });

    // approvedBy should be operator_alice
    expect(mockOverrideRequestUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ approvedBy: "operator_alice" }),
      })
    );

    // Proof event records the SAME_OK policy
    expect(mockAppendProofEventInTx).toHaveBeenCalledWith(
      "strat_1",
      "OVERRIDE_APPROVED",
      expect.objectContaining({
        overrideApprovalPolicy: "SAME_OK",
      })
    );
  });
});
