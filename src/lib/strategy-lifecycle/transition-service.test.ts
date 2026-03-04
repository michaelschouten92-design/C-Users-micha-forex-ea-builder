import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockInfo, mockError } = vi.hoisted(() => ({
  mockInfo: vi.fn(),
  mockError: vi.fn(),
}));

const { mockInstanceUpdate, mockFindFirst, mockTransaction } = vi.hoisted(() => ({
  mockInstanceUpdate: vi.fn().mockResolvedValue({}),
  mockFindFirst: vi.fn(),
  mockTransaction: vi.fn(),
}));

const { mockAppendProofEventInTx } = vi.hoisted(() => ({
  mockAppendProofEventInTx: vi.fn().mockResolvedValue({ sequence: 1, eventHash: "abc" }),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    child: () => ({ info: mockInfo, error: mockError }),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    liveEAInstance: { update: mockInstanceUpdate, findFirst: mockFindFirst },
    $transaction: mockTransaction,
  },
}));

vi.mock("@/lib/proof/events", () => ({
  appendProofEventInTx: (...args: unknown[]) => mockAppendProofEventInTx(...args),
}));

import {
  performLifecycleTransition,
  performLifecycleTransitionInTx,
  setOperatorHold,
} from "./transition-service";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("performLifecycleTransition", () => {
  it("updates DB and logs valid DRAFT → BACKTESTED transition", async () => {
    await performLifecycleTransition("inst_1", "DRAFT", "BACKTESTED", "backtest_complete");

    expect(mockInstanceUpdate).toHaveBeenCalledWith({
      where: { id: "inst_1" },
      data: { lifecycleState: "BACKTESTED" },
    });
    expect(mockInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        instanceId: "inst_1",
        from: "DRAFT",
        to: "BACKTESTED",
        reason: "backtest_complete",
      }),
      "Lifecycle state transition"
    );
  });

  it("updates DB and logs valid LIVE_MONITORING → EDGE_AT_RISK transition", async () => {
    await performLifecycleTransition("inst_2", "LIVE_MONITORING", "EDGE_AT_RISK", "edge_degraded");

    expect(mockInstanceUpdate).toHaveBeenCalledWith({
      where: { id: "inst_2" },
      data: { lifecycleState: "EDGE_AT_RISK" },
    });
    expect(mockInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        instanceId: "inst_2",
        from: "LIVE_MONITORING",
        to: "EDGE_AT_RISK",
        reason: "edge_degraded",
      }),
      "Lifecycle state transition"
    );
  });

  it("throws on invalid DRAFT → INVALIDATED transition, no DB write or log", async () => {
    await expect(
      performLifecycleTransition("inst_3", "DRAFT", "INVALIDATED", "bad_transition")
    ).rejects.toThrow("Invalid lifecycle transition: DRAFT → INVALIDATED");

    expect(mockInstanceUpdate).not.toHaveBeenCalled();
    expect(mockInfo).not.toHaveBeenCalled();
  });

  it("throws on terminal INVALIDATED → DRAFT transition, no DB write", async () => {
    await expect(
      performLifecycleTransition("inst_4", "INVALIDATED", "DRAFT", "restart_attempt")
    ).rejects.toThrow("Invalid lifecycle transition: INVALIDATED → DRAFT");

    expect(mockInstanceUpdate).not.toHaveBeenCalled();
    expect(mockInfo).not.toHaveBeenCalled();
  });

  it("log contains all structured fields", async () => {
    await performLifecycleTransition("inst_5", "BACKTESTED", "VERIFIED", "verification_passed");

    expect(mockInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        instanceId: "inst_5",
        from: "BACKTESTED",
        to: "VERIFIED",
        reason: "verification_passed",
      }),
      "Lifecycle state transition"
    );
  });

  // ── Monitoring source prohibition ─────────────────────────────────
  it('rejects LIVE_MONITORING → INVALIDATED when source is "monitoring"', async () => {
    await expect(
      performLifecycleTransition(
        "inst_6",
        "LIVE_MONITORING",
        "INVALIDATED",
        "monitoring_verdict",
        "monitoring"
      )
    ).rejects.toThrow("Monitoring cannot transition LIVE_MONITORING → INVALIDATED");

    // No DB write
    expect(mockInstanceUpdate).not.toHaveBeenCalled();
  });

  it('allows LIVE_MONITORING → INVALIDATED when source is "operator"', async () => {
    await performLifecycleTransition(
      "inst_7",
      "LIVE_MONITORING",
      "INVALIDATED",
      "manual_retirement",
      "operator"
    );

    expect(mockInstanceUpdate).toHaveBeenCalledWith({
      where: { id: "inst_7" },
      data: { lifecycleState: "INVALIDATED" },
    });
  });

  it("allows LIVE_MONITORING → INVALIDATED when source is omitted (backward compat)", async () => {
    await performLifecycleTransition("inst_8", "LIVE_MONITORING", "INVALIDATED", "legacy_call");

    expect(mockInstanceUpdate).toHaveBeenCalledWith({
      where: { id: "inst_8" },
      data: { lifecycleState: "INVALIDATED" },
    });
  });

  it('allows EDGE_AT_RISK → INVALIDATED when source is "monitoring"', async () => {
    await performLifecycleTransition(
      "inst_9",
      "EDGE_AT_RISK",
      "INVALIDATED",
      "monitoring_invalidation",
      "monitoring"
    );

    expect(mockInstanceUpdate).toHaveBeenCalledWith({
      where: { id: "inst_9" },
      data: { lifecycleState: "INVALIDATED" },
    });
  });

  it('allows LIVE_MONITORING → EDGE_AT_RISK when source is "monitoring"', async () => {
    await performLifecycleTransition(
      "inst_10",
      "LIVE_MONITORING",
      "EDGE_AT_RISK",
      "monitoring_at_risk",
      "monitoring"
    );

    expect(mockInstanceUpdate).toHaveBeenCalledWith({
      where: { id: "inst_10" },
      data: { lifecycleState: "EDGE_AT_RISK" },
    });
  });
});

