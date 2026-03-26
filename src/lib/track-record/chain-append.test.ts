import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";

// ─── Mocks ────────────────────────────────────────────────────────

const mockTransaction = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: (...args: unknown[]) => mockTransaction(...args) },
}));

vi.mock("@/lib/logger", () => ({
  logger: { child: () => ({ warn: vi.fn(), info: vi.fn(), error: vi.fn() }) },
}));

vi.mock("./canonical", () => ({
  buildCanonicalEvent: vi.fn().mockReturnValue("canonical"),
  computeEventHash: vi.fn().mockReturnValue("a".repeat(64)),
}));

vi.mock("./state-manager", () => ({
  stateFromDb: vi.fn().mockReturnValue({ lastSeqNo: 0, lastEventHash: "0".repeat(64) }),
  processEvent: vi.fn(),
  stateToDbUpdate: vi.fn().mockReturnValue({}),
}));

vi.mock("./checkpoint", () => ({
  shouldCreateCheckpoint: vi.fn().mockReturnValue(false),
  buildCheckpointData: vi.fn(),
  computeCheckpointHmac: vi.fn(),
}));

vi.mock("./ledger-commitment", () => ({
  shouldCreateCommitment: vi.fn().mockReturnValue(false),
  buildCommitmentData: vi.fn(),
}));

// ─── Helpers ──────────────────────────────────────────────────────

function makeP2034(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError("Transaction failed", {
    code: "P2034",
    clientVersion: "6.19.2",
  });
}

function makeMockTx() {
  return {
    trackRecordState: {
      findUnique: vi.fn().mockResolvedValue({
        instanceId: "inst_1",
        lastSeqNo: 5,
        lastEventHash: "b".repeat(64),
        balance: 1000, equity: 1000, highWaterMark: 1000,
        maxDrawdown: 0, maxDrawdownPct: 0,
        totalTrades: 5, totalProfit: 100, totalSwap: 0, totalCommission: 0,
        winCount: 3, lossCount: 2, openPositions: [],
        cumulativeCashflow: 0, maxDrawdownDurationSec: 0,
        drawdownStartTimestamp: 0, peakEquityTimestamp: 0,
      }),
      update: vi.fn(),
    },
    trackRecordEvent: { create: vi.fn() },
    trackRecordCheckpoint: { create: vi.fn() },
    ledgerCommitment: { create: vi.fn() },
  };
}

// ─── Tests ────────────────────────────────────────────────────────

describe("appendChainEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("succeeds on first attempt without retry", async () => {
    const tx = makeMockTx();
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(tx));

    const { appendChainEvent } = await import("./chain-append");
    const result = await appendChainEvent("inst_1", "BROKER_HISTORY_DIGEST", { historyHash: "abc" });

    expect(result).toEqual({ seqNo: expect.any(Number), eventHash: expect.any(String) });
    expect(tx.trackRecordEvent.create).toHaveBeenCalledTimes(1);
    expect(tx.trackRecordState.update).toHaveBeenCalledTimes(1);
    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });

  it("retries on P2034 and succeeds on second attempt", async () => {
    const tx = makeMockTx();
    let callCount = 0;
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      callCount++;
      if (callCount === 1) throw makeP2034();
      return fn(tx);
    });

    const { appendChainEvent } = await import("./chain-append");
    const result = await appendChainEvent("inst_1", "BROKER_HISTORY_DIGEST", { historyHash: "abc" });

    expect(result).toEqual({ seqNo: expect.any(Number), eventHash: expect.any(String) });
    expect(mockTransaction).toHaveBeenCalledTimes(2);
    // Only the successful attempt writes
    expect(tx.trackRecordEvent.create).toHaveBeenCalledTimes(1);
  });

  it("throws ChainSerializationError after exhausting retries", async () => {
    mockTransaction.mockRejectedValue(makeP2034());

    const { appendChainEvent, ChainSerializationError } = await import("./chain-append");

    await expect(appendChainEvent("inst_1", "BROKER_HISTORY_DIGEST", { historyHash: "abc" }))
      .rejects.toThrow(ChainSerializationError);

    // Attempted MAX_SERIALIZATION_RETRIES times
    expect(mockTransaction).toHaveBeenCalledTimes(3);
  });

  it("does not retry non-P2034 errors", async () => {
    mockTransaction.mockRejectedValue(new Error("Some other database error"));

    const { appendChainEvent, ChainSerializationError } = await import("./chain-append");

    await expect(appendChainEvent("inst_1", "BROKER_HISTORY_DIGEST", { historyHash: "abc" }))
      .rejects.toThrow("Some other database error");

    // Only one attempt — no retry
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    // Not wrapped in ChainSerializationError
    await expect(appendChainEvent("inst_1", "BROKER_HISTORY_DIGEST", { historyHash: "abc" }))
      .rejects.not.toBeInstanceOf(ChainSerializationError);
  });

  it("ChainSerializationError contains instanceId and attempt count", async () => {
    mockTransaction.mockRejectedValue(makeP2034());

    const { appendChainEvent, ChainSerializationError } = await import("./chain-append");

    try {
      await appendChainEvent("inst_42", "BROKER_HISTORY_DIGEST", { historyHash: "abc" });
      expect.unreachable("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ChainSerializationError);
      const csErr = err as InstanceType<typeof ChainSerializationError>;
      expect(csErr.instanceId).toBe("inst_42");
      expect(csErr.attempts).toBe(3);
      expect(csErr.cause).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
    }
  });
});
