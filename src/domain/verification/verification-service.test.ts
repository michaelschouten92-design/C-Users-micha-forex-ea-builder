import { describe, it, expect, vi, beforeEach } from "vitest";
import { runVerification } from "./verification-service";

const { mockAppendVerificationRunProof } = vi.hoisted(() => ({
  mockAppendVerificationRunProof: vi.fn().mockResolvedValue({
    runCompleted: { sequence: 1, eventHash: "a".repeat(64), type: "VERIFICATION_RUN_COMPLETED" },
  }),
}));

vi.mock("@/lib/proof/events", () => ({
  appendVerificationRunProof: mockAppendVerificationRunProof,
}));

function makeTrades(count: number): Record<string, unknown>[] {
  return Array.from({ length: count }, (_, i) => ({ id: i }));
}

describe("runVerification", () => {
  beforeEach(() => {
    mockAppendVerificationRunProof.mockClear();
    mockAppendVerificationRunProof.mockResolvedValue({
      runCompleted: { sequence: 1, eventHash: "a".repeat(64), type: "VERIFICATION_RUN_COMPLETED" },
    });
  });

  it("READY + BACKTESTED → VERIFIED", async () => {
    const result = await runVerification({
      strategyId: "strat_1",
      strategyVersion: 1,
      currentLifecycleState: "BACKTESTED",
      tradeHistory: makeTrades(100),
      backtestParameters: {},
      intermediateResults: { robustnessScores: { composite: 1.0 } },
    });

    expect(result.lifecycleState).toBe("VERIFIED");
    expect(result.decision).toEqual({
      kind: "TRANSITION",
      from: "BACKTESTED",
      to: "VERIFIED",
      reason: "verification_passed",
    });
    expect(result.verdictResult.verdict).toBe("READY");
    expect(result.verdictResult.reasonCodes).toEqual(["ALL_CHECKS_PASSED"]);
  });

  it("UNCERTAIN + BACKTESTED → stays BACKTESTED", async () => {
    const result = await runVerification({
      strategyId: "strat_2",
      strategyVersion: 1,
      currentLifecycleState: "BACKTESTED",
      tradeHistory: makeTrades(100),
      backtestParameters: {},
    });

    expect(result.lifecycleState).toBe("BACKTESTED");
    expect(result.decision).toEqual({
      kind: "NO_TRANSITION",
      reason: "verdict_uncertain",
    });
    expect(result.verdictResult.verdict).toBe("UNCERTAIN");
  });

  it("NOT_DEPLOYABLE + BACKTESTED → stays BACKTESTED", async () => {
    const result = await runVerification({
      strategyId: "strat_3",
      strategyVersion: 1,
      currentLifecycleState: "BACKTESTED",
      tradeHistory: makeTrades(5),
      backtestParameters: {},
    });

    expect(result.lifecycleState).toBe("BACKTESTED");
    expect(result.decision).toEqual({
      kind: "NO_TRANSITION",
      reason: "verdict_not_deployable",
    });
    expect(result.verdictResult.verdict).toBe("NOT_DEPLOYABLE");
  });

  it("READY + not BACKTESTED → no transition (guarded)", async () => {
    const result = await runVerification({
      strategyId: "strat_4",
      strategyVersion: 1,
      currentLifecycleState: "DRAFT",
      tradeHistory: makeTrades(100),
      backtestParameters: {},
      intermediateResults: { robustnessScores: { composite: 1.0 } },
    });

    expect(result.lifecycleState).toBe("DRAFT");
    expect(result.decision).toEqual({
      kind: "NO_TRANSITION",
      reason: "state_not_eligible:DRAFT",
    });
  });

  it("non-READY calls appendVerificationRunProof without passedPayload", async () => {
    await runVerification({
      strategyId: "strat_5",
      strategyVersion: 2,
      currentLifecycleState: "BACKTESTED",
      tradeHistory: makeTrades(100),
      backtestParameters: {},
    });

    expect(mockAppendVerificationRunProof).toHaveBeenCalledTimes(1);
    const params = mockAppendVerificationRunProof.mock.calls[0][0];

    expect(params.strategyId).toBe("strat_5");
    expect(params.recordId).toEqual(expect.any(String));
    expect(params.passedPayload).toBeUndefined();
    expect(params.runCompletedPayload).toEqual(
      expect.objectContaining({
        eventType: "VERIFICATION_RUN_COMPLETED",
        strategyId: "strat_5",
        strategyVersion: 2,
        verdict: "UNCERTAIN",
        reasonCodes: expect.any(Array),
        thresholdsHash: expect.any(String),
        recordId: expect.any(String),
        timestamp: expect.any(String),
      })
    );
  });

  it("READY calls appendVerificationRunProof with passedPayload", async () => {
    await runVerification({
      strategyId: "strat_6",
      strategyVersion: 1,
      currentLifecycleState: "BACKTESTED",
      tradeHistory: makeTrades(100),
      backtestParameters: {},
      intermediateResults: { robustnessScores: { composite: 1.0 } },
    });

    expect(mockAppendVerificationRunProof).toHaveBeenCalledTimes(1);
    const params = mockAppendVerificationRunProof.mock.calls[0][0];

    expect(params.passedPayload).toBeDefined();
    expect(params.passedPayload).toEqual(
      expect.objectContaining({
        eventType: "VERIFICATION_PASSED",
        strategyId: "strat_6",
        strategyVersion: 1,
      })
    );
  });

  it("recordId and timestamp are stable across both payloads", async () => {
    await runVerification({
      strategyId: "strat_7",
      strategyVersion: 3,
      currentLifecycleState: "BACKTESTED",
      tradeHistory: makeTrades(100),
      backtestParameters: {},
      intermediateResults: { robustnessScores: { composite: 1.0 } },
    });

    const params = mockAppendVerificationRunProof.mock.calls[0][0];
    const runPayload = params.runCompletedPayload;
    const passedPayload = params.passedPayload;

    // recordId param matches both payloads
    expect(runPayload.recordId).toBe(params.recordId);
    expect(passedPayload.recordId).toBe(params.recordId);

    // timestamp is identical across both payloads
    expect(runPayload.timestamp).toBe(passedPayload.timestamp);

    // RUN_COMPLETED has all contract fields
    expect(runPayload).toEqual(
      expect.objectContaining({
        eventType: "VERIFICATION_RUN_COMPLETED",
        strategyId: "strat_7",
        strategyVersion: 3,
        verdict: "READY",
        reasonCodes: expect.any(Array),
        thresholdsHash: expect.any(String),
      })
    );

    // VERIFICATION_PASSED has its contract fields
    expect(passedPayload).toEqual(
      expect.objectContaining({
        eventType: "VERIFICATION_PASSED",
        strategyId: "strat_7",
        strategyVersion: 3,
      })
    );
  });

  it("throws when atomic persistence fails (non-READY)", async () => {
    mockAppendVerificationRunProof.mockRejectedValueOnce(new Error("DB write failed"));

    await expect(
      runVerification({
        strategyId: "strat_fail_1",
        strategyVersion: 1,
        currentLifecycleState: "BACKTESTED",
        tradeHistory: makeTrades(100),
        backtestParameters: {},
      })
    ).rejects.toThrow("DB write failed");
  });

  it("throws when atomic persistence fails (READY)", async () => {
    mockAppendVerificationRunProof.mockRejectedValueOnce(new Error("DB write failed"));

    await expect(
      runVerification({
        strategyId: "strat_fail_2",
        strategyVersion: 1,
        currentLifecycleState: "BACKTESTED",
        tradeHistory: makeTrades(100),
        backtestParameters: {},
        intermediateResults: { robustnessScores: { composite: 1.0 } },
      })
    ).rejects.toThrow("DB write failed");
  });

  it("READY persistence failure never produces a transitioned result", async () => {
    mockAppendVerificationRunProof.mockRejectedValueOnce(new Error("DB write failed"));

    let leaked: unknown = undefined;
    try {
      leaked = await runVerification({
        strategyId: "strat_no_leak",
        strategyVersion: 1,
        currentLifecycleState: "BACKTESTED",
        tradeHistory: makeTrades(100),
        backtestParameters: {},
        intermediateResults: { robustnessScores: { composite: 1.0 } },
      });
    } catch {
      // expected
    }

    // The function must throw — no result should ever be returned
    expect(leaked).toBeUndefined();
  });

  it("non-READY persistence failure never produces a result", async () => {
    mockAppendVerificationRunProof.mockRejectedValueOnce(new Error("DB write failed"));

    let leaked: unknown = undefined;
    try {
      leaked = await runVerification({
        strategyId: "strat_no_leak_2",
        strategyVersion: 1,
        currentLifecycleState: "BACKTESTED",
        tradeHistory: makeTrades(100),
        backtestParameters: {},
      });
    } catch {
      // expected
    }

    expect(leaked).toBeUndefined();
  });

  it("single atomic call means no partial-commit risk", async () => {
    mockAppendVerificationRunProof.mockRejectedValueOnce(new Error("Serialization failure"));

    await expect(
      runVerification({
        strategyId: "strat_fail_3",
        strategyVersion: 1,
        currentLifecycleState: "BACKTESTED",
        tradeHistory: makeTrades(100),
        backtestParameters: {},
        intermediateResults: { robustnessScores: { composite: 1.0 } },
      })
    ).rejects.toThrow("Serialization failure");

    // Exactly one atomic call — no separate calls that could partially succeed
    expect(mockAppendVerificationRunProof).toHaveBeenCalledTimes(1);
  });
});
