import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock handles ──────────────────────────────────────────────────────
const mockMonitoringRunCreate = vi.fn();
const mockMonitoringRunUpdate = vi.fn();
const mockMonitoringRunFindFirst = vi.fn();
const mockMonitoringRunFindMany = vi.fn();
const mockTradeFactFindMany = vi.fn();
const mockBacktestBaselineFindFirst = vi.fn();
const mockHealthSnapshotFindMany = vi.fn();
const mockLiveEAInstanceFindFirst = vi.fn();
const mockTransaction = vi.fn();
const mockAppendProofEvent = vi.fn();
const mockLoadActiveConfigWithFallback = vi.fn();
const mockBuildTradeSnapshot = vi.fn();
const mockEvaluateMonitoring = vi.fn();
const mockPerformLifecycleTransitionInTx = vi.fn();
const mockNotifyTransition = vi.fn();

// ── Module mocks ──────────────────────────────────────────────────────
vi.mock("@prisma/client", () => {
  class PrismaClientKnownRequestError extends Error {
    code: string;
    meta?: Record<string, unknown>;
    constructor(
      message: string,
      opts: { code: string; clientVersion?: string; meta?: Record<string, unknown> }
    ) {
      super(message);
      this.name = "PrismaClientKnownRequestError";
      this.code = opts.code;
      this.meta = opts.meta;
    }
  }
  return { Prisma: { PrismaClientKnownRequestError } };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: (...args: unknown[]) => mockTransaction(...args),
    monitoringRun: {
      create: (...args: unknown[]) => mockMonitoringRunCreate(...args),
      update: (...args: unknown[]) => mockMonitoringRunUpdate(...args),
      findFirst: (...args: unknown[]) => mockMonitoringRunFindFirst(...args),
      findMany: (...args: unknown[]) => mockMonitoringRunFindMany(...args),
    },
    tradeFact: {
      findMany: (...args: unknown[]) => mockTradeFactFindMany(...args),
    },
    backtestBaseline: {
      findFirst: (...args: unknown[]) => mockBacktestBaselineFindFirst(...args),
    },
    healthSnapshot: {
      findMany: (...args: unknown[]) => mockHealthSnapshotFindMany(...args),
    },
    liveEAInstance: {
      findFirst: (...args: unknown[]) => mockLiveEAInstanceFindFirst(...args),
    },
  },
}));

vi.mock("@/lib/proof/events", () => ({
  appendProofEvent: (...args: unknown[]) => mockAppendProofEvent(...args),
  appendProofEventInTx: (_tx: unknown, ...args: unknown[]) => mockAppendProofEvent(...args),
}));

vi.mock("@/lib/strategy-lifecycle/transition-service", () => ({
  performLifecycleTransitionInTx: (...args: unknown[]) =>
    mockPerformLifecycleTransitionInTx(...args),
}));

vi.mock("@/lib/notifications/notify", () => ({
  notifyTransition: (...args: unknown[]) => mockNotifyTransition(...args),
}));

vi.mock("@/domain/verification/config-loader", () => {
  class NoActiveConfigError extends Error {
    constructor(message = "No active config") {
      super(message);
      this.name = "NoActiveConfigError";
    }
  }
  class ConfigIntegrityError extends Error {
    details: { expected: string; actual: string };
    constructor(
      message = "Config integrity error",
      details: { expected: string; actual: string } = {
        expected: "",
        actual: "",
      }
    ) {
      super(message);
      this.name = "ConfigIntegrityError";
      this.details = details;
    }
  }
  return {
    loadActiveConfigWithFallback: (...args: unknown[]) => mockLoadActiveConfigWithFallback(...args),
    NoActiveConfigError,
    ConfigIntegrityError,
  };
});

vi.mock("@/domain/trade-ingest", () => ({
  buildTradeSnapshot: (...args: unknown[]) => mockBuildTradeSnapshot(...args),
}));

vi.mock("./evaluate-monitoring", () => ({
  evaluateMonitoring: (...args: unknown[]) => mockEvaluateMonitoring(...args),
}));

vi.mock("./constants", () => ({
  MONITORING: {
    COOLDOWN_SECONDS: 300,
    DRAWDOWN_BREACH_MULTIPLIER: 1.5,
    SHARPE_MIN_RATIO: 0.5,
    MAX_LOSING_STREAK: 10,
    MAX_INACTIVITY_DAYS: 14,
    CUSUM_DRIFT_CONSECUTIVE_SNAPSHOTS: 3,
    RECOVERY_RUNS_REQUIRED: 3,
  },
}));

