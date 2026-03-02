import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const TEST_API_KEY = "test-internal-api-key-that-is-at-least-32-chars";

const mockAppendProofEventInTx = vi.fn();
const mockLiveEAInstanceFindFirst = vi.fn();
const mockLiveEAInstanceUpdate = vi.fn();
const mockTransaction = vi.fn();
const mockIncidentFindMany = vi.fn();
const mockIncidentUpdateMany = vi.fn();
const mockIncidentUpdate = vi.fn();
const mockIncidentCount = vi.fn();
const mockAlertOutboxCreate = vi.fn();

vi.mock("@/lib/csrf", () => ({
  timingSafeEqual: (a: string, b: string) => a === b,
}));

const mockCheckRateLimit = vi.fn();

vi.mock("@/lib/rate-limit", () => ({
  internalIncidentProcessRateLimiter: {},
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getClientIp: () => "127.0.0.1",
  createRateLimitHeaders: vi.fn().mockReturnValue({}),
  formatRateLimitError: vi.fn().mockReturnValue("Rate limit exceeded. Try again in 60 seconds."),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: (...args: unknown[]) => mockTransaction(...args),
    incident: {
      findMany: (...args: unknown[]) => mockIncidentFindMany(...args),
      updateMany: (...args: unknown[]) => mockIncidentUpdateMany(...args),
      update: (...args: unknown[]) => mockIncidentUpdate(...args),
      count: (...args: unknown[]) => mockIncidentCount(...args),
    },
  },
}));

vi.mock("@/lib/proof/events", () => ({
  appendProofEventInTx: (_tx: unknown, ...args: unknown[]) => mockAppendProofEventInTx(...args),
}));

vi.mock("@/lib/strategy-lifecycle/transition-service", () => ({
  performLifecycleTransitionInTx: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  },
}));

