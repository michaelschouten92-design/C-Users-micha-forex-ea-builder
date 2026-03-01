import { describe, it, expect, vi, beforeEach } from "vitest";
import { PROOF_GENESIS_HASH, computeProofEventHash } from "./chain";

const mockCreate = vi.fn();
const mockFindFirst = vi.fn();
const mockTransaction = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: (...args: unknown[]) => mockTransaction(...args),
    proofEventLog: {
      create: (...args: unknown[]) => mockCreate(...args),
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { child: () => ({ error: vi.fn(), info: vi.fn() }) },
}));

describe("appendProofEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: $transaction executes the callback with a mock tx
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        proofEventLog: {
          findFirst: mockFindFirst,
          create: mockCreate,
        },
      };
      return fn(tx);
    });
  });

  it("throws when payload.recordId is not a string", async () => {
    const { appendProofEvent } = await import("./events");
    await expect(
      appendProofEvent("strat_1", "VERIFICATION_RUN_COMPLETED", { recordId: 123 })
    ).rejects.toThrow("payload.recordId to be a string");
  });

  it("assigns sequence=1 and GENESIS prevEventHash for first event", async () => {
    mockFindFirst.mockResolvedValueOnce(null); // no chain head
    mockCreate.mockResolvedValueOnce({});

    const { appendProofEvent } = await import("./events");
    const result = await appendProofEvent("strat_1", "VERIFICATION_RUN_COMPLETED", {
      recordId: "rec_001",
      verdict: "READY",
    });

    expect(result.sequence).toBe(1);
    expect(result.eventHash).toMatch(/^[a-f0-9]{64}$/);

    // Chain head lookup is by sessionId (recordId), not strategyId
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sessionId: "rec_001", sequence: { not: null } },
      })
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
  });

  it("increments sequence and chains prevEventHash from head", async () => {
    const prevHash = "abcd".repeat(16);
    mockFindFirst.mockResolvedValueOnce({ sequence: 3, eventHash: prevHash });
    mockCreate.mockResolvedValueOnce({});

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
  });

  it("uses Serializable isolation level", async () => {
    mockFindFirst.mockResolvedValueOnce(null);
    mockCreate.mockResolvedValueOnce({});

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
    mockFindFirst.mockResolvedValueOnce(null);

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

    // Recompute hash from stored data and verify it matches.
    // Timestamp is intentionally excluded from the preimage.
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
      const tx = {
        proofEventLog: {
          findFirst: mockFindFirst,
          create: mockCreate,
        },
      };
      return fn(tx);
    });
  });

  it("creates only RUN_COMPLETED when passedPayload is absent", async () => {
    mockFindFirst.mockResolvedValueOnce(null);
    mockCreate.mockResolvedValue({});

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
    mockFindFirst.mockResolvedValueOnce(null);
    mockCreate.mockResolvedValue({});

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
    mockFindFirst.mockResolvedValueOnce(null);

    const createdRows: Record<string, unknown>[] = [];
    mockCreate.mockImplementation(({ data }: { data: Record<string, unknown> }) => {
      createdRows.push(data);
      return Promise.resolve({});
    });

    const { appendVerificationRunProof } = await import("./events");
    await appendVerificationRunProof({
      strategyId: "strat_1",
      recordId: "rec_001",
      runCompletedPayload: { verdict: "READY" },
      passedPayload: { eventType: "VERIFICATION_PASSED" },
    });

    const [first, second] = createdRows;

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
    mockFindFirst.mockResolvedValueOnce(null);
    mockCreate.mockResolvedValue({});

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
    mockFindFirst.mockResolvedValueOnce(null);
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

    // Both creates were attempted inside the transaction
    expect(mockCreate).toHaveBeenCalledTimes(2);
    // But only one $transaction call — Prisma rolls back the entire tx on error
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
    mockFindFirst.mockResolvedValueOnce(null);

    const createdRows: Record<string, unknown>[] = [];
    mockCreate.mockImplementation(({ data }: { data: Record<string, unknown> }) => {
      createdRows.push(data);
      return Promise.resolve({});
    });

    const runPayload = { verdict: "READY", recordId: "rec_001" };
    const passPayload = { eventType: "VERIFICATION_PASSED", recordId: "rec_001" };

    const { appendVerificationRunProof } = await import("./events");
    await appendVerificationRunProof({
      strategyId: "strat_1",
      recordId: "rec_001",
      runCompletedPayload: runPayload,
      passedPayload: passPayload,
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
    expect(createdRows[0].eventHash).toBe(hash1);

    // Recompute hash for event 2 — chained to event 1
    const hash2 = computeProofEventHash({
      sequence: 2,
      strategyId: "strat_1",
      type: "VERIFICATION_PASSED",
      recordId: "rec_001",
      prevEventHash: hash1,
      payload: passPayload,
    });
    expect(createdRows[1].eventHash).toBe(hash2);
  });
});
