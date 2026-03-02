import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const TEST_API_KEY = "test-internal-api-key-that-is-at-least-32-chars";

const mockLoadActiveConfigWithFallback = vi.fn();
const mockAppendProofEventInTx = vi.fn();
const mockPerformLifecycleTransitionInTx = vi.fn();
const mockLiveEAInstanceFindFirst = vi.fn();
const mockLiveEAInstanceUpdate = vi.fn();
const mockOverrideRequestFindFirst = vi.fn();
const mockOverrideRequestUpdate = vi.fn();
const mockIncidentFindFirst = vi.fn();
const mockIncidentUpdate = vi.fn();
const mockAlertOutboxCreate = vi.fn();
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
      update: (...args: unknown[]) => mockOverrideRequestUpdate(...args),
    },
    liveEAInstance: {
      findFirst: (...args: unknown[]) => mockLiveEAInstanceFindFirst(...args),
    },
  },
}));

vi.mock("@/lib/proof/events", () => ({
  appendProofEventInTx: (_tx: unknown, ...args: unknown[]) => mockAppendProofEventInTx(...args),
}));

vi.mock("@/lib/strategy-lifecycle/transition-service", () => ({
  performLifecycleTransitionInTx: (_tx: unknown, ...args: unknown[]) =>
    mockPerformLifecycleTransitionInTx(...args),
}));

