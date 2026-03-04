import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockInfo, mockError } = vi.hoisted(() => ({
  mockInfo: vi.fn(),
  mockError: vi.fn(),
}));

const { mockFindUnique, mockTransaction } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
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
    strategyVersion: { findUnique: mockFindUnique },
    $transaction: mockTransaction,
  },
}));

vi.mock("@/lib/proof/events", () => ({
  appendProofEventInTx: (...args: unknown[]) => mockAppendProofEventInTx(...args),
}));

// Mock the hashing functions to return predictable values
vi.mock("@/lib/proof/identity-hashing", () => ({
  computeSnapshotHash: () => "snapshot_hash_abc",
  computeBaselineHash: () => "baseline_hash_def",
}));

import { bindIdentityToVersion, ensureStrategyIdentity } from "./identity";

beforeEach(() => {
  vi.clearAllMocks();
});

// ── ensureStrategyIdentity ──────────────────────────────

describe("ensureStrategyIdentity", () => {
  it("returns existing identity without emitting proof event", async () => {
    const tx = {
      strategyIdentity: {
        findUnique: vi.fn().mockResolvedValue({ id: "si_1", strategyId: "AS-existing" }),
        create: vi.fn(),
      },
      proofEventLog: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn() },
    } as unknown as Parameters<typeof ensureStrategyIdentity>[0];

    const result = await ensureStrategyIdentity(tx, "proj_1", "fp_1");

    expect(result).toEqual({ id: "si_1", strategyId: "AS-existing", isNew: false });
    expect(tx.strategyIdentity.create).not.toHaveBeenCalled();
    expect(mockAppendProofEventInTx).not.toHaveBeenCalled();
  });

  it("creates new identity and emits STRATEGY_IDENTITY_CREATED proof event", async () => {
    const tx = {
      strategyIdentity: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: "si_new", strategyId: "AS-newcode1" }),
      },
      proofEventLog: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn() },
    } as unknown as Parameters<typeof ensureStrategyIdentity>[0];

    const result = await ensureStrategyIdentity(tx, "proj_2", "fp_2");

    expect(result.isNew).toBe(true);
    expect(result.id).toBe("si_new");

    // Proof event emitted exactly once
    expect(mockAppendProofEventInTx).toHaveBeenCalledTimes(1);
    expect(mockAppendProofEventInTx).toHaveBeenCalledWith(
      tx,
      expect.stringMatching(/^AS-/),
      "STRATEGY_IDENTITY_CREATED",
      expect.objectContaining({
        projectId: "proj_2",
      })
    );

    // Proof event payload contains only safe fields
    const payload = mockAppendProofEventInTx.mock.calls[0][3];
    expect(Object.keys(payload).sort()).toEqual(["projectId", "recordId", "strategyId"]);
  });

  it("emits proof event before create (proof-first ordering)", async () => {
    const callOrder: string[] = [];

    mockAppendProofEventInTx.mockImplementation(async () => {
      callOrder.push("proof");
      return { sequence: 1, eventHash: "abc" };
    });

    const tx = {
      strategyIdentity: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockImplementation(async () => {
          callOrder.push("create");
          return { id: "si_new", strategyId: "AS-newcode1" };
        }),
      },
      proofEventLog: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn() },
    } as unknown as Parameters<typeof ensureStrategyIdentity>[0];

    await ensureStrategyIdentity(tx, "proj_3", "fp_3");

    expect(callOrder).toEqual(["proof", "create"]);
  });
});

// ── bindIdentityToVersion ──────────────────────────────

const VERSION_WITH_BASELINE = {
  id: "ver_1",
  fingerprint: "fp_1",
  logicHash: "lh_1",
  parameterHash: "ph_1",
  versionNo: 1,
  strategyIdentity: { strategyId: "AS-abc12345" },
  backtestBaseline: {
    totalTrades: 500,
    winRate: 0.62,
    profitFactor: 1.8,
    maxDrawdownPct: 12.5,
    avgTradesPerDay: 2.3,
    netReturnPct: 45.0,
    sharpeRatio: 1.5,
    initialDeposit: 10000,
    backtestDurationDays: 365,
  },
  binding: null,
};

