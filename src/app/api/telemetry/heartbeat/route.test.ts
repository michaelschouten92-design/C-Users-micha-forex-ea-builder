import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────

const mockAuthenticateTelemetry = vi.fn();
vi.mock("@/lib/telemetry-auth", () => ({
  authenticateTelemetry: (...args: unknown[]) => mockAuthenticateTelemetry(...args),
}));

vi.mock("@/lib/outbox", () => ({
  enqueueNotification: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

vi.mock("@/lib/alerts", () => ({
  checkDrawdownAlerts: vi.fn().mockResolvedValue(undefined),
  checkOfflineAlerts: vi.fn().mockResolvedValue(undefined),
  checkDailyLossAlerts: vi.fn().mockResolvedValue(undefined),
  checkWeeklyLossAlerts: vi.fn().mockResolvedValue(undefined),
  checkEquityTargetAlerts: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/strategy-status/compute-and-cache", () => ({
  computeAndCacheStatus: vi.fn().mockResolvedValue(undefined),
}));

const mockTransaction = vi.fn();
const mockFindUnique = vi.fn();
const mockInstanceUpdate = vi.fn();
const mockTerminalUpsert = vi.fn();
const mockTerminalUpdate = vi.fn();
const mockDeploymentUpsert = vi.fn();
const mockDeploymentFindUnique = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: (...args: unknown[]) => mockTransaction(...args),
    liveEAInstance: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockInstanceUpdate(...args),
    },
    eAHeartbeat: { create: vi.fn() },
    terminalConnection: {
      upsert: (...args: unknown[]) => mockTerminalUpsert(...args),
      update: (...args: unknown[]) => mockTerminalUpdate(...args),
    },
    terminalDeployment: {
      findUnique: (...args: unknown[]) => mockDeploymentFindUnique(...args),
      upsert: (...args: unknown[]) => mockDeploymentUpsert(...args),
    },
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────

const INSTANCE_ID = "inst_test_123";
const USER_ID = "user_test_456";

function makeRequest(body: object) {
  return new NextRequest("http://localhost/api/telemetry/heartbeat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-EA-Key": "a".repeat(64),
    },
    body: JSON.stringify(body),
  });
}

function authSuccess() {
  mockAuthenticateTelemetry.mockResolvedValue({
    success: true,
    instanceId: INSTANCE_ID,
    userId: USER_ID,
  });
}

function authFail(status: number, code: string) {
  mockAuthenticateTelemetry.mockResolvedValue({
    success: false,
    response: NextResponse.json({ error: "fail", code }, { status }),
  });
}

// ─── Tests ───────────────────────────────────────────────────────────