vi.mock("@/domain/verification/config-loader", () => ({
  loadActiveConfigWithFallback: (...args: unknown[]) => mockLoadActiveConfigWithFallback(...args),
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
  return new NextRequest("http://localhost/api/internal/monitoring/override/apply", {
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

describe("POST /api/internal/monitoring/override/apply", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INTERNAL_API_KEY = TEST_API_KEY;
    mockLoadActiveConfigWithFallback.mockResolvedValue({
      config: {
        monitoringThresholds: { overrideSuppressionMinutes: 10 },
      },
      source: "db",
    });
    mockCheckRateLimit.mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      resetAt: new Date(),
    });
    mockOverrideRequestFindFirst.mockResolvedValue({
      id: "or_1",
      strategyId: "strat_1",
      status: "APPROVED",
      expiresAt: new Date(Date.now() + 60 * 60_000),
    });
    mockLiveEAInstanceFindFirst.mockResolvedValue({
      id: "inst_1",
      lifecycleState: "EDGE_AT_RISK",
      operatorHold: "OVERRIDE_PENDING",
    });
    mockAppendProofEventInTx.mockResolvedValue({ sequence: 1, eventHash: "eh_1" });
    mockPerformLifecycleTransitionInTx.mockResolvedValue(undefined);
    mockIncidentFindFirst.mockResolvedValue({
      id: "inc_1",
      strategyId: "strat_1",
      status: "OPEN",
    });
    mockIncidentUpdate.mockResolvedValue({ id: "inc_1", status: "CLOSED" });
    mockOverrideRequestUpdate.mockResolvedValue({ id: "or_1", status: "APPLIED" });
    mockLiveEAInstanceUpdate.mockResolvedValue({ id: "inst_1", operatorHold: "NONE" });
    mockAlertOutboxCreate.mockResolvedValue({ id: "alert_1" });

    mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        overrideRequest: {
          update: (...args: unknown[]) => mockOverrideRequestUpdate(...args),
        },
        liveEAInstance: {
          update: (...args: unknown[]) => mockLiveEAInstanceUpdate(...args),
        },
        incident: {
          findFirst: (...args: unknown[]) => mockIncidentFindFirst(...args),
          update: (...args: unknown[]) => mockIncidentUpdate(...args),
        },
        alertOutbox: {
          create: (...args: unknown[]) => mockAlertOutboxCreate(...args),
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
    expect(res.status).toBe(404);
  });

  // Test 2: Override not APPROVED
  it("rejects when override is not APPROVED (400)", async () => {
    mockOverrideRequestFindFirst.mockResolvedValue({
      id: "or_1",
      strategyId: "strat_1",
      status: "PENDING",
      expiresAt: new Date(Date.now() + 60 * 60_000),
    });

    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody(), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("PENDING");
  });

  // Test 3: operatorHold != OVERRIDE_PENDING
  it("rejects when operatorHold is not OVERRIDE_PENDING (400)", async () => {
    mockLiveEAInstanceFindFirst.mockResolvedValue({
      id: "inst_1",
      lifecycleState: "EDGE_AT_RISK",
      operatorHold: "HALTED",
    });

    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody(), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("OVERRIDE_PENDING");
  });

  // Test 4: lifecycleState != EDGE_AT_RISK
  it("rejects when lifecycleState is not EDGE_AT_RISK (400)", async () => {
    mockLiveEAInstanceFindFirst.mockResolvedValue({
      id: "inst_1",
      lifecycleState: "LIVE_MONITORING",
      operatorHold: "OVERRIDE_PENDING",
    });

    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody(), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("EDGE_AT_RISK");
  });

  // Test 5: Override expired
  it("returns 400 OVERRIDE_EXPIRED when override has expired", async () => {
    mockOverrideRequestFindFirst.mockResolvedValue({
      id: "or_1",
      strategyId: "strat_1",
      status: "APPROVED",
      expiresAt: new Date(Date.now() - 1000),
    });

    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody(), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.code).toBe("OVERRIDE_EXPIRED");
  });

  // Test 6: Happy apply with incident
  it("happy apply: proof-first, lifecycle transition, incident CLOSED, operatorHold -> NONE, alertOutbox", async () => {
    const callOrder: string[] = [];
    mockAppendProofEventInTx.mockImplementation(async () => {
      callOrder.push("appendProofEventInTx");
      return { sequence: 1, eventHash: "eh_1" };
    });
    mockPerformLifecycleTransitionInTx.mockImplementation(async () => {
      callOrder.push("performLifecycleTransitionInTx");
    });
    mockIncidentFindFirst.mockImplementation(async () => {
      callOrder.push("incident.findFirst");
      return { id: "inc_1", strategyId: "strat_1", status: "OPEN" };
    });
    mockIncidentUpdate.mockImplementation(async () => {
      callOrder.push("incident.update");
      return { id: "inc_1", status: "CLOSED" };
    });
    mockOverrideRequestUpdate.mockImplementation(async () => {
      callOrder.push("overrideRequest.update");
      return { id: "or_1", status: "APPLIED" };
    });
    mockLiveEAInstanceUpdate.mockImplementation(async () => {
      callOrder.push("liveEAInstance.update");
      return { id: "inst_1", operatorHold: "NONE" };
    });
    mockAlertOutboxCreate.mockImplementation(async () => {
      callOrder.push("alertOutbox.create");
      return { id: "alert_1" };
    });

    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody(), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({
      ok: true,
      status: "APPLIED",
      lifecycleState: "LIVE_MONITORING",
      operatorHold: "NONE",
    });

    // Reordered: incident.findFirst before first appendProofEventInTx
    expect(callOrder[0]).toBe("incident.findFirst");
    expect(callOrder[1]).toBe("appendProofEventInTx");

    // Lifecycle transition — source is the typed TransitionSource "operator"
    expect(mockPerformLifecycleTransitionInTx).toHaveBeenCalledWith(
      "inst_1",
      "EDGE_AT_RISK",
      "LIVE_MONITORING",
      "operator_override",
      "operator"
    );

    // OVERRIDE_APPLIED proof includes incidentId, suppressedUntil, overrideSuppressionMinutes
    expect(mockAppendProofEventInTx).toHaveBeenCalledWith(
      "strat_1",
      "OVERRIDE_APPLIED",
      expect.objectContaining({
        appliedBy: "operator_bob",
        incidentId: "inc_1",
        suppressedUntil: expect.any(String),
        overrideSuppressionMinutes: 10,
      })
    );

    // INCIDENT_CLOSED proof includes closedBy
    expect(mockAppendProofEventInTx).toHaveBeenCalledWith(
      "strat_1",
      "INCIDENT_CLOSED",
      expect.objectContaining({
        closedBy: "operator_bob",
        closeReason: "OVERRIDE_APPLIED",
      })
    );

    // Incident was closed with OVERRIDE_APPLIED reason and closedBy
    expect(mockIncidentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "CLOSED",
          closeReason: "OVERRIDE_APPLIED",
          closedBy: "operator_bob",
        }),
      })
    );

    // monitoringSuppressedUntil set on LiveEAInstance
    expect(mockLiveEAInstanceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          operatorHold: "NONE",
          monitoringSuppressedUntil: expect.any(Date),
        }),
      })
    );

    // Alert outbox includes recordId, operatorId, incidentId, suppressedUntil
    expect(mockAlertOutboxCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: "override_applied",
          payload: expect.objectContaining({
            recordId: "rec_abc",
            operatorId: "operator_bob",
            incidentId: "inc_1",
            suppressedUntil: expect.any(String),
          }),
        }),
      })
    );
  });

  // Test 7: Happy apply without open incident
  it("happy apply: no open incident (should not fail), proof payload has incidentId: null", async () => {
    mockIncidentFindFirst.mockResolvedValue(null);

    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody(), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(mockIncidentUpdate).not.toHaveBeenCalled();

    // OVERRIDE_APPLIED proof payload has incidentId: null
    expect(mockAppendProofEventInTx).toHaveBeenCalledWith(
      "strat_1",
      "OVERRIDE_APPLIED",
      expect.objectContaining({ incidentId: null })
    );
  });

  // Test 8: Fail-closed
  it("fail-closed: appendProofEventInTx throws -> no lifecycle mutation (500)", async () => {
    mockAppendProofEventInTx.mockRejectedValue(new Error("Serialization failure"));

    mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        overrideRequest: {
          update: (...args: unknown[]) => mockOverrideRequestUpdate(...args),
        },
        liveEAInstance: {
          update: (...args: unknown[]) => mockLiveEAInstanceUpdate(...args),
        },
        incident: {
          findFirst: (...args: unknown[]) => mockIncidentFindFirst(...args),
          update: (...args: unknown[]) => mockIncidentUpdate(...args),
        },
        alertOutbox: {
          create: (...args: unknown[]) => mockAlertOutboxCreate(...args),
        },
      };
      return fn(tx);
    });

    const { POST } = await import("./route");
    const res = await POST(makeRequest(validBody(), TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.code).toBe("INTERNAL_ERROR");
    expect(mockPerformLifecycleTransitionInTx).not.toHaveBeenCalled();
    expect(mockOverrideRequestUpdate).not.toHaveBeenCalled();
    expect(mockLiveEAInstanceUpdate).not.toHaveBeenCalled();
  });
});