describe("bindIdentityToVersion", () => {
  it("returns VERSION_NOT_FOUND when version does not exist", async () => {
    mockFindUnique.mockResolvedValue(null);

    const result = await bindIdentityToVersion("ver_missing");

    expect(result).toEqual({ ok: false, code: "VERSION_NOT_FOUND" });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("returns existing binding with isNew: false (idempotency)", async () => {
    mockFindUnique.mockResolvedValue({
      ...VERSION_WITH_BASELINE,
      binding: {
        id: "bind_existing",
        snapshotHash: "snap_existing",
        baselineHash: "base_existing",
      },
    });

    const result = await bindIdentityToVersion("ver_1");

    expect(result).toEqual({
      ok: true,
      bindingId: "bind_existing",
      snapshotHash: "snap_existing",
      baselineHash: "base_existing",
      isNew: false,
    });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("creates new binding with proof event", async () => {
    mockFindUnique.mockResolvedValue(VERSION_WITH_BASELINE);

    const txCreate = vi.fn().mockResolvedValue({
      id: "bind_new",
      snapshotHash: "snapshot_hash_abc",
      baselineHash: "baseline_hash_def",
    });
    const txFindUnique = vi.fn().mockResolvedValue(null);

    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        strategyIdentityBinding: { findUnique: txFindUnique, create: txCreate },
        proofEventLog: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn() },
      };
      return fn(tx);
    });

    const result = await bindIdentityToVersion("ver_1");

    expect(result).toEqual({
      ok: true,
      bindingId: "bind_new",
      snapshotHash: "snapshot_hash_abc",
      baselineHash: "baseline_hash_def",
      isNew: true,
    });

    // Proof event emitted with correct data
    expect(mockAppendProofEventInTx).toHaveBeenCalledWith(
      expect.anything(),
      "AS-abc12345",
      "STRATEGY_IDENTITY_BOUND",
      expect.objectContaining({
        recordId: "ver_1",
        strategyVersionId: "ver_1",
        snapshotHash: "snapshot_hash_abc",
        baselineHash: "baseline_hash_def",
        versionNo: 1,
      })
    );

    // Binding created
    expect(txCreate).toHaveBeenCalledWith({
      data: {
        strategyVersionId: "ver_1",
        snapshotHash: "snapshot_hash_abc",
        baselineHash: "baseline_hash_def",
      },
    });
  });

  it("creates binding without baseline (baselineHash null)", async () => {
    mockFindUnique.mockResolvedValue({
      ...VERSION_WITH_BASELINE,
      backtestBaseline: null,
    });

    const txCreate = vi.fn().mockResolvedValue({
      id: "bind_no_base",
      snapshotHash: "snapshot_hash_abc",
      baselineHash: null,
    });
    const txFindUnique = vi.fn().mockResolvedValue(null);

    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        strategyIdentityBinding: { findUnique: txFindUnique, create: txCreate },
        proofEventLog: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn() },
      };
      return fn(tx);
    });

    const result = await bindIdentityToVersion("ver_1");

    expect(result).toEqual({
      ok: true,
      bindingId: "bind_no_base",
      snapshotHash: "snapshot_hash_abc",
      baselineHash: null,
      isNew: true,
    });

    expect(txCreate).toHaveBeenCalledWith({
      data: {
        strategyVersionId: "ver_1",
        snapshotHash: "snapshot_hash_abc",
        baselineHash: null,
      },
    });
  });

  it("returns MUTATION_FAILED when transaction throws", async () => {
    mockFindUnique.mockResolvedValue(VERSION_WITH_BASELINE);
    mockTransaction.mockRejectedValue(new Error("DB error"));

    const result = await bindIdentityToVersion("ver_1");

    expect(result).toEqual({ ok: false, code: "MUTATION_FAILED" });
    expect(mockError).toHaveBeenCalled();
  });

  it("writes proof event before mutation (proof-first ordering)", async () => {
    mockFindUnique.mockResolvedValue(VERSION_WITH_BASELINE);

    const callOrder: string[] = [];
    const txCreate = vi.fn().mockImplementation(async () => {
      callOrder.push("create");
      return {
        id: "bind_new",
        snapshotHash: "snapshot_hash_abc",
        baselineHash: "baseline_hash_def",
      };
    });
    const txFindUnique = vi.fn().mockResolvedValue(null);

    mockAppendProofEventInTx.mockImplementation(async () => {
      callOrder.push("proof");
      return { sequence: 1, eventHash: "abc" };
    });

    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        strategyIdentityBinding: { findUnique: txFindUnique, create: txCreate },
        proofEventLog: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn() },
      };
      return fn(tx);
    });

    await bindIdentityToVersion("ver_1");

    expect(callOrder).toEqual(["proof", "create"]);
  });

  it("uses serializable isolation level", async () => {
    mockFindUnique.mockResolvedValue(VERSION_WITH_BASELINE);

    const txCreate = vi.fn().mockResolvedValue({
      id: "bind_new",
      snapshotHash: "snapshot_hash_abc",
      baselineHash: "baseline_hash_def",
    });

    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        strategyIdentityBinding: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: txCreate,
        },
        proofEventLog: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn() },
      };
      return fn(tx);
    });

    await bindIdentityToVersion("ver_1");

    expect(mockTransaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "Serializable",
    });
  });
});
