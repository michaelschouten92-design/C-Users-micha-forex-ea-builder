import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: () => mockAuth() }));

const mockFindFirst = vi.fn();
const mockTransaction = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    liveEAInstance: { findFirst: (...args: unknown[]) => mockFindFirst(...args) },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

const mockPerformTransition = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/strategy-lifecycle/transition-service", () => ({
  performLifecycleTransitionInTx: (...args: unknown[]) => mockPerformTransition(...args),
}));

const mockAppendProof = vi.fn().mockResolvedValue({ sequence: 1, eventHash: "abc" });
vi.mock("@/lib/proof/events", () => ({
  appendProofEventInTx: (...args: unknown[]) => mockAppendProof(...args),
}));

// ─── Helpers ─────────────────────────────────────────────────────────

const USER_ID = "user_test";
const INSTANCE_ID = "inst_test";

function makeRequest(body: object) {
  return new NextRequest(`http://localhost/api/live/${INSTANCE_ID}/lifecycle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function authSuccess() {
  mockAuth.mockResolvedValue({ user: { id: USER_ID } });
}

// ─── Tests ───────────────────────────────────────────────────────────

describe("POST /api/live/[instanceId]/lifecycle — activate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authSuccess();
    // Default: simulate a transaction that calls the callback
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const fakeTx = { liveEAInstance: { update: vi.fn().mockResolvedValue({}) } };
      return fn(fakeTx);
    });
  });

  it("activates DRAFT instance with linked baseline → LIVE_MONITORING", async () => {
    mockFindFirst.mockResolvedValue({
      id: INSTANCE_ID,
      lifecycleState: "DRAFT",
      lifecyclePhase: "NEW",
      strategyVersionId: "sv_linked",
      strategyVersion: { strategyIdentity: { strategyId: "strat_1" } },
    });

    const { POST } = await import("./route");
    const res = await POST(makeRequest({ action: "activate" }), {
      params: Promise.resolve({ instanceId: INSTANCE_ID }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.lifecycleState).toBe("LIVE_MONITORING");

    // Verify 3 transitions were called in order
    expect(mockPerformTransition).toHaveBeenCalledTimes(3);
    expect(mockPerformTransition.mock.calls[0]).toEqual(
      expect.arrayContaining(["DRAFT", "BACKTESTED", "auto-discovery activation", "operator"])
    );
    expect(mockPerformTransition.mock.calls[1]).toEqual(
      expect.arrayContaining(["BACKTESTED", "VERIFIED", "auto-discovery activation", "operator"])
    );
    expect(mockPerformTransition.mock.calls[2]).toEqual(
      expect.arrayContaining([
        "VERIFIED",
        "LIVE_MONITORING",
        "auto-discovery activation",
        "operator",
      ])
    );
  });

  it("rejects activation when no baseline is linked", async () => {
    mockFindFirst.mockResolvedValue({
      id: INSTANCE_ID,
      lifecycleState: "DRAFT",
      lifecyclePhase: "NEW",
      strategyVersionId: null, // no baseline
      strategyVersion: null,
    });

    const { POST } = await import("./route");
    const res = await POST(makeRequest({ action: "activate" }), {
      params: Promise.resolve({ instanceId: INSTANCE_ID }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("VALIDATION_FAILED");
    expect(body.error).toContain("baseline");
    expect(mockPerformTransition).not.toHaveBeenCalled();
  });

  it("rejects activation when lifecycleState is not DRAFT", async () => {
    mockFindFirst.mockResolvedValue({
      id: INSTANCE_ID,
      lifecycleState: "LIVE_MONITORING",
      lifecyclePhase: "PROVING",
      strategyVersionId: "sv_linked",
      strategyVersion: { strategyIdentity: { strategyId: "strat_1" } },
    });

    const { POST } = await import("./route");
    const res = await POST(makeRequest({ action: "activate" }), {
      params: Promise.resolve({ instanceId: INSTANCE_ID }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("VALIDATION_FAILED");
    expect(body.error).toContain("DRAFT");
    expect(mockPerformTransition).not.toHaveBeenCalled();
  });

  it("returns 500 when transaction fails", async () => {
    mockFindFirst.mockResolvedValue({
      id: INSTANCE_ID,
      lifecycleState: "DRAFT",
      lifecyclePhase: "NEW",
      strategyVersionId: "sv_linked",
      strategyVersion: { strategyIdentity: { strategyId: "strat_1" } },
    });
    mockTransaction.mockRejectedValue(new Error("DB error"));

    const { POST } = await import("./route");
    const res = await POST(makeRequest({ action: "activate" }), {
      params: Promise.resolve({ instanceId: INSTANCE_ID }),
    });

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.code).toBe("INTERNAL_ERROR");
  });

  it("activation runs inside a Serializable transaction", async () => {
    mockFindFirst.mockResolvedValue({
      id: INSTANCE_ID,
      lifecycleState: "DRAFT",
      lifecyclePhase: "NEW",
      strategyVersionId: "sv_linked",
      strategyVersion: { strategyIdentity: { strategyId: "strat_1" } },
    });

    const { POST } = await import("./route");
    await POST(makeRequest({ action: "activate" }), {
      params: Promise.resolve({ instanceId: INSTANCE_ID }),
    });

    expect(mockTransaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "Serializable",
    });
  });
});
