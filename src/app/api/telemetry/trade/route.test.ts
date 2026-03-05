import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────

const mockAuthenticateTelemetry = vi.fn();
vi.mock("@/lib/telemetry-auth", () => ({
  authenticateTelemetry: (...args: unknown[]) => mockAuthenticateTelemetry(...args),
}));

vi.mock("@/lib/webhook", () => ({
  fireWebhook: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/alerts", () => ({
  checkNewTradeAlerts: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  },
}));

const mockUpsert = vi.fn().mockResolvedValue({});
const mockFindUnique = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    eATrade: { upsert: (...args: unknown[]) => mockUpsert(...args) },
    liveEAInstance: { findUnique: (...args: unknown[]) => mockFindUnique(...args) },
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────

const INSTANCE_ID = "inst_test_123";
const USER_ID = "user_test_456";

const VALID_TRADE = {
  ticket: "12345",
  symbol: "EURUSD",
  type: "BUY",
  openPrice: 1.1234,
  lots: 0.1,
  profit: 50,
  openTime: "2026-01-01T00:00:00Z",
};

function makeRequest(body: object) {
  return new NextRequest("http://localhost/api/telemetry/trade", {
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

describe("POST /api/telemetry/trade", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authSuccess();
    mockFindUnique.mockResolvedValue({
      eaName: "TestEA",
      user: { webhookUrl: null },
    });
  });

  it("returns 401 when auth fails", async () => {
    authFail(401, "INVALID_API_KEY");
    const { POST } = await import("./route");
    const res = await POST(makeRequest(VALID_TRADE));
    expect(res.status).toBe(401);
  });

  it("returns 400 with code for invalid trade data", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ ticket: "123" })); // missing required fields
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("VALIDATION_FAILED");
    expect(body.details).toBeDefined();
  });

  it("returns 200 for valid trade", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest(VALID_TRADE));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("upserts trade with idempotent [instanceId, ticket]", async () => {
    const { POST } = await import("./route");
    await POST(makeRequest(VALID_TRADE));
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          instanceId_ticket: {
            instanceId: INSTANCE_ID,
            ticket: "12345",
          },
        },
      })
    );
  });

  it("returns 500 (not 400) when DB fails", async () => {
    mockUpsert.mockRejectedValue(new Error("DB connection lost"));
    const { POST } = await import("./route");
    const res = await POST(makeRequest(VALID_TRADE));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.code).toBe("INTERNAL_ERROR");
  });

  it("error response has stable {error, code} shape", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ invalid: true }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty("error");
    expect(body).toHaveProperty("code");
  });
});
