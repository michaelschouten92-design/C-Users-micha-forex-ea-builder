import { describe, it, expect, vi, beforeEach } from "vitest";
import { runVerification } from "./verification-service";

const {
  mockAppendVerificationRunProof,
  mockLoadActiveConfigWithFallback,
  MockNoActiveConfigError,
  MockConfigIntegrityError,
} = vi.hoisted(() => {
  // Inline the snapshot to avoid referencing hoisted imports
  const snapshot = {
    configVersion: "1.0.0",
    thresholds: {
      minTradeCount: 30,
      readyConfidenceThreshold: 0.75,
      notDeployableThreshold: 0.45,
      maxSharpeDegradationPct: 40,
      extremeSharpeDegradationPct: 80,
      minOosTradeCount: 20,
      ruinProbabilityCeiling: 0.15,
      monteCarloIterations: 10_000,
    },
    thresholdsHash: "placeholder",
  };

  class MockNoActiveConfigError extends Error {
    constructor() {
      super("No ACTIVE VerificationConfig found in database");
      this.name = "NoActiveConfigError";
    }
  }

  class MockConfigIntegrityError extends Error {
    details: { expected: string; actual: string };
    constructor(message: string, details: { expected: string; actual: string }) {
      super(message);
      this.name = "ConfigIntegrityError";
      this.details = details;
    }
  }

  return {
    mockAppendVerificationRunProof: vi.fn().mockResolvedValue({
      runCompleted: { sequence: 1, eventHash: "a".repeat(64), type: "VERIFICATION_RUN_COMPLETED" },
    }),
    mockLoadActiveConfigWithFallback: vi.fn().mockResolvedValue({
      config: snapshot,
      source: "db",
    }),
    MockNoActiveConfigError,
    MockConfigIntegrityError,
  };
});

vi.mock("@/lib/proof/events", () => ({
  appendVerificationRunProof: mockAppendVerificationRunProof,
}));

vi.mock("./config-loader", () => ({
  loadActiveConfigWithFallback: mockLoadActiveConfigWithFallback,
  NoActiveConfigError: MockNoActiveConfigError,
  ConfigIntegrityError: MockConfigIntegrityError,
}));

function makeTrades(count: number): Record<string, unknown>[] {
  return Array.from({ length: count }, (_, i) => ({ id: i }));
}

