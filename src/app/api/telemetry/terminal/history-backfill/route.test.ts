import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────

const mockAuthenticateTelemetry = vi.fn();
vi.mock("@/lib/telemetry-auth", () => ({
  authenticateTelemetry: (...args: unknown[]) => mockAuthenticateTelemetry(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  },
}));

const mockFindMany = vi.fn();
const mockGroupBy = vi.fn();
const mockUpsert = vi.fn().mockResolvedValue({});
const mockDeploymentFindFirst = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    liveEAInstance: { findMany: (...a: unknown[]) => mockFindMany(...a) },
    eATrade: {
      groupBy: (...a: unknown[]) => mockGroupBy(...a),
      upsert: (...a: unknown[]) => mockUpsert(...a),
    },
    terminalDeployment: {
      findFirst: (...a: unknown[]) => mockDeploymentFindFirst(...a),
    },
  },
}));

const mockResolveAttribution = vi
  .fn()
  .mockResolvedValue({ terminalDeploymentId: null, reason: "no_match" });
vi.mock("@/lib/deployment/trade-attribution", () => ({
  resolveTradeDeploymentAttribution: (...a: unknown[]) => mockResolveAttribution(...a),
}));

// ─── Helpers ─────────────────────────────────────────────────────────

const BASE_ID = "inst_base_monitor";
const CHILD_ID = "inst_child_usdjpy";
const USER_ID = "user_test";

const VALID_TRADE = {
  ticket: "700123",
  symbol: "USDJPY",
  type: "SELL" as const,
  openPrice: 150.25,
  closePrice: 150.1,
  lots: 0.1,
  profit: 15.0,
  openTime: 1700000000,
  closeTime: 1700003600,
  magicNumber: 42,
};

function authSuccess() {
  mockAuthenticateTelemetry.mockResolvedValue({
    success: true,
    instanceId: BASE_ID,
    userId: USER_ID,
  });
}

function makeRequest(body: object | string) {
  return new NextRequest("http://localhost/api/telemetry/terminal/history-backfill", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-EA-Key": "a".repeat(64),
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  authSuccess();
  mockFindMany.mockResolvedValue([
    { id: BASE_ID, symbol: null, lifecycleState: "ACTIVE" },
    { id: CHILD_ID, symbol: "USDJPY", lifecycleState: "ACTIVE" },
  ]);
  mockGroupBy.mockResolvedValue([]);
  mockDeploymentFindFirst.mockResolvedValue({ instanceId: CHILD_ID });
});

// ─── Tests ────────────────────────────────────────────────────────────

describe("POST /api/telemetry/terminal/history-backfill", () => {
  it("rejects unauthenticated requests", async () => {
    mockAuthenticateTelemetry.mockResolvedValue({
      success: false,
      response: new Response("unauth", { status: 401 }),
    });
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ trades: [VALID_TRADE] }));
    expect(res.status).toBe(401);
  });

  it("rejects malformed JSON", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest("{ broken"));
    expect(res.status).toBe(400);
  });

  it("rejects empty trade arrays", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ trades: [] }));
    expect(res.status).toBe(400);
  });

  it("rejects batches over 50 trades", async () => {
    const { POST } = await import("./route");
    const trades = Array(51).fill(VALID_TRADE);
    const res = await POST(makeRequest({ trades }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when monitor owns no instances", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ trades: [VALID_TRADE] }));
    expect(res.status).toBe(404);
  });

  it("writes a trade that resolves to an owned child instance", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ trades: [VALID_TRADE] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.accepted).toBe(1);
    expect(body.rejected).toBe(0);

    const call = mockUpsert.mock.calls[0][0];
    expect(call.where.instanceId_ticket).toEqual({
      instanceId: CHILD_ID,
      ticket: "700123",
    });
    expect(call.create).toMatchObject({
      instanceId: CHILD_ID,
      ticket: "700123",
      symbol: "USDJPY",
      type: "SELL",
      profit: 15,
      magicNumber: 42,
    });
    // Idempotent: no live fields should be clobbered on re-run.
    expect(call.update).toEqual({});
  });

  it("skips trades whose (symbol, magic) has no matching deployment", async () => {
    mockDeploymentFindFirst.mockResolvedValueOnce(null);
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ trades: [VALID_TRADE] }));
    const body = await res.json();
    expect(body.accepted).toBe(0);
    expect(body.rejected).toBe(1);
    expect(body.results[0].reason).toContain("no owned deployment");
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("skips when deployment points at a non-owned instance (defense-in-depth)", async () => {
    mockDeploymentFindFirst.mockResolvedValueOnce({ instanceId: "inst_someone_else" });
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ trades: [VALID_TRADE] }));
    const body = await res.json();
    expect(body.accepted).toBe(0);
    expect(body.results[0].reason).toContain("deployment owner mismatch");
  });

  it("skips trades for invalidated instances", async () => {
    mockFindMany.mockResolvedValueOnce([
      { id: BASE_ID, symbol: null, lifecycleState: "ACTIVE" },
      { id: CHILD_ID, symbol: "USDJPY", lifecycleState: "INVALIDATED" },
    ]);
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ trades: [VALID_TRADE] }));
    const body = await res.json();
    expect(body.accepted).toBe(0);
    expect(body.results[0].reason).toContain("invalidated");
  });

  it("respects per-instance row cap (rejects when already at cap)", async () => {
    mockGroupBy.mockResolvedValueOnce([{ instanceId: CHILD_ID, _count: { id: 2000 } }]);
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ trades: [VALID_TRADE] }));
    const body = await res.json();
    expect(body.accepted).toBe(0);
    expect(body.results[0].reason).toContain("row cap");
  });

  it("uppercases symbols at ingest", async () => {
    const { POST } = await import("./route");
    await POST(makeRequest({ trades: [{ ...VALID_TRADE, symbol: "usdjpy" }] }));
    expect(mockUpsert.mock.calls[0][0].create.symbol).toBe("USDJPY");
  });

  it("isolates failures per trade (one bad trade doesn't poison batch)", async () => {
    // First trade resolves fine, second misses deployment.
    mockDeploymentFindFirst
      .mockResolvedValueOnce({ instanceId: CHILD_ID })
      .mockResolvedValueOnce(null);

    const trades = [
      VALID_TRADE,
      { ...VALID_TRADE, ticket: "700999", magicNumber: 99, symbol: "EURUSD" },
    ];
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ trades }));
    const body = await res.json();
    expect(body.accepted).toBe(1);
    expect(body.rejected).toBe(1);
    expect(mockUpsert).toHaveBeenCalledTimes(1);
  });

  it("never fires webhooks or alerts", async () => {
    // Sanity check: the route module must not import webhook/alert helpers.
    // A regression here would mean historical trades trigger "new trade!" spam.
    const mod = await import("./route");
    const src = mod.POST.toString();
    expect(src).not.toContain("fireWebhook");
    expect(src).not.toContain("checkNewTradeAlerts");
  });
});