vi.mock("./live-metrics", () => ({
  computeLiveMaxDrawdownPct: () => 5.0,
  computeSharpe: () => 1.2,
  computeCurrentLosingStreak: () => 2,
  computeDaysSinceLastTrade: () => 1,
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    child: () => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

const FAKE_UUID = "22222222-2222-2222-2222-222222222222";
const FAKE_RUN_ID = "cuid_run_1";

const MONITORING_THRESHOLDS = {
  drawdownBreachMultiplier: 1.5,
  sharpeMinRatio: 0.5,
  maxLosingStreak: 10,
  maxInactivityDays: 14,
  cusumDriftConsecutiveSnapshots: 3,
  recoveryRunsRequired: 3,
};

// ── Defaults ──────────────────────────────────────────────────────────
function setupDefaults() {
  vi.stubGlobal("crypto", { randomUUID: () => FAKE_UUID });

  mockMonitoringRunCreate.mockResolvedValue({ id: FAKE_RUN_ID });
  mockMonitoringRunUpdate.mockResolvedValue({});

  mockLoadActiveConfigWithFallback.mockResolvedValue({
    config: {
      configVersion: "2.1.0",
      thresholdsHash: "th_hash",
      monitoringThresholds: MONITORING_THRESHOLDS,
    },
    source: "active",
  });

  const now = new Date();
  mockTradeFactFindMany.mockResolvedValue([
    { id: "f1", profit: 100, executedAt: new Date(now.getTime() - 86400000), source: "LIVE" },
    { id: "f2", profit: -50, executedAt: now, source: "LIVE" },
  ]);

  mockBuildTradeSnapshot.mockReturnValue({
    snapshotHash: "live_snap_hash",
    tradePnls: [100, -50],
    initialBalance: 10000,
    factCount: 2,
    range: { earliest: "2025-01-01T00:00:00.000Z", latest: "2025-06-01T00:00:00.000Z" },
    dataSources: ["LIVE"],
  });

  mockBacktestBaselineFindFirst.mockResolvedValue({
    maxDrawdownPct: 8,
    sharpeRatio: 1.5,
  });

  mockHealthSnapshotFindMany.mockResolvedValue([]);

  mockEvaluateMonitoring.mockReturnValue({
    verdict: "HEALTHY",
    reasons: [],
    ruleResults: [],
  });

  mockAppendProofEvent.mockResolvedValue({ sequence: 1, eventHash: "eh_1" });

  // Default: no LiveEAInstance → no transition attempted
  mockLiveEAInstanceFindFirst.mockResolvedValue(null);
  // Default: no previous runs → consecutive healthy = 0
  mockMonitoringRunFindMany.mockResolvedValue([]);
  mockPerformLifecycleTransitionInTx.mockResolvedValue(undefined);
  mockNotifyTransition.mockResolvedValue(undefined);

  // $transaction executes callback with a mock tx that reuses the same mock handles
  mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
    const tx = {
      monitoringRun: {
        update: (...args: unknown[]) => mockMonitoringRunUpdate(...args),
        findMany: (...args: unknown[]) => mockMonitoringRunFindMany(...args),
      },
      liveEAInstance: {
        findFirst: (...args: unknown[]) => mockLiveEAInstanceFindFirst(...args),
      },
    };
    return fn(tx);
  });
}

// ── Tests ─────────────────────────────────────────────────────────────
describe("runMonitoring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaults();
  });

  async function importRunMonitoring() {
    const mod = await import("./run-monitoring");
    return mod.runMonitoring;
  }

  const params = { strategyId: "strat_1", source: "live_ingest" };

  // ── Happy path ────────────────────────────────────────────────────
  it("happy path: creates run, evaluates, writes proof, marks COMPLETED", async () => {
    const run = await importRunMonitoring();
    const result = await run(params);

    // 1. Created PENDING run row
    expect(mockMonitoringRunCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        strategyId: "strat_1",
        status: "PENDING",
        recordId: FAKE_UUID,
      }),
    });

    // 2. Transitioned to RUNNING
    expect(mockMonitoringRunUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: FAKE_RUN_ID },
        data: expect.objectContaining({ status: "RUNNING" }),
      })
    );

    // 3. Proof event written with live metrics + transitionDecision
    expect(mockAppendProofEvent).toHaveBeenCalledWith(
      "strat_1",
      "MONITORING_RUN_COMPLETED",
      expect.objectContaining({
        recordId: FAKE_UUID,
        monitoringVerdict: "HEALTHY",
        tradeSnapshotHash: "live_snap_hash",
        liveFactCount: 2,
        configVersion: "2.1.0",
        thresholdsHash: "th_hash",
        liveMaxDrawdownPct: 5.0,
        liveRollingSharpe: 1.2,
        currentLosingStreak: 2,
        daysSinceLastTrade: 1,
        baselineMissing: false,
        consecutiveDriftSnapshots: 0,
        transitionDecision: { type: "NO_TRANSITION", reason: "no_instance" },
        consecutiveHealthyRuns: 0,
      })
    );

    // 4. Marked COMPLETED
    expect(mockMonitoringRunUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: FAKE_RUN_ID },
        data: expect.objectContaining({
          status: "COMPLETED",
          verdict: "HEALTHY",
          tradeSnapshotHash: "live_snap_hash",
          liveFactCount: 2,
        }),
      })
    );

    // 5. Result shape
    expect(result).toEqual({
      runId: FAKE_RUN_ID,
      recordId: FAKE_UUID,
      verdict: "HEALTHY",
      reasons: [],
      tradeSnapshotHash: "live_snap_hash",
      liveFactCount: 2,
    });
  });

  // ── evaluateMonitoring called with expanded context + thresholds ──
  it("passes expanded MonitoringContext and MonitoringThresholds to evaluateMonitoring", async () => {
    const run = await importRunMonitoring();
    await run(params);

    expect(mockEvaluateMonitoring).toHaveBeenCalledWith(
      expect.objectContaining({
        strategyId: "strat_1",
        configVersion: "2.1.0",
        liveFactCount: 2,
        snapshotHash: "live_snap_hash",
        liveMaxDrawdownPct: 5.0,
        liveRollingSharpe: 1.2,
        currentLosingStreak: 2,
        daysSinceLastTrade: 1,
        baselineMaxDrawdownPct: 8,
        baselineSharpeRatio: 1.5,
        baselineMissing: false,
        consecutiveDriftSnapshots: 0,
      }),
      MONITORING_THRESHOLDS
    );
  });

  // ── Baseline missing ──────────────────────────────────────────────
  it("passes baselineMissing=true when no BacktestBaseline found", async () => {
    mockBacktestBaselineFindFirst.mockResolvedValue(null);

    const run = await importRunMonitoring();
    await run(params);

    expect(mockEvaluateMonitoring).toHaveBeenCalledWith(
      expect.objectContaining({
        baselineMaxDrawdownPct: null,
        baselineSharpeRatio: null,
        baselineMissing: true,
      }),
      MONITORING_THRESHOLDS
    );
  });

  // ── CUSUM drift counting ──────────────────────────────────────────
  it("counts consecutive drift snapshots correctly", async () => {
    mockHealthSnapshotFindMany.mockResolvedValue([
      { driftDetected: true },
      { driftDetected: true },
      { driftDetected: false },
    ]);

    const run = await importRunMonitoring();
    await run(params);

    expect(mockEvaluateMonitoring).toHaveBeenCalledWith(
      expect.objectContaining({
        consecutiveDriftSnapshots: 2,
      }),
      MONITORING_THRESHOLDS
    );
  });

  it("counts all drift snapshots when all report drift", async () => {
    mockHealthSnapshotFindMany.mockResolvedValue([
      { driftDetected: true },
      { driftDetected: true },
      { driftDetected: true },
    ]);

    const run = await importRunMonitoring();
    await run(params);

    expect(mockEvaluateMonitoring).toHaveBeenCalledWith(
      expect.objectContaining({
        consecutiveDriftSnapshots: 3,
      }),
      MONITORING_THRESHOLDS
    );
  });

  // ── Proof event fail-closed ───────────────────────────────────────
  it("fail-closed: proof event failure propagates and run is marked FAILED", async () => {
    mockAppendProofEvent.mockRejectedValue(new Error("Serialization failure"));

    const run = await importRunMonitoring();
    await expect(run(params)).rejects.toThrow("Serialization failure");

    // Run should be marked FAILED
    expect(mockMonitoringRunUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: FAKE_RUN_ID },
        data: expect.objectContaining({
          status: "FAILED",
          errorMessage: "Serialization failure",
        }),
      })
    );
  });

  // ── No LIVE data ──────────────────────────────────────────────────
  it("no LIVE data: run marked FAILED, proof event still written", async () => {
    mockTradeFactFindMany.mockResolvedValue([]);

    const run = await importRunMonitoring();
    const result = await run(params);

    expect(result.verdict).toBe("HEALTHY");
    expect(result.reasons).toEqual(["NO_LIVE_DATA"]);
    expect(result.liveFactCount).toBe(0);

    // Proof event is still written (best-effort for failed runs)
    expect(mockAppendProofEvent).toHaveBeenCalledWith(
      "strat_1",
      "MONITORING_RUN_COMPLETED",
      expect.objectContaining({
        monitoringVerdict: null,
        reasons: ["NO_LIVE_DATA"],
      })
    );

    // Run marked FAILED
    expect(mockMonitoringRunUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "FAILED",
          errorMessage: "No LIVE TradeFacts found for strategy",
        }),
      })
    );
  });

  // ── Config unavailable ────────────────────────────────────────────
  it("config unavailable: returns AT_RISK and marks run FAILED", async () => {
    const { NoActiveConfigError } = await import("@/domain/verification/config-loader");
    mockLoadActiveConfigWithFallback.mockRejectedValue(new NoActiveConfigError());

    const run = await importRunMonitoring();
    const result = await run(params);

    expect(result.verdict).toBe("AT_RISK");
    expect(result.reasons).toEqual(["CONFIG_UNAVAILABLE"]);

    // Run marked FAILED
    expect(mockMonitoringRunUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "FAILED",
          errorMessage: "No active monitoring config",
        }),
      })
    );
  });

  // ── Config integrity error ────────────────────────────────────────
  it("config integrity error: returns AT_RISK and marks run FAILED", async () => {
    const { ConfigIntegrityError } = await import("@/domain/verification/config-loader");
    mockLoadActiveConfigWithFallback.mockRejectedValue(
      new ConfigIntegrityError("hash mismatch", {
        expected: "abc",
        actual: "def",
      })
    );

    const run = await importRunMonitoring();
    const result = await run(params);

    expect(result.verdict).toBe("AT_RISK");
    expect(result.reasons).toEqual(["CONFIG_UNAVAILABLE"]);
  });

  // ── Config missing monitoringThresholds ─────────────────────────
  it("config without monitoringThresholds: returns AT_RISK with MONITORING_CONFIG_INVALID", async () => {
    mockLoadActiveConfigWithFallback.mockResolvedValue({
      config: {
        configVersion: "1.0.0",
        thresholdsHash: "old_hash",
        // No monitoringThresholds
      },
      source: "db",
    });

    const run = await importRunMonitoring();
    const result = await run(params);

    // Graceful fail-closed: AT_RISK with stable reason code
    expect(result.verdict).toBe("AT_RISK");
    expect(result.reasons).toEqual(["MONITORING_CONFIG_INVALID"]);

    // Run marked FAILED with diagnostic in errorMessage
    expect(mockMonitoringRunUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "FAILED",
          errorMessage: expect.stringContaining("missing monitoringThresholds"),
        }),
      })
    );

    // Proof event gets stable reason code, not raw diagnostic
    expect(mockAppendProofEvent).toHaveBeenCalledWith(
      "strat_1",
      "MONITORING_RUN_COMPLETED",
      expect.objectContaining({
        reasons: ["MONITORING_CONFIG_INVALID"],
      })
    );
  });

  // ── Snapshot build failure ────────────────────────────────────────
  it("fail-closed: snapshot build failure marks run FAILED + proof event still written", async () => {
    mockBuildTradeSnapshot.mockImplementation(() => {
      throw new Error("Snapshot build failed");
    });

    const run = await importRunMonitoring();
    await expect(run(params)).rejects.toThrow("Snapshot build failed");

    // Run marked FAILED
    expect(mockMonitoringRunUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "FAILED",
          errorMessage: "Snapshot build failed",
        }),
      })
    );
  });

  // ── Evaluation failure ────────────────────────────────────────────
  it("evaluation failure propagates and run is marked FAILED", async () => {
    mockEvaluateMonitoring.mockImplementation(() => {
      throw new Error("Rule engine crash");
    });

    const run = await importRunMonitoring();
    await expect(run(params)).rejects.toThrow("Rule engine crash");

    expect(mockMonitoringRunUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "FAILED",
          errorMessage: "Rule engine crash",
        }),
      })
    );
  });

  // ── Snapshot uses LIVE source filter ───────────────────────────────
  it("queries only LIVE TradeFacts for snapshot", async () => {
    const run = await importRunMonitoring();
    await run(params);

    expect(mockTradeFactFindMany).toHaveBeenCalledWith({
      where: { strategyId: "strat_1", source: "LIVE" },
      orderBy: [{ executedAt: "asc" }, { id: "asc" }],
    });
  });

  // ── Concurrent run protection (P2002) ─────────────────────────────
  it("returns no-op when a PENDING/RUNNING run already exists (P2002)", async () => {
    const { Prisma } = await import("@prisma/client");
    mockMonitoringRunCreate.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError(
        "Unique constraint failed on the fields: (`strategyId`)",
        { code: "P2002", clientVersion: "5.0.0", meta: { target: ["strategyId"] } }
      )
    );

    const run = await importRunMonitoring();
    const result = await run(params);

    expect(result).toEqual({
      runId: "",
      recordId: FAKE_UUID,
      verdict: "HEALTHY",
      reasons: ["CONCURRENT_RUN_EXISTS"],
      tradeSnapshotHash: null,
      liveFactCount: 0,
    });

    // No further DB calls or proof events
    expect(mockMonitoringRunUpdate).not.toHaveBeenCalled();
    expect(mockAppendProofEvent).not.toHaveBeenCalled();
    expect(mockTradeFactFindMany).not.toHaveBeenCalled();
  });

  it("re-throws non-P2002 Prisma errors from create", async () => {
    const { Prisma } = await import("@prisma/client");
    mockMonitoringRunCreate.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Connection refused", {
        code: "P1001",
        clientVersion: "5.0.0",
      })
    );

    const run = await importRunMonitoring();
    await expect(run(params)).rejects.toThrow("Connection refused");
  });

  // ── Lifecycle transitions ──────────────────────────────────────────

  const FAKE_INSTANCE_ID = "inst_1";

  /**
   * @param completedRunsInTx All COMPLETED runs visible inside the atomic tx
   *   (includes the current run, which is marked COMPLETED first).
   *   Ordered most-recent-first (current run is first element).
   */
  function setupInstanceAndVerdict(
    lifecycleState: string,
    verdict: "HEALTHY" | "AT_RISK" | "INVALIDATED",
    reasons: string[] = [],
    completedRunsInTx: { verdict: string }[] = []
  ) {
    mockLiveEAInstanceFindFirst.mockResolvedValue({
      id: FAKE_INSTANCE_ID,
      lifecycleState,
    });
    mockEvaluateMonitoring.mockReturnValue({
      verdict,
      reasons,
      ruleResults: [],
    });
    mockMonitoringRunFindMany.mockResolvedValue(completedRunsInTx);
  }

  it("LIVE_MONITORING + AT_RISK → STRATEGY_EDGE_AT_RISK proof event + lifecycle mutation (atomic)", async () => {
    setupInstanceAndVerdict(
      "LIVE_MONITORING",
      "AT_RISK",
      ["MONITORING_DRAWDOWN_BREACH"],
      [{ verdict: "AT_RISK" }]
    );

    const run = await importRunMonitoring();
    const result = await run(params);

    // Transition proof event written
    expect(mockAppendProofEvent).toHaveBeenCalledWith(
      "strat_1",
      "STRATEGY_EDGE_AT_RISK",
      expect.objectContaining({
        eventType: "STRATEGY_EDGE_AT_RISK",
        recordId: FAKE_UUID,
        from: "LIVE_MONITORING",
        to: "EDGE_AT_RISK",
        triggeringReasons: ["MONITORING_DRAWDOWN_BREACH"],
      })
    );

    // Lifecycle mutation via lifecycle module inside same transaction
    expect(mockPerformLifecycleTransitionInTx).toHaveBeenCalledWith(
      expect.anything(), // tx client
      FAKE_INSTANCE_ID,
      "LIVE_MONITORING",
      "EDGE_AT_RISK",
      expect.stringContaining("MONITORING_DRAWDOWN_BREACH"),
      "monitoring"
    );

    // All writes in a single Serializable transaction
    expect(mockTransaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "Serializable",
    });

    // Result includes transition
    expect(result.transition).toEqual({
      from: "LIVE_MONITORING",
      to: "EDGE_AT_RISK",
      proofEventType: "STRATEGY_EDGE_AT_RISK",
    });
  });

  it("EDGE_AT_RISK + INVALIDATED → STRATEGY_INVALIDATED proof event + lifecycle mutation (atomic)", async () => {
    setupInstanceAndVerdict(
      "EDGE_AT_RISK",
      "INVALIDATED",
      ["MONITORING_CUSUM_DRIFT"],
      [{ verdict: "INVALIDATED" }]
    );

    const run = await importRunMonitoring();
    const result = await run(params);

    expect(mockAppendProofEvent).toHaveBeenCalledWith(
      "strat_1",
      "STRATEGY_INVALIDATED",
      expect.objectContaining({
        from: "EDGE_AT_RISK",
        to: "INVALIDATED",
      })
    );

    expect(mockPerformLifecycleTransitionInTx).toHaveBeenCalledWith(
      expect.anything(),
      FAKE_INSTANCE_ID,
      "EDGE_AT_RISK",
      "INVALIDATED",
      expect.stringContaining("INVALIDATED"),
      "monitoring"
    );

    expect(result.transition).toEqual({
      from: "EDGE_AT_RISK",
      to: "INVALIDATED",
      proofEventType: "STRATEGY_INVALIDATED",
    });
  });

  it("EDGE_AT_RISK + HEALTHY with >= N consecutive → STRATEGY_RECOVERED + lifecycle mutation (atomic)", async () => {
    // 3 COMPLETED HEALTHY runs in DB (current + 2 previous, counted inside tx)
    setupInstanceAndVerdict(
      "EDGE_AT_RISK",
      "HEALTHY",
      [],
      [{ verdict: "HEALTHY" }, { verdict: "HEALTHY" }, { verdict: "HEALTHY" }]
    );

    const run = await importRunMonitoring();
    const result = await run(params);

    expect(mockAppendProofEvent).toHaveBeenCalledWith(
      "strat_1",
      "STRATEGY_RECOVERED",
      expect.objectContaining({
        from: "EDGE_AT_RISK",
        to: "LIVE_MONITORING",
        consecutiveHealthyRuns: 3,
      })
    );

    expect(mockPerformLifecycleTransitionInTx).toHaveBeenCalledWith(
      expect.anything(),
      FAKE_INSTANCE_ID,
      "EDGE_AT_RISK",
      "LIVE_MONITORING",
      expect.stringContaining("3 consecutive healthy runs"),
      "monitoring"
    );

    expect(result.transition).toEqual({
      from: "EDGE_AT_RISK",
      to: "LIVE_MONITORING",
      proofEventType: "STRATEGY_RECOVERED",
    });
  });

  it("EDGE_AT_RISK + HEALTHY with < N consecutive → no transition event", async () => {
    // 2 COMPLETED HEALTHY in DB (current + 1 previous) — < 3 recoveryRunsRequired
    setupInstanceAndVerdict(
      "EDGE_AT_RISK",
      "HEALTHY",
      [],
      [{ verdict: "HEALTHY" }, { verdict: "HEALTHY" }]
    );

    const run = await importRunMonitoring();
    const result = await run(params);

    // Only MONITORING_RUN_COMPLETED proof event, no transition event
    expect(mockAppendProofEvent).toHaveBeenCalledTimes(1);
    expect(mockAppendProofEvent).toHaveBeenCalledWith(
      "strat_1",
      "MONITORING_RUN_COMPLETED",
      expect.objectContaining({
        transitionDecision: expect.objectContaining({
          type: "NO_TRANSITION",
          reason: "recovering",
        }),
      })
    );

    expect(mockPerformLifecycleTransitionInTx).not.toHaveBeenCalled();
    expect(result.transition).toBeUndefined();
  });

  it("LIVE_MONITORING + INVALIDATED → no transition (must pass through EDGE_AT_RISK)", async () => {
    setupInstanceAndVerdict(
      "LIVE_MONITORING",
      "INVALIDATED",
      ["MONITORING_CUSUM_DRIFT"],
      [{ verdict: "INVALIDATED" }]
    );

    const run = await importRunMonitoring();
    const result = await run(params);

    // Only MONITORING_RUN_COMPLETED proof event
    expect(mockAppendProofEvent).toHaveBeenCalledTimes(1);
    expect(mockAppendProofEvent).toHaveBeenCalledWith(
      "strat_1",
      "MONITORING_RUN_COMPLETED",
      expect.objectContaining({
        transitionDecision: expect.objectContaining({
          type: "NO_TRANSITION",
          reason: "must_pass_through_edge_at_risk",
        }),
      })
    );

    expect(mockPerformLifecycleTransitionInTx).not.toHaveBeenCalled();
    expect(result.transition).toBeUndefined();
  });

  it("no instance found → no transition attempted", async () => {
    mockLiveEAInstanceFindFirst.mockResolvedValue(null);
    mockEvaluateMonitoring.mockReturnValue({
      verdict: "AT_RISK",
      reasons: ["MONITORING_DRAWDOWN_BREACH"],
      ruleResults: [],
    });

    const run = await importRunMonitoring();
    const result = await run(params);

    expect(mockPerformLifecycleTransitionInTx).not.toHaveBeenCalled();
    expect(result.transition).toBeUndefined();
  });

  it("transition proof event failure → error propagates, run FAILED, no lifecycle mutation", async () => {
    setupInstanceAndVerdict(
      "LIVE_MONITORING",
      "AT_RISK",
      ["MONITORING_DRAWDOWN_BREACH"],
      [{ verdict: "AT_RISK" }]
    );

    // First call (MONITORING_RUN_COMPLETED) succeeds, second call (STRATEGY_EDGE_AT_RISK) fails.
    // Transaction rolls back — neither COMPLETED nor lifecycle mutation persists.
    mockAppendProofEvent
      .mockResolvedValueOnce({ sequence: 1, eventHash: "eh_1" })
      .mockRejectedValueOnce(new Error("Proof write failed"));

    const run = await importRunMonitoring();
    await expect(run(params)).rejects.toThrow("Proof write failed");

    // Lifecycle was NOT mutated
    expect(mockPerformLifecycleTransitionInTx).not.toHaveBeenCalled();

    // Run marked FAILED by outer catch (tx rolled back COMPLETED)
    expect(mockMonitoringRunUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "FAILED",
          errorMessage: "Proof write failed",
        }),
      })
    );
  });

  it("consecutive healthy runs counted from DB (current AT_RISK breaks streak)", async () => {
    // Current run AT_RISK is first in DB (most recent), followed by 3 previous HEALTHY
    // → consecutive = 0 (AT_RISK breaks the streak immediately)
    setupInstanceAndVerdict(
      "EDGE_AT_RISK",
      "AT_RISK",
      ["MONITORING_DRAWDOWN_BREACH"],
      [
        { verdict: "AT_RISK" },
        { verdict: "HEALTHY" },
        { verdict: "HEALTHY" },
        { verdict: "HEALTHY" },
      ]
    );

    const run = await importRunMonitoring();
    await run(params);

    expect(mockAppendProofEvent).toHaveBeenCalledWith(
      "strat_1",
      "MONITORING_RUN_COMPLETED",
      expect.objectContaining({
        consecutiveHealthyRuns: 0,
      })
    );
  });

  it("MONITORING_RUN_COMPLETED proof includes transitionDecision for TRANSITION", async () => {
    setupInstanceAndVerdict(
      "LIVE_MONITORING",
      "AT_RISK",
      ["MONITORING_DRAWDOWN_BREACH"],
      [{ verdict: "AT_RISK" }]
    );

    const run = await importRunMonitoring();
    await run(params);

    expect(mockAppendProofEvent).toHaveBeenCalledWith(
      "strat_1",
      "MONITORING_RUN_COMPLETED",
      expect.objectContaining({
        transitionDecision: expect.objectContaining({
          type: "TRANSITION",
          from: "LIVE_MONITORING",
          to: "EDGE_AT_RISK",
        }),
      })
    );
  });

  // ── Atomicity ────────────────────────────────────────────────────

  it("transaction failure rolls back — run not marked COMPLETED, marked FAILED instead", async () => {
    setupInstanceAndVerdict(
      "LIVE_MONITORING",
      "AT_RISK",
      ["MONITORING_DRAWDOWN_BREACH"],
      [{ verdict: "AT_RISK" }]
    );

    // Simulate transaction-level failure (e.g. Serialization conflict)
    mockTransaction.mockRejectedValueOnce(new Error("Serialization failure"));

    const run = await importRunMonitoring();
    await expect(run(params)).rejects.toThrow("Serialization failure");

    // COMPLETED never persisted (tx rolled back)
    expect(mockMonitoringRunUpdate).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "COMPLETED" }),
      })
    );

    // Run marked FAILED by outer catch
    expect(mockMonitoringRunUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "FAILED" }),
      })
    );

    // No lifecycle mutation
    expect(mockPerformLifecycleTransitionInTx).not.toHaveBeenCalled();
  });

  // ── Notification wiring ───────────────────────────────────────────────
  it("calls notifyTransition with correct payload when transition occurs", async () => {
    setupInstanceAndVerdict(
      "LIVE_MONITORING",
      "AT_RISK",
      ["MONITORING_DRAWDOWN_BREACH"],
      [{ verdict: "AT_RISK" }]
    );

    const run = await importRunMonitoring();
    await run(params);

    expect(mockNotifyTransition).toHaveBeenCalledTimes(1);
    expect(mockNotifyTransition).toHaveBeenCalledWith({
      strategyId: "strat_1",
      fromState: "LIVE_MONITORING",
      toState: "EDGE_AT_RISK",
      monitoringVerdict: "AT_RISK",
      reasonCodes: ["MONITORING_DRAWDOWN_BREACH"],
      tradeSnapshotHash: "live_snap_hash",
      configVersion: "2.1.0",
      thresholdsHash: "th_hash",
      recordId: FAKE_UUID,
    });
  });

  it("does not call notifyTransition when no transition occurs", async () => {
    // No instance → no transition
    const run = await importRunMonitoring();
    await run(params);

    expect(mockNotifyTransition).not.toHaveBeenCalled();
  });

  it("notification failure does not affect RunMonitoringResult", async () => {
    setupInstanceAndVerdict(
      "LIVE_MONITORING",
      "AT_RISK",
      ["MONITORING_DRAWDOWN_BREACH"],
      [{ verdict: "AT_RISK" }]
    );
    mockNotifyTransition.mockRejectedValue(new Error("webhook failed"));

    const run = await importRunMonitoring();
    const result = await run(params);

    expect(result.transition).toEqual({
      from: "LIVE_MONITORING",
      to: "EDGE_AT_RISK",
      proofEventType: "STRATEGY_EDGE_AT_RISK",
    });
  });
});