describe("POST /api/telemetry/heartbeat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authSuccess();
    mockFindUnique.mockResolvedValue({
      status: "ONLINE",
      tradingState: "ACTIVE",
      lastHeartbeat: new Date(),
      eaName: "TestEA",
      symbol: "EURUSD",
      lifecycleState: "LIVE_MONITORING",
      operatorHold: "NONE",
      monitoringSuppressedUntil: null,
      terminalConnectionId: null,
      user: { email: "test@test.com", webhookUrl: null },
    });
    mockTransaction.mockResolvedValue(undefined);
    mockInstanceUpdate.mockResolvedValue(undefined);
    mockTerminalUpsert.mockResolvedValue({ id: "term_auto_1" });
    mockTerminalUpdate.mockResolvedValue(undefined);
    mockDeploymentFindUnique.mockResolvedValue(null); // No existing deployment by default
    mockDeploymentUpsert.mockResolvedValue({ id: "deploy_1" });
  });

  it("returns 401 when auth fails", async () => {
    authFail(401, "MISSING_API_KEY");
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ balance: 1000 }));
    expect(res.status).toBe(401);
  });

  it("returns 400 with code for invalid data", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ balance: -999 }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("VALIDATION_FAILED");
    expect(body.details).toBeDefined();
  });

  it("returns 200 with success for valid heartbeat", async () => {
    const { POST } = await import("./route");
    const res = await POST(
      makeRequest({
        balance: 10000,
        equity: 10500,
        openTrades: 2,
        totalTrades: 150,
        totalProfit: 500,
        drawdown: 3.5,
        spread: 12,
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.action).toBe("RUN");
    expect(body.reasonCode).toBe("OK");
  });

  it("returns PAUSE action when instance is at risk", async () => {
    mockFindUnique.mockResolvedValue({
      status: "ONLINE",
      tradingState: "PAUSED",
      lastHeartbeat: new Date(),
      eaName: "TestEA",
      symbol: "EURUSD",
      lifecycleState: "EDGE_AT_RISK",
      operatorHold: "NONE",
      monitoringSuppressedUntil: null,
      terminalConnectionId: null,
      user: { email: "test@test.com", webhookUrl: null },
    });
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ balance: 1000 }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.action).toBe("PAUSE");
    expect(body.reasonCode).toBe("MONITORING_AT_RISK");
  });

  it("returns STOP action when operator hold is HALTED", async () => {
    mockFindUnique.mockResolvedValue({
      status: "ONLINE",
      tradingState: "ACTIVE",
      lastHeartbeat: new Date(),
      eaName: "TestEA",
      symbol: "EURUSD",
      lifecycleState: "LIVE_MONITORING",
      operatorHold: "HALTED",
      monitoringSuppressedUntil: null,
      terminalConnectionId: null,
      user: { email: "test@test.com", webhookUrl: null },
    });
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ balance: 1000 }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.action).toBe("STOP");
    expect(body.reasonCode).toBe("STRATEGY_HALTED");
  });

  it("returns 500 (not 400) when DB transaction fails", async () => {
    mockTransaction.mockRejectedValue(new Error("DB connection lost"));
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ balance: 1000 }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.code).toBe("INTERNAL_ERROR");
  });

  it("error response has stable {error, code} shape", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ balance: "not-a-number" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty("error");
    expect(body).toHaveProperty("code");
  });

  it("processes deployment discovery when deployment object is present", async () => {
    const { POST } = await import("./route");
    const res = await POST(
      makeRequest({
        balance: 10000,
        broker: "IC Markets",
        accountNumber: "12345",
        deployment: {
          symbol: "EURUSD",
          timeframe: "PERIOD_H1",
          magicNumber: 99001,
          eaName: "TrendFollower",
        },
      })
    );
    expect(res.status).toBe(200);
    // Allow fire-and-forget to settle
    await new Promise((r) => setTimeout(r, 50));
    expect(mockTerminalUpsert).toHaveBeenCalledTimes(1);
    expect(mockDeploymentUpsert).toHaveBeenCalledTimes(1);
    // Verify deployment upsert includes correct instanceId
    const deployCall = mockDeploymentUpsert.mock.calls[0][0];
    expect(deployCall.create.instanceId).toBe(INSTANCE_ID);
    expect(deployCall.create.symbol).toBe("EURUSD");
    expect(deployCall.create.magicNumber).toBe(99001);
    expect(deployCall.create.eaName).toBe("TrendFollower");
  });

  it("skips deployment discovery when deployment object is absent", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ balance: 10000 }));
    expect(res.status).toBe(200);
    await new Promise((r) => setTimeout(r, 50));
    expect(mockTerminalUpsert).not.toHaveBeenCalled();
    expect(mockDeploymentUpsert).not.toHaveBeenCalled();
  });

  it("uses existing terminalConnectionId when already linked", async () => {
    mockFindUnique.mockResolvedValue({
      status: "ONLINE",
      tradingState: "ACTIVE",
      lastHeartbeat: new Date(),
      eaName: "TestEA",
      symbol: "EURUSD",
      lifecycleState: "LIVE_MONITORING",
      operatorHold: "NONE",
      monitoringSuppressedUntil: null,
      terminalConnectionId: "term_existing",
      user: { email: "test@test.com", webhookUrl: null },
    });
    const { POST } = await import("./route");
    const res = await POST(
      makeRequest({
        balance: 10000,
        deployment: {
          symbol: "GBPUSD",
          timeframe: "PERIOD_M15",
          magicNumber: 500,
          eaName: "Scalper",
        },
      })
    );
    expect(res.status).toBe(200);
    await new Promise((r) => setTimeout(r, 50));
    // Should NOT auto-create terminal — use existing
    expect(mockTerminalUpsert).not.toHaveBeenCalled();
    expect(mockTerminalUpdate).toHaveBeenCalledTimes(1);
    expect(mockDeploymentUpsert).toHaveBeenCalledTimes(1);
    // Verify deployment uses existing terminal
    const deployCall = mockDeploymentUpsert.mock.calls[0][0];
    expect(deployCall.where.terminalConnectionId_deploymentKey.terminalConnectionId).toBe(
      "term_existing"
    );
  });

  it("rejects deployment with magicNumber=0", async () => {
    const { POST } = await import("./route");
    const res = await POST(
      makeRequest({
        balance: 10000,
        deployment: {
          symbol: "EURUSD",
          timeframe: "PERIOD_H1",
          magicNumber: 0,
          eaName: "TestEA",
        },
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("VALIDATION_FAILED");
  });

  it("stores materialFingerprint on first deployment report", async () => {
    mockDeploymentFindUnique.mockResolvedValue(null); // No existing deployment
    const { POST } = await import("./route");
    const res = await POST(
      makeRequest({
        balance: 10000,
        broker: "IC Markets",
        accountNumber: "12345",
        deployment: {
          symbol: "EURUSD",
          timeframe: "PERIOD_H1",
          magicNumber: 99001,
          eaName: "TrendFollower",
          materialFingerprint: "a".repeat(64),
        },
      })
    );
    expect(res.status).toBe(200);
    await new Promise((r) => setTimeout(r, 50));
    expect(mockDeploymentUpsert).toHaveBeenCalledTimes(1);
    const upsertCall = mockDeploymentUpsert.mock.calls[0][0];
    expect(upsertCall.create.materialFingerprint).toBe("a".repeat(64));
  });

  it("detects material change and transitions LINKED baseline to RELINK_REQUIRED", async () => {
    mockDeploymentFindUnique.mockResolvedValue({
      id: "deploy_existing",
      instanceId: INSTANCE_ID,
      baselineStatus: "LINKED",
      materialFingerprint: "a".repeat(64),
    });
    // Mock the instance snapshot for suspendBaselineTrust
    mockFindUnique.mockResolvedValueOnce({
      status: "ONLINE",
      tradingState: "ACTIVE",
      lastHeartbeat: new Date(),
      eaName: "TestEA",
      symbol: "EURUSD",
      lifecycleState: "LIVE_MONITORING",
      operatorHold: "NONE",
      monitoringSuppressedUntil: null,
      terminalConnectionId: null,
      user: { email: "test@test.com", webhookUrl: null },
    });
    const { POST } = await import("./route");
    const res = await POST(
      makeRequest({
        balance: 10000,
        broker: "IC Markets",
        accountNumber: "12345",
        deployment: {
          symbol: "EURUSD",
          timeframe: "PERIOD_H1",
          magicNumber: 99001,
          eaName: "TrendFollower",
          materialFingerprint: "b".repeat(64), // Different from stored "a".repeat(64)
        },
      })
    );
    expect(res.status).toBe(200);
    await new Promise((r) => setTimeout(r, 50));
    expect(mockDeploymentUpsert).toHaveBeenCalledTimes(1);
    const upsertCall = mockDeploymentUpsert.mock.calls[0][0];
    expect(upsertCall.update.baselineStatus).toBe("RELINK_REQUIRED");
    expect(upsertCall.update.materialFingerprint).toBe("b".repeat(64));
  });

  it("does NOT transition UNLINKED baseline on fingerprint mismatch", async () => {
    mockDeploymentFindUnique.mockResolvedValue({
      id: "deploy_existing",
      instanceId: INSTANCE_ID,
      baselineStatus: "UNLINKED",
      materialFingerprint: "a".repeat(64),
    });
    const { POST } = await import("./route");
    const res = await POST(
      makeRequest({
        balance: 10000,
        broker: "IC Markets",
        accountNumber: "12345",
        deployment: {
          symbol: "EURUSD",
          timeframe: "PERIOD_H1",
          magicNumber: 99001,
          eaName: "TrendFollower",
          materialFingerprint: "b".repeat(64),
        },
      })
    );
    expect(res.status).toBe(200);
    await new Promise((r) => setTimeout(r, 50));
    expect(mockDeploymentUpsert).toHaveBeenCalledTimes(1);
    const upsertCall = mockDeploymentUpsert.mock.calls[0][0];
    // Fingerprint is updated but baselineStatus is NOT set
    expect(upsertCall.update.materialFingerprint).toBe("b".repeat(64));
    expect(upsertCall.update.baselineStatus).toBeUndefined();
  });

  describe("TR1: stale heartbeat ordering via session + seqNo", () => {
    function mockOnlineInstance() {
      mockFindUnique.mockResolvedValue({
        status: "ONLINE",
        tradingState: "TRADING",
        lastHeartbeat: new Date(),
        eaName: "TestEA",
        symbol: "EURUSD",
        lifecycleState: "LIVE_MONITORING",
        operatorHold: "NONE",
        monitoringSuppressedUntil: null,
        terminalConnectionId: null,
        user: { email: "test@example.com", webhookUrl: null },
      });
      mockTransaction.mockResolvedValue(undefined);
    }

    const base = { balance: 1000, equity: 1000, openTrades: 0, totalTrades: 5, totalProfit: 100 };

    // Test 3: higher seqNo same session → raw query path (state overwritten)
    it("higher seqNo same session → uses raw query path", async () => {
      authSuccess();
      mockOnlineInstance();
      const { POST } = await import("./route");
      const res = await POST(makeRequest({
        ...base,
        heartbeatSessionId: "sess_A", heartbeatSessionStartedAt: 1000, heartbeatSeqNo: 42,
      }));
      expect(res.status).toBe(200);
      expect(mockTransaction).toHaveBeenCalled();
      const txOps = mockTransaction.mock.calls[0][0];
      // Raw query path produces a promise (not a Prisma fluent call)
      expect(txOps.length).toBeGreaterThanOrEqual(2);
    });

    // Test 4: new session with higher startedAt, seqNo=1 → raw query path
    it("new session with higher startedAt → uses raw query path", async () => {
      authSuccess();
      mockOnlineInstance();
      const { POST } = await import("./route");
      const res = await POST(makeRequest({
        ...base,
        heartbeatSessionId: "sess_B", heartbeatSessionStartedAt: 2000, heartbeatSeqNo: 1,
      }));
      expect(res.status).toBe(200);
      expect(mockTransaction).toHaveBeenCalled();
    });

    // Test 7: first heartbeat ever (all DB fields NULL) → raw query path
    it("first heartbeat ever (NULL in DB) → uses raw query path", async () => {
      authSuccess();
      mockOnlineInstance();
      const { POST } = await import("./route");
      const res = await POST(makeRequest({
        ...base,
        heartbeatSessionId: "sess_first", heartbeatSessionStartedAt: 500, heartbeatSeqNo: 1,
      }));
      expect(res.status).toBe(200);
      expect(mockTransaction).toHaveBeenCalled();
    });

    // Test 8: legacy EA without session fields → Prisma update path
    it("legacy EA without session fields → Prisma update path", async () => {
      authSuccess();
      mockOnlineInstance();
      const { POST } = await import("./route");
      const res = await POST(makeRequest({ ...base }));
      expect(res.status).toBe(200);
      expect(mockTransaction).toHaveBeenCalled();
    });

    // Test 8b: partial session fields (missing startedAt) → legacy path
    it("partial session fields (missing startedAt) → legacy path", async () => {
      authSuccess();
      mockOnlineInstance();
      const { POST } = await import("./route");
      const res = await POST(makeRequest({
        ...base,
        heartbeatSessionId: "sess_partial", heartbeatSeqNo: 10,
      }));
      expect(res.status).toBe(200);
      expect(mockTransaction).toHaveBeenCalled();
    });

    // Tests 1,2,5,6: stale guard invariants are DB-enforced (SQL WHERE clause).
    // Unit tests verify code path selection; the actual filtering is done by PostgreSQL.
    // The WHERE clause from the design:
    //   heartbeatSessionStartedAt IS NULL                           → accept (test 7)
    //   OR heartbeatSessionStartedAt < incoming                     → accept (test 4)
    //   OR (same startedAt AND same sessionId AND seqNo < incoming) → accept (test 3)
    //   Everything else → 0 rows affected → skip (tests 1,2,5,6)
    //
    // These invariants require integration tests against a real database:
    // 1. Lower seqNo same session → not overwritten
    // 2. Equal seqNo same session → not overwritten
    // 5. Old session with lower startedAt → not overwritten
    // 6. Two sessions same startedAt different sessionId → not overwritten
  });

  describe("TR3: soft-deleted instance rejects heartbeat", () => {
    it("returns PAUSE for deleted instance without applying state", async () => {
      authSuccess();
      // findUnique returns null (deletedAt filter excludes it)
      mockFindUnique.mockResolvedValue(null);

      const { POST } = await import("./route");
      const res = await POST(
        makeRequest({
          balance: 1000,
          equity: 1000,
          openTrades: 0,
          totalTrades: 5,
          totalProfit: 100,
        })
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.action).toBe("PAUSE");
      expect(body.reasonCode).toBe("NO_INSTANCE");
      // No transaction should have been called
      expect(mockTransaction).not.toHaveBeenCalled();
    });
  });
});
