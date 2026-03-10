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
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: (...args: unknown[]) => mockTransaction(...args),
    liveEAInstance: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: vi.fn(),
    },
    eAHeartbeat: { create: vi.fn() },
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
      user: { email: "test@test.com", webhookUrl: null },
    });
    mockTransaction.mockResolvedValue(undefined);
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
});
