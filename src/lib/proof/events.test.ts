import { describe, it, expect, vi, beforeEach } from "vitest";
import { PROOF_GENESIS_HASH, computeProofEventHash } from "./chain";

const mockCreate = vi.fn();
const mockFindFirst = vi.fn();
const mockTransaction = vi.fn();
const mockQueryRawUnsafe = vi.fn();
const mockChainHeadCreate = vi.fn();
const mockChainHeadUpdate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: (...args: unknown[]) => mockTransaction(...args),
    $queryRawUnsafe: (...args: unknown[]) => mockQueryRawUnsafe(...args),
    proofEventLog: {
      create: (...args: unknown[]) => mockCreate(...args),
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
    },
    proofChainHead: {
      create: (...args: unknown[]) => mockChainHeadCreate(...args),
      update: (...args: unknown[]) => mockChainHeadUpdate(...args),
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { child: () => ({ error: vi.fn(), info: vi.fn() }) },
}));

function buildMockTx() {
  return {
    $queryRawUnsafe: mockQueryRawUnsafe,
    proofEventLog: {
      findFirst: mockFindFirst,
      create: mockCreate,
    },
    proofChainHead: {
      create: mockChainHeadCreate,
      update: mockChainHeadUpdate,
    },
  };
}

describe("appendProofEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      return fn(buildMockTx());
    });
  });

  it("throws when payload.recordId is not a string", async () => {
    const { appendProofEvent } = await import("./events");
    await expect(
      appendProofEvent("strat_1", "VERIFICATION_RUN_COMPLETED", { recordId: 123 })
    ).rejects.toThrow("payload.recordId to be a string");
  });

  it("assigns sequence=1 and GENESIS prevEventHash for first event", async () => {
    mockQueryRawUnsafe.mockResolvedValueOnce([]); // no chain head row
    mockCreate.mockResolvedValueOnce({});
    mockChainHeadCreate.mockResolvedValueOnce({});

    const { appendProofEvent } = await import("./events");
    const result = await appendProofEvent("strat_1", "VERIFICATION_RUN_COMPLETED", {
      recordId: "rec_001",
      verdict: "READY",
    });

    expect(result.sequence).toBe(1);
    expect(result.eventHash).toMatch(/^[a-f0-9]{64}$/);

    // Chain head lookup via SELECT FOR UPDATE
    expect(mockQueryRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining("FOR UPDATE"),
      "strat_1"
    );

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "VERIFICATION_RUN_COMPLETED",
          strategyId: "strat_1",
          sessionId: "rec_001",
          sequence: 1,
          prevEventHash: PROOF_GENESIS_HASH,
        }),
      })
    );

    // Creates new chain head (not update)
    expect(mockChainHeadCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          strategyId: "strat_1",
          lastSequence: 1,
        }),
      })
    );
    expect(mockChainHeadUpdate).not.toHaveBeenCalled();
  });

  it("increments sequence and chains prevEventHash from chain head", async () => {
    const prevHash = "abcd".repeat(16);
    mockQueryRawUnsafe.mockResolvedValueOnce([{ lastSequence: 3, lastEventHash: prevHash }]);
    mockCreate.mockResolvedValueOnce({});
    mockChainHeadUpdate.mockResolvedValueOnce({});

    const { appendProofEvent } = await import("./events");
    const result = await appendProofEvent("strat_1", "VERIFICATION_PASSED", {
      recordId: "rec_004",
    });

    expect(result.sequence).toBe(4);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sequence: 4,
          prevEventHash: prevHash,
        }),
      })
    );

    // Updates existing chain head (not create)
    expect(mockChainHeadUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { strategyId: "strat_1" },
        data: expect.objectContaining({ lastSequence: 4 }),
      })
    );
    expect(mockChainHeadCreate).not.toHaveBeenCalled();
  });

  it("uses Serializable isolation level", async () => {
    mockQueryRawUnsafe.mockResolvedValueOnce([]);
    mockCreate.mockResolvedValueOnce({});
    mockChainHeadCreate.mockResolvedValueOnce({});

    const { appendProofEvent } = await import("./events");
    await appendProofEvent("strat_1", "VERIFICATION_RUN_COMPLETED", {
      recordId: "rec_001",
    });

    expect(mockTransaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "Serializable",
    });
  });

  it("propagates transaction errors to caller", async () => {
    mockTransaction.mockRejectedValueOnce(new Error("Serialization failure"));

    const { appendProofEvent } = await import("./events");
    await expect(
      appendProofEvent("strat_1", "VERIFICATION_RUN_COMPLETED", { recordId: "rec_001" })
    ).rejects.toThrow("Serialization failure");
  });

  it("stores eventHash that matches recomputation", async () => {
    mockQueryRawUnsafe.mockResolvedValueOnce([]);
    mockChainHeadCreate.mockResolvedValueOnce({});

    let storedData: Record<string, unknown> = {};
    mockCreate.mockImplementation(({ data }: { data: Record<string, unknown> }) => {
      storedData = data;
      return Promise.resolve({});
    });

    const { appendProofEvent } = await import("./events");
    await appendProofEvent("strat_1", "VERIFICATION_RUN_COMPLETED", {
      recordId: "rec_001",
      verdict: "READY",
    });

    const recomputed = computeProofEventHash({
      sequence: storedData.sequence as number,
      strategyId: storedData.strategyId as string,
      type: storedData.type as string,
      recordId: "rec_001",
      prevEventHash: storedData.prevEventHash as string,
      payload: { recordId: "rec_001", verdict: "READY" },
    });

    expect(storedData.eventHash).toBe(recomputed);
  });
});