describe("performLifecycleTransitionInTx", () => {
  it("uses the provided tx client, not the global prisma", async () => {
    const mockTxUpdate = vi.fn().mockResolvedValue({});
    const tx = { liveEAInstance: { update: mockTxUpdate } };

    await performLifecycleTransitionInTx(
      tx as unknown as Parameters<typeof performLifecycleTransitionInTx>[0],
      "inst_tx_1",
      "DRAFT",
      "BACKTESTED",
      "backtest_complete"
    );

    expect(mockTxUpdate).toHaveBeenCalledWith({
      where: { id: "inst_tx_1" },
      data: { lifecycleState: "BACKTESTED" },
    });
    // Global prisma NOT used
    expect(mockInstanceUpdate).not.toHaveBeenCalled();
  });

  it("enforces monitoring prohibition via tx path", async () => {
    const mockTxUpdate = vi.fn().mockResolvedValue({});
    const tx = { liveEAInstance: { update: mockTxUpdate } };

    await expect(
      performLifecycleTransitionInTx(
        tx as unknown as Parameters<typeof performLifecycleTransitionInTx>[0],
        "inst_tx_2",
        "LIVE_MONITORING",
        "INVALIDATED",
        "monitoring_verdict",
        "monitoring"
      )
    ).rejects.toThrow("Monitoring cannot transition LIVE_MONITORING → INVALIDATED");

    expect(mockTxUpdate).not.toHaveBeenCalled();
  });

  it("validates transition rules via tx path", async () => {
    const mockTxUpdate = vi.fn().mockResolvedValue({});
    const tx = { liveEAInstance: { update: mockTxUpdate } };

    await expect(
      performLifecycleTransitionInTx(
        tx as unknown as Parameters<typeof performLifecycleTransitionInTx>[0],
        "inst_tx_3",
        "DRAFT",
        "INVALIDATED",
        "bad_transition"
      )
    ).rejects.toThrow("Invalid lifecycle transition: DRAFT → INVALIDATED");

    expect(mockTxUpdate).not.toHaveBeenCalled();
  });

  it("logs transition with structured fields", async () => {
    const mockTxUpdate = vi.fn().mockResolvedValue({});
    const tx = { liveEAInstance: { update: mockTxUpdate } };

    await performLifecycleTransitionInTx(
      tx as unknown as Parameters<typeof performLifecycleTransitionInTx>[0],
      "inst_tx_4",
      "LIVE_MONITORING",
      "EDGE_AT_RISK",
      "edge_degraded",
      "monitoring"
    );

    expect(mockInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        instanceId: "inst_tx_4",
        from: "LIVE_MONITORING",
        to: "EDGE_AT_RISK",
        reason: "edge_degraded",
        source: "monitoring",
      }),
      "Lifecycle state transition"
    );
  });
});

// ── setOperatorHold ──────────────────────────────────────────────