function makeRequest(body?: object, apiKey?: string, method = "POST") {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers["x-internal-api-key"] = apiKey;
  }

  if (method === "GET") {
    return new NextRequest("http://localhost/api/internal/incidents/process", {
      method: "GET",
      headers,
    });
  }

  return new NextRequest("http://localhost/api/internal/incidents/process", {
    method: "POST",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

const PAST = new Date(Date.now() - 60_000);
const FUTURE = new Date(Date.now() + 3_600_000);

function makeIncident(overrides: Record<string, unknown> = {}) {
  return {
    id: "inc_1",
    strategyId: "strat_1",
    status: "OPEN",
    severity: "AT_RISK",
    triggerRecordId: "rec_abc",
    escalationCount: 0,
    ackDeadlineAt: PAST,
    invalidateDeadlineAt: null,
    lastEscalatedAt: null,
    ...overrides,
  };
}

describe("POST /api/internal/incidents/process", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INTERNAL_API_KEY = TEST_API_KEY;
    mockCheckRateLimit.mockResolvedValue({
      success: true,
      limit: 5,
      remaining: 4,
      resetAt: new Date(),
    });
    mockIncidentFindMany.mockResolvedValue([]);
    mockAppendProofEventInTx.mockResolvedValue({ sequence: 1, eventHash: "eh_1" });
  });

  it("rejects requests without API key (401)", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockResolvedValueOnce({
      success: false,
      limit: 5,
      remaining: 0,
      resetAt: new Date(Date.now() + 60_000),
    });
    const { POST } = await import("./route");
    const res = await POST(makeRequest({}, TEST_API_KEY));
    const json = await res.json();
    expect(res.status).toBe(429);
    expect(json.code).toBe("RATE_LIMITED");
  });

  it("invalid JSON returns 400", async () => {
    const { POST } = await import("./route");
    const req = new NextRequest("http://localhost/api/internal/incidents/process", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-api-key": TEST_API_KEY,
      },
      body: "not-json{",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("invalid limit returns 400", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ limit: 999 }, TEST_API_KEY));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.code).toBe("VALIDATION_FAILED");
  });

  it("returns zeros when no incidents overdue", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest({}, TEST_API_KEY));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toEqual({ escalated: 0, autoInvalidated: 0, errors: [] });
  });

  it("escalates OPEN incident past ACK deadline", async () => {
    const incident = makeIncident();
    // First call = escalation pass, second call = auto-invalidation pass
    mockIncidentFindMany.mockResolvedValueOnce([incident]).mockResolvedValueOnce([]);

    // Optimistic lock succeeds
    mockIncidentUpdateMany.mockResolvedValue({ count: 1 });

    // $transaction executes callback
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        incident: {
          update: (...args: unknown[]) => mockIncidentUpdate(...args),
        },
        alertOutbox: {
          create: (...args: unknown[]) => mockAlertOutboxCreate(...args),
        },
        proofEventLog: {},
      };
      return fn(tx);
    });

    const { POST } = await import("./route");
    const res = await POST(makeRequest({}, TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.escalated).toBe(1);
    expect(json.autoInvalidated).toBe(0);
    expect(json.errors).toEqual([]);

    // Proof event written
    expect(mockAppendProofEventInTx).toHaveBeenCalledWith(
      "strat_1",
      "INCIDENT_ESCALATED",
      expect.objectContaining({
        eventType: "INCIDENT_ESCALATED",
        incidentId: "inc_1",
        escalationCount: 1,
      })
    );

    // Incident updated to ESCALATED
    expect(mockIncidentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "inc_1" },
        data: expect.objectContaining({
          status: "ESCALATED",
          escalationCount: 1,
        }),
      })
    );

    // Alert enqueued
    expect(mockAlertOutboxCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: "incident_escalated",
          dedupeKey: "incident_escalated:inc_1:1",
        }),
      })
    );
  });

  it("optimistic lock prevents double-escalation", async () => {
    const incident = makeIncident();
    mockIncidentFindMany.mockResolvedValueOnce([incident]).mockResolvedValueOnce([]);

    // Optimistic lock fails — another processor already took it
    mockIncidentUpdateMany.mockResolvedValue({ count: 0 });

    const { POST } = await import("./route");
    const res = await POST(makeRequest({}, TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.escalated).toBe(0);
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("auto-invalidates ESCALATED incident past invalidate deadline", async () => {
    const incident = makeIncident({
      id: "inc_2",
      status: "ESCALATED",
      invalidateDeadlineAt: PAST,
      escalationCount: 1,
    });

    // First call = escalation pass (empty), second call = auto-invalidation pass
    mockIncidentFindMany.mockResolvedValueOnce([]).mockResolvedValueOnce([incident]);

    mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        liveEAInstance: {
          findFirst: (...args: unknown[]) => mockLiveEAInstanceFindFirst(...args),
          update: (...args: unknown[]) => mockLiveEAInstanceUpdate(...args),
        },
        incident: {
          update: (...args: unknown[]) => mockIncidentUpdate(...args),
        },
        alertOutbox: {
          create: (...args: unknown[]) => mockAlertOutboxCreate(...args),
        },
        proofEventLog: {},
      };
      return fn(tx);
    });

    mockLiveEAInstanceFindFirst.mockResolvedValue({
      id: "inst_1",
      lifecycleState: "EDGE_AT_RISK",
    });

    const { performLifecycleTransitionInTx } =
      await import("@/lib/strategy-lifecycle/transition-service");

    const { POST } = await import("./route");
    const res = await POST(makeRequest({}, TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.autoInvalidated).toBe(1);
    expect(json.errors).toEqual([]);

    // Proof events written (INCIDENT_AUTO_INVALIDATED + STRATEGY_INVALIDATED)
    expect(mockAppendProofEventInTx).toHaveBeenCalledWith(
      "strat_1",
      "INCIDENT_AUTO_INVALIDATED",
      expect.objectContaining({
        eventType: "INCIDENT_AUTO_INVALIDATED",
        incidentId: "inc_2",
      })
    );
    expect(mockAppendProofEventInTx).toHaveBeenCalledWith(
      "strat_1",
      "STRATEGY_INVALIDATED",
      expect.objectContaining({
        eventType: "STRATEGY_INVALIDATED",
        reason: "auto_invalidated: deadline exceeded",
        source: "system",
      })
    );

    // Lifecycle transition called
    expect(performLifecycleTransitionInTx).toHaveBeenCalledWith(
      expect.anything(),
      "inst_1",
      "EDGE_AT_RISK",
      "INVALIDATED",
      "auto_invalidated: deadline exceeded",
      "system"
    );

    // Proof-first: both proof events must precede lifecycle mutation
    const proofCallOrders = mockAppendProofEventInTx.mock.invocationCallOrder;
    const lifecycleCallOrders = (performLifecycleTransitionInTx as ReturnType<typeof vi.fn>).mock
      .invocationCallOrder;
    expect(Math.max(...proofCallOrders)).toBeLessThan(Math.min(...lifecycleCallOrders));

    // Incident closed
    expect(mockIncidentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "inc_2" },
        data: expect.objectContaining({
          status: "CLOSED",
          closeReason: "AUTO_INVALIDATED",
        }),
      })
    );

    // Alert enqueued
    expect(mockAlertOutboxCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: "incident_auto_invalidated",
          dedupeKey: "incident_auto_invalidated:inc_2",
        }),
      })
    );
  });

  it("skips auto-invalidation when instance not in EDGE_AT_RISK", async () => {
    const incident = makeIncident({
      status: "OPEN",
      invalidateDeadlineAt: PAST,
    });

    mockIncidentFindMany.mockResolvedValueOnce([]).mockResolvedValueOnce([incident]);

    mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        liveEAInstance: {
          findFirst: (...args: unknown[]) => mockLiveEAInstanceFindFirst(...args),
          update: (...args: unknown[]) => mockLiveEAInstanceUpdate(...args),
        },
        incident: {
          update: (...args: unknown[]) => mockIncidentUpdate(...args),
        },
        alertOutbox: {
          create: (...args: unknown[]) => mockAlertOutboxCreate(...args),
        },
        proofEventLog: {},
      };
      return fn(tx);
    });

    // Instance already recovered
    mockLiveEAInstanceFindFirst.mockResolvedValue({
      id: "inst_1",
      lifecycleState: "LIVE_MONITORING",
    });

    const { POST } = await import("./route");
    const res = await POST(makeRequest({}, TEST_API_KEY));
    const json = await res.json();

    // The tx callback returns without throwing, so autoInvalidated stays 0
    // (no incident update, no lifecycle transition)
    expect(res.status).toBe(200);
    expect(json.autoInvalidated).toBe(0);
    expect(mockIncidentUpdate).not.toHaveBeenCalled();
  });

  it("escalation failure reports error and rolls back optimistic lock", async () => {
    const incident = makeIncident();
    mockIncidentFindMany.mockResolvedValueOnce([incident]).mockResolvedValueOnce([]);

    mockIncidentUpdateMany
      .mockResolvedValueOnce({ count: 1 }) // optimistic lock succeeds
      .mockResolvedValueOnce({ count: 1 }); // rollback

    mockTransaction.mockRejectedValue(new Error("DB write failed"));

    const { POST } = await import("./route");
    const res = await POST(makeRequest({}, TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.escalated).toBe(0);
    expect(json.errors).toHaveLength(1);
    expect(json.errors[0]).toContain("escalate:inc_1");

    // Optimistic lock rolled back
    expect(mockIncidentUpdateMany).toHaveBeenCalledWith({
      where: { id: "inc_1", status: "ESCALATING" },
      data: { status: "OPEN" },
    });
  });
});

describe("GET /api/internal/incidents/process", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INTERNAL_API_KEY = TEST_API_KEY;
  });

  it("rejects requests without API key (401)", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeRequest(undefined, undefined, "GET"));
    expect(res.status).toBe(401);
  });

  it("returns incident counts", async () => {
    mockIncidentCount
      .mockResolvedValueOnce(3) // open
      .mockResolvedValueOnce(1) // acknowledged
      .mockResolvedValueOnce(2) // escalated
      .mockResolvedValueOnce(1); // overdueAck

    const { GET } = await import("./route");
    const res = await GET(makeRequest(undefined, TEST_API_KEY, "GET"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({
      open: 3,
      acknowledged: 1,
      escalated: 2,
      overdueAck: 1,
    });
  });
});