describe("appendVerificationRunProof", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      return fn(buildMockTx());
    });
  });

  it("creates only RUN_COMPLETED when passedPayload is absent", async () => {
    mockQueryRawUnsafe.mockResolvedValueOnce([]); // no chain head
    mockCreate.mockResolvedValue({});
    mockChainHeadCreate.mockResolvedValue({});

    const { appendVerificationRunProof } = await import("./events");
    const result = await appendVerificationRunProof({
      strategyId: "strat_1",
      recordId: "rec_001",
      runCompletedPayload: { verdict: "UNCERTAIN" },
    });

    expect(result.runCompleted.sequence).toBe(1);
    expect(result.runCompleted.type).toBe("VERIFICATION_RUN_COMPLETED");
    expect(result.runCompleted.eventHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.passed).toBeUndefined();

    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("creates both events atomically when passedPayload is provided", async () => {
    // First call: no chain head → create
    mockQueryRawUnsafe.mockResolvedValueOnce([]);
    // Second call: chain head now exists with seq=1
    mockQueryRawUnsafe.mockImplementationOnce(() => {
      // Return the head that was "created" by the first appendProofEventInTx call
      const firstCreateCall = mockChainHeadCreate.mock.calls[0]?.[0]?.data;
      return Promise.resolve([
        {
          lastSequence: firstCreateCall?.lastSequence ?? 1,
          lastEventHash: firstCreateCall?.lastEventHash ?? "mock",
        },
      ]);
    });
    mockCreate.mockResolvedValue({});
    mockChainHeadCreate.mockResolvedValue({});
    mockChainHeadUpdate.mockResolvedValue({});

    const { appendVerificationRunProof } = await import("./events");
    const result = await appendVerificationRunProof({
      strategyId: "strat_1",
      recordId: "rec_001",
      runCompletedPayload: { verdict: "READY" },
      passedPayload: { eventType: "VERIFICATION_PASSED" },
    });

    expect(result.runCompleted.sequence).toBe(1);
    expect(result.runCompleted.type).toBe("VERIFICATION_RUN_COMPLETED");
    expect(result.passed).toBeDefined();
    expect(result.passed!.sequence).toBe(2);
    expect(result.passed!.type).toBe("VERIFICATION_PASSED");

    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it("chains PASSED prevEventHash to RUN_COMPLETED eventHash", async () => {
    // First event: no chain head
    mockQueryRawUnsafe.mockResolvedValueOnce([]);

    const createdEvents: Record<string, unknown>[] = [];
    mockCreate.mockImplementation(({ data }: { data: Record<string, unknown> }) => {
      createdEvents.push(data);
      return Promise.resolve({});
    });

    let chainHeadData: Record<string, unknown> = {};
    mockChainHeadCreate.mockImplementation(({ data }: { data: Record<string, unknown> }) => {
      chainHeadData = data;
      return Promise.resolve({});
    });

    // Second event: chain head exists with data from first event
    mockQueryRawUnsafe.mockImplementationOnce(() => {
      return Promise.resolve([
        {
          lastSequence: chainHeadData.lastSequence,
          lastEventHash: chainHeadData.lastEventHash,
        },
      ]);
    });
    mockChainHeadUpdate.mockResolvedValue({});

    const { appendVerificationRunProof } = await import("./events");
    await appendVerificationRunProof({
      strategyId: "strat_1",
      recordId: "rec_001",
      runCompletedPayload: { verdict: "READY" },
      passedPayload: { eventType: "VERIFICATION_PASSED" },
    });

    const [first, second] = createdEvents;

    // Second event's prevEventHash must equal first event's eventHash
    expect(second.prevEventHash).toBe(first.eventHash);

    // Both share the same recordId (sessionId)
    expect(first.sessionId).toBe("rec_001");
    expect(second.sessionId).toBe("rec_001");

    // Sequences are consecutive
    expect(first.sequence).toBe(1);
    expect(second.sequence).toBe(2);

    // First event links back to GENESIS
    expect(first.prevEventHash).toBe(PROOF_GENESIS_HASH);
  });

  it("uses a single Serializable transaction for both inserts", async () => {
    mockQueryRawUnsafe.mockResolvedValue([]);
    mockCreate.mockResolvedValue({});
    mockChainHeadCreate.mockResolvedValue({});

    const { appendVerificationRunProof } = await import("./events");
    await appendVerificationRunProof({
      strategyId: "strat_1",
      recordId: "rec_001",
      runCompletedPayload: { verdict: "READY" },
      passedPayload: { eventType: "VERIFICATION_PASSED" },
    });

    // Exactly one $transaction call — both inserts are inside it
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockTransaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "Serializable",
    });
  });

  it("rolls back both events when second create fails (atomicity)", async () => {
    mockQueryRawUnsafe.mockResolvedValue([]);
    mockChainHeadCreate.mockResolvedValue({});
    mockCreate
      .mockResolvedValueOnce({}) // RUN_COMPLETED succeeds
      .mockRejectedValueOnce(new Error("unique constraint violation")); // PASSED fails

    const { appendVerificationRunProof } = await import("./events");
    await expect(
      appendVerificationRunProof({
        strategyId: "strat_1",
        recordId: "rec_001",
        runCompletedPayload: { verdict: "READY" },
        passedPayload: { eventType: "VERIFICATION_PASSED" },
      })
    ).rejects.toThrow("unique constraint violation");

    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });

  it("propagates transaction-level errors", async () => {
    mockTransaction.mockRejectedValueOnce(new Error("Serialization failure"));

    const { appendVerificationRunProof } = await import("./events");
    await expect(
      appendVerificationRunProof({
        strategyId: "strat_1",
        recordId: "rec_001",
        runCompletedPayload: { verdict: "UNCERTAIN" },
      })
    ).rejects.toThrow("Serialization failure");
  });

  it("produces verifiable hashes for both events", async () => {
    // First event: no chain head
    mockQueryRawUnsafe.mockResolvedValueOnce([]);

    const createdEvents: Record<string, unknown>[] = [];
    mockCreate.mockImplementation(({ data }: { data: Record<string, unknown> }) => {
      createdEvents.push(data);
      return Promise.resolve({});
    });

    let chainHeadData: Record<string, unknown> = {};
    mockChainHeadCreate.mockImplementation(({ data }: { data: Record<string, unknown> }) => {
      chainHeadData = data;
      return Promise.resolve({});
    });

    // Second event: chain head with data from first
    mockQueryRawUnsafe.mockImplementationOnce(() => {
      return Promise.resolve([
        {
          lastSequence: chainHeadData.lastSequence,
          lastEventHash: chainHeadData.lastEventHash,
        },
      ]);
    });
    mockChainHeadUpdate.mockResolvedValue({});

    const runPayload = { verdict: "READY", recordId: "rec_001" };
    const passPayload = { eventType: "VERIFICATION_PASSED", recordId: "rec_001" };

    const { appendVerificationRunProof } = await import("./events");
    await appendVerificationRunProof({
      strategyId: "strat_1",
      recordId: "rec_001",
      runCompletedPayload: { verdict: "READY" },
      passedPayload: { eventType: "VERIFICATION_PASSED" },
    });

    // Recompute hash for event 1
    const hash1 = computeProofEventHash({
      sequence: 1,
      strategyId: "strat_1",
      type: "VERIFICATION_RUN_COMPLETED",
      recordId: "rec_001",
      prevEventHash: PROOF_GENESIS_HASH,
      payload: runPayload,
    });
    expect(createdEvents[0].eventHash).toBe(hash1);

    // Recompute hash for event 2 — chained to event 1
    const hash2 = computeProofEventHash({
      sequence: 2,
      strategyId: "strat_1",
      type: "VERIFICATION_PASSED",
      recordId: "rec_001",
      prevEventHash: hash1,
      payload: passPayload,
    });
    expect(createdEvents[1].eventHash).toBe(hash2);
  });
});
