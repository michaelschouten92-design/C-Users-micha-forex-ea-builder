import { describe, it, expect, vi, beforeEach } from "vitest";
import { runVerification } from "./verification-service";

const { mockAppendProofEvent } = vi.hoisted(() => ({
  mockAppendProofEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/proof/events", () => ({
  appendProofEvent: mockAppendProofEvent,
}));

function makeTrades(count: number): Record<string, unknown>[] {
  return Array.from({ length: count }, (_, i) => ({ id: i }));
}

describe("runVerification", () => {
  beforeEach(() => {
    mockAppendProofEvent.mockClear();
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
    expect(result.transitioned).toBe(true);
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
    expect(result.transitioned).toBe(false);
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
    expect(result.transitioned).toBe(false);
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
    expect(result.transitioned).toBe(false);
  });

  it("RUN_COMPLETED is written for any verdict", async () => {
    await runVerification({
      strategyId: "strat_5",
      strategyVersion: 2,
      currentLifecycleState: "BACKTESTED",
      tradeHistory: makeTrades(100),
      backtestParameters: {},
    });

    expect(mockAppendProofEvent).toHaveBeenCalledTimes(1);
    expect(mockAppendProofEvent).toHaveBeenCalledWith(
      "strat_5",
      "VERIFICATION_RUN_COMPLETED",
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

  it("READY writes both events in correct order", async () => {
    await runVerification({
      strategyId: "strat_6",
      strategyVersion: 1,
      currentLifecycleState: "BACKTESTED",
      tradeHistory: makeTrades(100),
      backtestParameters: {},
      intermediateResults: { robustnessScores: { composite: 1.0 } },
    });

    expect(mockAppendProofEvent).toHaveBeenCalledTimes(2);
    expect(mockAppendProofEvent.mock.calls[0][1]).toBe("VERIFICATION_RUN_COMPLETED");
    expect(mockAppendProofEvent.mock.calls[1][1]).toBe("VERIFICATION_PASSED");
  });

  it("payload contains required fields and recordId is stable across both events", async () => {
    await runVerification({
      strategyId: "strat_7",
      strategyVersion: 3,
      currentLifecycleState: "BACKTESTED",
      tradeHistory: makeTrades(100),
      backtestParameters: {},
      intermediateResults: { robustnessScores: { composite: 1.0 } },
    });

    const runPayload = mockAppendProofEvent.mock.calls[0][2] as Record<string, unknown>;
    const passedPayload = mockAppendProofEvent.mock.calls[1][2] as Record<string, unknown>;

    // recordId and timestamp must be identical across both events
    expect(runPayload.recordId).toBe(passedPayload.recordId);
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
        recordId: expect.any(String),
        timestamp: expect.any(String),
      })
    );

    // VERIFICATION_PASSED has its contract fields
    expect(passedPayload).toEqual(
      expect.objectContaining({
        eventType: "VERIFICATION_PASSED",
        strategyId: "strat_7",
        strategyVersion: 3,
        recordId: expect.any(String),
        timestamp: expect.any(String),
      })
    );
  });

  it("throws when event persistence fails (non-READY)", async () => {
    mockAppendProofEvent.mockRejectedValueOnce(new Error("DB write failed"));

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

  it("throws when event persistence fails (READY)", async () => {
    mockAppendProofEvent
      .mockResolvedValueOnce(undefined) // RUN_COMPLETED succeeds
      .mockRejectedValueOnce(new Error("DB write failed")); // VERIFICATION_PASSED fails

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

  it("does not attempt VERIFICATION_PASSED if RUN_COMPLETED fails (READY)", async () => {
    mockAppendProofEvent.mockRejectedValueOnce(new Error("DB write failed"));

    await expect(
      runVerification({
        strategyId: "strat_fail_3",
        strategyVersion: 1,
        currentLifecycleState: "BACKTESTED",
        tradeHistory: makeTrades(100),
        backtestParameters: {},
        intermediateResults: { robustnessScores: { composite: 1.0 } },
      })
    ).rejects.toThrow("DB write failed");

    // Only RUN_COMPLETED was attempted; VERIFICATION_PASSED was never called
    expect(mockAppendProofEvent).toHaveBeenCalledTimes(1);
    expect(mockAppendProofEvent).toHaveBeenCalledWith(
      "strat_fail_3",
      "VERIFICATION_RUN_COMPLETED",
      expect.any(Object)
    );
  });
});