describe("isMonitoringCooldownExpired", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function importCooldownCheck() {
    const mod = await import("./run-monitoring");
    return mod.isMonitoringCooldownExpired;
  }

  it("returns true when no previous run exists", async () => {
    mockMonitoringRunFindFirst.mockResolvedValue(null);

    const check = await importCooldownCheck();
    expect(await check("strat_1")).toBe(true);
  });

  it("returns true when last run completedAt is null", async () => {
    mockMonitoringRunFindFirst.mockResolvedValue({ completedAt: null });

    const check = await importCooldownCheck();
    expect(await check("strat_1")).toBe(true);
  });

  it("returns false when last run completed less than 5 min ago", async () => {
    const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000);
    mockMonitoringRunFindFirst.mockResolvedValue({
      completedAt: twoMinAgo,
    });

    const check = await importCooldownCheck();
    expect(await check("strat_1")).toBe(false);
  });

  it("returns true when last run completed more than 5 min ago", async () => {
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
    mockMonitoringRunFindFirst.mockResolvedValue({
      completedAt: tenMinAgo,
    });

    const check = await importCooldownCheck();
    expect(await check("strat_1")).toBe(true);
  });

  it("queries only COMPLETED and FAILED runs", async () => {
    mockMonitoringRunFindFirst.mockResolvedValue(null);

    const check = await importCooldownCheck();
    await check("strat_1");

    expect(mockMonitoringRunFindFirst).toHaveBeenCalledWith({
      where: {
        strategyId: "strat_1",
        status: { in: ["COMPLETED", "FAILED"] },
      },
      orderBy: { completedAt: "desc" },
      select: { completedAt: true },
    });
  });
});