describe("runVerification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAppendVerificationRunProof.mockResolvedValue({
      runCompleted: { sequence: 1, eventHash: "a".repeat(64), type: "VERIFICATION_RUN_COMPLETED" },
    });
    mockLoadActiveConfigWithFallback.mockResolvedValue({
      config: {
        configVersion: "1.0.0",
        thresholds: {
          minTradeCount: 30,
          readyConfidenceThreshold: 0.75,
          notDeployableThreshold: 0.45,
          maxSharpeDegradationPct: 40,
          extremeSharpeDegradationPct: 80,
          minOosTradeCount: 20,
          ruinProbabilityCeiling: 0.15,
          monteCarloIterations: 10_000,
        },
        thresholdsHash: "placeholder",
      },
      source: "db",
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
        configVersion: expect.any(String),
        configSource: "db",
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
        configVersion: expect.any(String),
        configSource: "db",
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

  describe("D2 — Monte Carlo seed + proof payload", () => {
    it("proof payload includes monteCarloSeed when MC data provided", async () => {
      await runVerification({
        strategyId: "strat_mc_1",
        strategyVersion: 1,
        currentLifecycleState: "BACKTESTED",
        tradeHistory: makeTrades(100),
        backtestParameters: {},
        intermediateResults: {
          robustnessScores: { composite: 0.9 },
          monteCarlo: {
            tradePnls: [100, 200, 300, 150, 250],
            initialBalance: 1000,
          },
        },
      });

      const payload = mockAppendVerificationRunProof.mock.calls[0][0].runCompletedPayload;
      expect(payload.monteCarloSeed).toEqual(expect.any(Number));
      expect(payload.monteCarloIterations).toBe(10_000);
    });

    it("seed is deterministic for same recordId + thresholdsHash", async () => {
      // Import deriveMonteCarloSeed to test determinism directly
      const { deriveMonteCarloSeed } = await import("./verification-service");
      const seed1 = deriveMonteCarloSeed("record-abc", "hash-xyz");
      const seed2 = deriveMonteCarloSeed("record-abc", "hash-xyz");
      expect(seed1).toBe(seed2);

      // Different inputs → different seeds
      const seed3 = deriveMonteCarloSeed("record-def", "hash-xyz");
      expect(seed1).not.toBe(seed3);
    });

    it("proof payload omits monteCarloSeed when no MC data", async () => {
      await runVerification({
        strategyId: "strat_mc_2",
        strategyVersion: 1,
        currentLifecycleState: "BACKTESTED",
        tradeHistory: makeTrades(100),
        backtestParameters: {},
        intermediateResults: { robustnessScores: { composite: 0.9 } },
      });

      const payload = mockAppendVerificationRunProof.mock.calls[0][0].runCompletedPayload;
      expect(payload.monteCarloSeed).toBeUndefined();
      expect(payload.monteCarloIterations).toBeUndefined();
    });
  });

  describe("governance enforcement", () => {
    it("missing ACTIVE config → NOT_DEPLOYABLE + CONFIG_SNAPSHOT_MISSING", async () => {
      mockLoadActiveConfigWithFallback.mockRejectedValueOnce(new MockNoActiveConfigError());

      const result = await runVerification({
        strategyId: "strat_gov_1",
        strategyVersion: 1,
        currentLifecycleState: "BACKTESTED",
        tradeHistory: makeTrades(100),
        backtestParameters: {},
        intermediateResults: { robustnessScores: { composite: 1.0 } },
      });

      expect(result.verdictResult.verdict).toBe("NOT_DEPLOYABLE");
      expect(result.verdictResult.reasonCodes).toEqual(["CONFIG_SNAPSHOT_MISSING"]);
      expect(result.lifecycleState).toBe("BACKTESTED");
      expect(result.decision).toEqual({
        kind: "NO_TRANSITION",
        reason: "verdict_not_deployable",
      });
    });

    it("missing config still writes proof event with configSource='missing'", async () => {
      mockLoadActiveConfigWithFallback.mockRejectedValueOnce(new MockNoActiveConfigError());

      await runVerification({
        strategyId: "strat_gov_2",
        strategyVersion: 1,
        currentLifecycleState: "BACKTESTED",
        tradeHistory: makeTrades(100),
        backtestParameters: {},
      });

      expect(mockAppendVerificationRunProof).toHaveBeenCalledTimes(1);
      const payload = mockAppendVerificationRunProof.mock.calls[0][0].runCompletedPayload;

      expect(payload.configVersion).toBeNull();
      expect(payload.thresholdsHash).toBeNull();
      expect(payload.configSource).toBe("missing");
      expect(payload.verdict).toBe("NOT_DEPLOYABLE");
      expect(payload.reasonCodes).toEqual(["CONFIG_SNAPSHOT_MISSING"]);
      expect(payload.passedPayload).toBeUndefined();
    });

    it("config hash mismatch → NOT_DEPLOYABLE + CONFIG_HASH_MISMATCH", async () => {
      mockLoadActiveConfigWithFallback.mockRejectedValueOnce(
        new MockConfigIntegrityError("hash mismatch", {
          expected: "a".repeat(64),
          actual: "b".repeat(64),
        })
      );

      const result = await runVerification({
        strategyId: "strat_gov_3",
        strategyVersion: 2,
        currentLifecycleState: "BACKTESTED",
        tradeHistory: makeTrades(100),
        backtestParameters: {},
        intermediateResults: { robustnessScores: { composite: 1.0 } },
      });

      expect(result.verdictResult.verdict).toBe("NOT_DEPLOYABLE");
      expect(result.verdictResult.reasonCodes).toEqual(["CONFIG_HASH_MISMATCH"]);
      expect(result.lifecycleState).toBe("BACKTESTED");
      expect(result.decision).toEqual({
        kind: "NO_TRANSITION",
        reason: "verdict_not_deployable",
      });
    });

    it("hash mismatch still writes proof event with configSource='missing'", async () => {
      mockLoadActiveConfigWithFallback.mockRejectedValueOnce(
        new MockConfigIntegrityError("tampered", {
          expected: "a".repeat(64),
          actual: "b".repeat(64),
        })
      );

      await runVerification({
        strategyId: "strat_gov_4",
        strategyVersion: 2,
        currentLifecycleState: "BACKTESTED",
        tradeHistory: makeTrades(100),
        backtestParameters: {},
      });

      expect(mockAppendVerificationRunProof).toHaveBeenCalledTimes(1);
      const payload = mockAppendVerificationRunProof.mock.calls[0][0].runCompletedPayload;

      expect(payload.configVersion).toBeNull();
      expect(payload.thresholdsHash).toBeNull();
      expect(payload.configSource).toBe("missing");
      expect(payload.verdict).toBe("NOT_DEPLOYABLE");
      expect(payload.reasonCodes).toEqual(["CONFIG_HASH_MISMATCH"]);
    });

    it("governance failure never triggers lifecycle transition", async () => {
      // Even with READY-eligible params, config failure overrides to NOT_DEPLOYABLE
      mockLoadActiveConfigWithFallback.mockRejectedValueOnce(new MockNoActiveConfigError());

      const result = await runVerification({
        strategyId: "strat_gov_5",
        strategyVersion: 1,
        currentLifecycleState: "BACKTESTED",
        tradeHistory: makeTrades(100),
        backtestParameters: {},
        intermediateResults: { robustnessScores: { composite: 1.0 } },
      });

      // Must NOT transition — governance failure overrides everything
      expect(result.decision.kind).toBe("NO_TRANSITION");
      expect(result.lifecycleState).toBe("BACKTESTED");
    });

    it("DB connectivity error still throws (route returns 500)", async () => {
      mockLoadActiveConfigWithFallback.mockRejectedValueOnce(new Error("Connection refused"));

      await expect(
        runVerification({
          strategyId: "strat_gov_6",
          strategyVersion: 1,
          currentLifecycleState: "BACKTESTED",
          tradeHistory: makeTrades(100),
          backtestParameters: {},
        })
      ).rejects.toThrow("Connection refused");

      // No proof event written for infra failures
      expect(mockAppendVerificationRunProof).not.toHaveBeenCalled();
    });

    it("proof payload includes configSource='db' on normal path", async () => {
      await runVerification({
        strategyId: "strat_gov_7",
        strategyVersion: 1,
        currentLifecycleState: "BACKTESTED",
        tradeHistory: makeTrades(100),
        backtestParameters: {},
      });

      const payload = mockAppendVerificationRunProof.mock.calls[0][0].runCompletedPayload;
      expect(payload.configSource).toBe("db");
      expect(payload.configVersion).toEqual(expect.any(String));
      expect(payload.thresholdsHash).toEqual(expect.any(String));
    });

    it("proof payload includes configSource='fallback' when fallback used", async () => {
      mockLoadActiveConfigWithFallback.mockResolvedValueOnce({
        config: {
          configVersion: "1.0.0",
          thresholds: {
            minTradeCount: 30,
            readyConfidenceThreshold: 0.75,
            notDeployableThreshold: 0.45,
            maxSharpeDegradationPct: 40,
            extremeSharpeDegradationPct: 80,
            minOosTradeCount: 20,
            ruinProbabilityCeiling: 0.15,
            monteCarloIterations: 10_000,
          },
          thresholdsHash: "fallback-hash",
        },
        source: "fallback",
      });

      await runVerification({
        strategyId: "strat_gov_8",
        strategyVersion: 1,
        currentLifecycleState: "BACKTESTED",
        tradeHistory: makeTrades(100),
        backtestParameters: {},
      });

      const payload = mockAppendVerificationRunProof.mock.calls[0][0].runCompletedPayload;
      expect(payload.configSource).toBe("fallback");
    });
  });
});