describe("setOperatorHold", () => {
  const txUpdate = vi.fn().mockResolvedValue({});

  beforeEach(() => {
    txUpdate.mockClear();
    mockAppendProofEventInTx.mockClear();
    // Default: transaction executes its callback
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        liveEAInstance: { update: txUpdate },
        proofEventLog: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn() },
      };
      return fn(tx);
    });
  });

  it("rejects when instance not owned by userId (NOT_OWNER)", async () => {
    mockFindFirst.mockResolvedValue(null);

    const result = await setOperatorHold({
      userId: "user_wrong",
      instanceId: "ea_1",
      hold: "HALTED",
    });

    expect(result).toEqual({ ok: false, code: "NOT_OWNER" });
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ea_1", userId: "user_wrong", deletedAt: null },
      })
    );
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("is idempotent — setting HALTED when already HALTED returns ok", async () => {
    mockFindFirst.mockResolvedValue({
      id: "ea_1",
      operatorHold: "HALTED",
      lifecycleState: "LIVE_MONITORING",
    });

    const result = await setOperatorHold({
      userId: "user_1",
      instanceId: "ea_1",
      hold: "HALTED",
    });

    expect(result).toEqual({ ok: true });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("is idempotent — setting NONE when already NONE returns ok", async () => {
    mockFindFirst.mockResolvedValue({
      id: "ea_1",
      operatorHold: "NONE",
      lifecycleState: "LIVE_MONITORING",
    });

    const result = await setOperatorHold({
      userId: "user_1",
      instanceId: "ea_1",
      hold: "NONE",
    });

    expect(result).toEqual({ ok: true });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("halts instance from NONE state with proof event", async () => {
    mockFindFirst.mockResolvedValue({
      id: "ea_1",
      operatorHold: "NONE",
      lifecycleState: "LIVE_MONITORING",
    });

    const result = await setOperatorHold({
      userId: "user_1",
      instanceId: "ea_1",
      hold: "HALTED",
    });

    expect(result).toEqual({ ok: true });
    expect(mockTransaction).toHaveBeenCalledTimes(1);

    expect(mockAppendProofEventInTx).toHaveBeenCalledWith(
      expect.anything(),
      "ea_1",
      "OPERATOR_HALT_APPLIED",
      expect.objectContaining({
        eventType: "OPERATOR_HALT_APPLIED",
        instanceId: "ea_1",
        previousHold: "NONE",
        newHold: "HALTED",
        requestedBy: "user_1",
      })
    );

    expect(txUpdate).toHaveBeenCalledWith({
      where: { id: "ea_1" },
      data: { operatorHold: "HALTED" },
    });
  });

  it("releases halt from HALTED state with proof event", async () => {
    mockFindFirst.mockResolvedValue({
      id: "ea_1",
      operatorHold: "HALTED",
      lifecycleState: "EDGE_AT_RISK",
    });

    const result = await setOperatorHold({
      userId: "user_1",
      instanceId: "ea_1",
      hold: "NONE",
    });

    expect(result).toEqual({ ok: true });
    expect(mockAppendProofEventInTx).toHaveBeenCalledWith(
      expect.anything(),
      "ea_1",
      "OPERATOR_HALT_RELEASED",
      expect.objectContaining({
        eventType: "OPERATOR_HALT_RELEASED",
        previousHold: "HALTED",
        newHold: "NONE",
      })
    );
  });

  it("rejects HALT when operatorHold is OVERRIDE_PENDING", async () => {
    mockFindFirst.mockResolvedValue({
      id: "ea_1",
      operatorHold: "OVERRIDE_PENDING",
      lifecycleState: "EDGE_AT_RISK",
    });

    const result = await setOperatorHold({
      userId: "user_1",
      instanceId: "ea_1",
      hold: "HALTED",
    });

    expect(result).toEqual({ ok: false, code: "INVALID_TRANSITION" });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("rejects RELEASE when operatorHold is OVERRIDE_PENDING", async () => {
    mockFindFirst.mockResolvedValue({
      id: "ea_1",
      operatorHold: "OVERRIDE_PENDING",
      lifecycleState: "EDGE_AT_RISK",
    });

    const result = await setOperatorHold({
      userId: "user_1",
      instanceId: "ea_1",
      hold: "NONE",
    });

    expect(result).toEqual({ ok: false, code: "INVALID_TRANSITION" });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("returns MUTATION_FAILED when transaction throws", async () => {
    mockFindFirst.mockResolvedValue({
      id: "ea_1",
      operatorHold: "NONE",
      lifecycleState: "LIVE_MONITORING",
    });
    mockTransaction.mockRejectedValue(new Error("DB error"));

    const result = await setOperatorHold({
      userId: "user_1",
      instanceId: "ea_1",
      hold: "HALTED",
    });

    expect(result).toEqual({ ok: false, code: "MUTATION_FAILED" });
  });

  it("writes proof event before DB update (proof-first ordering)", async () => {
    mockFindFirst.mockResolvedValue({
      id: "ea_1",
      operatorHold: "NONE",
      lifecycleState: "LIVE_MONITORING",
    });

    const callOrder: string[] = [];
    mockAppendProofEventInTx.mockImplementation(async () => {
      callOrder.push("proof");
      return { sequence: 1, eventHash: "abc" };
    });
    txUpdate.mockImplementation(async () => {
      callOrder.push("update");
      return {};
    });

    await setOperatorHold({ userId: "user_1", instanceId: "ea_1", hold: "HALTED" });

    expect(callOrder).toEqual(["proof", "update"]);
  });

  it("uses serializable isolation level", async () => {
    mockFindFirst.mockResolvedValue({
      id: "ea_1",
      operatorHold: "NONE",
      lifecycleState: "LIVE_MONITORING",
    });

    await setOperatorHold({ userId: "user_1", instanceId: "ea_1", hold: "HALTED" });

    expect(mockTransaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "Serializable",
    });
  });
});
