/**
 * Monitoring run orchestrator — executes a single monitoring evaluation.
 *
 * Phases:
 *   0.  Load config (reuse verification config-loader)
 *   1.  Build LIVE trade snapshot (scoped to source=LIVE)
 *   1b. Compute live metrics from trade PnLs
 *   1c. Load baselines from BacktestBaseline
 *   1d. Load CUSUM drift from HealthSnapshots
 *   2.  Evaluate monitoring rules (5 deterministic rules)
 *   3.  Write MONITORING_RUN_COMPLETED proof event (fail-closed)
 *   3b. Lifecycle transition: decide → proof event → mutate (fail-closed)
 *   4.  Persist MonitoringRun row with outcome
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { buildTradeSnapshot } from "@/domain/trade-ingest";
import {
  loadActiveConfigWithFallback,
  NoActiveConfigError,
  ConfigIntegrityError,
} from "@/domain/verification/config-loader";
import type { MonitoringThresholds } from "@/domain/verification/config-snapshot";
import { appendProofEvent } from "@/lib/proof/events";
import { evaluateMonitoring } from "./evaluate-monitoring";
import { MONITORING } from "./constants";
import {
  computeLiveMaxDrawdownPct,
  computeSharpe,
  computeCurrentLosingStreak,
  computeDaysSinceLastTrade,
} from "./live-metrics";
import { MonitoringConfigError } from "./types";
import type { MonitoringVerdict } from "./types";
import { decideMonitoringTransition } from "./decide-monitoring-transition";
import type { TransitionDecision } from "./decide-monitoring-transition";
import { performLifecycleTransition } from "@/lib/strategy-lifecycle/transition-service";
import type { StrategyLifecycleState } from "@/lib/strategy-lifecycle/transitions";

const log = logger.child({ service: "monitoring-run" });

export interface RunMonitoringParams {
  strategyId: string;
  source: string; // "live_ingest" | "manual"
}

export interface RunMonitoringResult {
  runId: string;
  recordId: string;
  verdict: MonitoringVerdict;
  reasons: string[];
  tradeSnapshotHash: string | null;
  liveFactCount: number;
  transition?: { from: string; to: string; proofEventType: string };
}

/**
 * Execute a monitoring run for the given strategy.
 *
 * Creates a MonitoringRun row in PENDING, transitions through RUNNING,
 * and ends as COMPLETED or FAILED. Proof event is written before completion.
 */
export async function runMonitoring(params: RunMonitoringParams): Promise<RunMonitoringResult> {
  const { strategyId, source } = params;
  const recordId = crypto.randomUUID();

  // Create PENDING run row — partial unique index enforces at most one
  // active (PENDING/RUNNING) run per strategy. P2002 = already running.
  let run;
  try {
    run = await prisma.monitoringRun.create({
      data: {
        strategyId,
        source,
        recordId,
        status: "PENDING",
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      log.info({ strategyId }, "Monitoring run skipped: active run already exists");
      return {
        runId: "",
        recordId,
        verdict: "HEALTHY",
        reasons: ["CONCURRENT_RUN_EXISTS"],
        tradeSnapshotHash: null,
        liveFactCount: 0,
      };
    }
    throw err;
  }

  // Mark as RUNNING
  await prisma.monitoringRun.update({
    where: { id: run.id },
    data: { status: "RUNNING", startedAt: new Date() },
  });

  try {
    // Phase 0: Load config
    let configVersion: string;
    let thresholdsHash: string;
    let configSource: string;
    let monitoringThresholds: MonitoringThresholds;

    try {
      const loaded = await loadActiveConfigWithFallback();
      configVersion = loaded.config.configVersion;
      thresholdsHash = loaded.config.thresholdsHash;
      configSource = loaded.source;

      // Config-loader enforces monitoringThresholds for v2+ via ConfigIntegrityError.
      // This guard catches unexpected v1 configs reaching the monitoring path.
      if (!loaded.config.monitoringThresholds) {
        throw new MonitoringConfigError(`Config ${configVersion} missing monitoringThresholds`);
      }
      monitoringThresholds = loaded.config.monitoringThresholds;
    } catch (err) {
      if (
        err instanceof NoActiveConfigError ||
        err instanceof ConfigIntegrityError ||
        err instanceof MonitoringConfigError
      ) {
        // Config unavailable or invalid — fail the run with a stable reason code.
        const reasonCode =
          err instanceof MonitoringConfigError
            ? err.reasonCode // "MONITORING_CONFIG_INVALID"
            : "CONFIG_UNAVAILABLE";

        const diagnostic =
          err instanceof ConfigIntegrityError
            ? `Config integrity error: ${err.message}`
            : err instanceof MonitoringConfigError
              ? err.message
              : "No active monitoring config";

        await failRun(run.id, recordId, strategyId, reasonCode, diagnostic);
        return {
          runId: run.id,
          recordId,
          verdict: "AT_RISK",
          reasons: [reasonCode],
          tradeSnapshotHash: null,
          liveFactCount: 0,
        };
      }
      throw err;
    }

    // Phase 1: Build LIVE trade snapshot
    const liveFacts = await prisma.tradeFact.findMany({
      where: { strategyId, source: "LIVE" },
      orderBy: [{ executedAt: "asc" }, { id: "asc" }],
    });

    if (liveFacts.length === 0) {
      // No live facts — cannot evaluate, mark FAILED
      await failRun(
        run.id,
        recordId,
        strategyId,
        "NO_LIVE_DATA",
        "No LIVE TradeFacts found for strategy"
      );
      return {
        runId: run.id,
        recordId,
        verdict: "HEALTHY",
        reasons: ["NO_LIVE_DATA"],
        tradeSnapshotHash: null,
        liveFactCount: 0,
      };
    }

    // Use a nominal initialBalance of 10000 for live snapshot hashing.
    // The hash is used for change detection, not absolute values.
    const LIVE_SNAPSHOT_INITIAL_BALANCE = 10000;
    const snapshot = buildTradeSnapshot(liveFacts, LIVE_SNAPSHOT_INITIAL_BALANCE);

    // Phase 1b: Compute live metrics
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentPnls = liveFacts
      .filter((f) => f.executedAt >= thirtyDaysAgo)
      .sort((a, b) => a.executedAt.getTime() - b.executedAt.getTime())
      .map((f) => f.profit);

    const liveMaxDrawdownPct = computeLiveMaxDrawdownPct(
      snapshot.tradePnls,
      LIVE_SNAPSHOT_INITIAL_BALANCE
    );
    const liveRollingSharpe = computeSharpe(recentPnls);
    const currentLosingStreak = computeCurrentLosingStreak(snapshot.tradePnls);
    const daysSinceLastTrade = computeDaysSinceLastTrade(
      new Date(snapshot.range.latest),
      new Date()
    );

    // Phase 1c: Load baselines
    const baseline = await prisma.backtestBaseline.findFirst({
      where: {
        strategyVersion: {
          strategyIdentity: { strategyId },
        },
      },
      orderBy: { createdAt: "desc" },
      select: { maxDrawdownPct: true, sharpeRatio: true },
    });
    const baselineMissing = !baseline;

    // Phase 1d: Load CUSUM drift from HealthSnapshots
    const driftSnapshots = await prisma.healthSnapshot.findMany({
      where: {
        instance: {
          strategyVersion: {
            strategyIdentity: { strategyId },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: monitoringThresholds.cusumDriftConsecutiveSnapshots,
      select: { driftDetected: true },
    });
    let consecutiveDriftSnapshots = 0;
    for (const snap of driftSnapshots) {
      if (snap.driftDetected) consecutiveDriftSnapshots++;
      else break;
    }

    // Phase 2: Evaluate rules
    const evalResult = evaluateMonitoring(
      {
        strategyId,
        configVersion,
        liveFactCount: snapshot.factCount,
        snapshotHash: snapshot.snapshotHash,
        liveMaxDrawdownPct,
        liveRollingSharpe,
        currentLosingStreak,
        daysSinceLastTrade,
        baselineMaxDrawdownPct: baseline?.maxDrawdownPct ?? null,
        baselineSharpeRatio: baseline?.sharpeRatio ?? null,
        baselineMissing,
        consecutiveDriftSnapshots,
      },
      monitoringThresholds
    );

    // Phase 2b: Compute transition decision (before proof event, so it's included)
    const instance = await resolveInstanceForStrategy(strategyId);
    let transitionDecision: TransitionDecision = { type: "NO_TRANSITION", reason: "no_instance" };
    let consecutiveHealthyRuns = 0;

    if (instance) {
      const dbConsecutive = await countConsecutiveHealthyRuns(strategyId);
      // +1 counting: current run not yet persisted, add 1 if current is HEALTHY
      consecutiveHealthyRuns = evalResult.verdict === "HEALTHY" ? dbConsecutive + 1 : 0;

      transitionDecision = decideMonitoringTransition({
        currentLifecycleState: instance.lifecycleState,
        monitoringVerdict: evalResult.verdict,
        reasons: evalResult.reasons,
        consecutiveHealthyRuns,
        recoveryRunsRequired: monitoringThresholds.recoveryRunsRequired,
      });
    }

    // Phase 3: Write MONITORING_RUN_COMPLETED proof event (fail-closed)
    const timestamp = new Date().toISOString();
    await appendProofEvent(strategyId, "MONITORING_RUN_COMPLETED", {
      eventType: "MONITORING_RUN_COMPLETED",
      recordId,
      strategyId,
      monitoringVerdict: evalResult.verdict,
      reasons: evalResult.reasons,
      ruleResults: evalResult.ruleResults,
      tradeSnapshotHash: snapshot.snapshotHash,
      liveFactCount: snapshot.factCount,
      snapshotRange: snapshot.range,
      configVersion,
      thresholdsHash,
      configSource,
      liveMaxDrawdownPct,
      liveRollingSharpe,
      currentLosingStreak,
      daysSinceLastTrade,
      baselineMissing,
      consecutiveDriftSnapshots,
      transitionDecision: {
        type: transitionDecision.type,
        ...(transitionDecision.type === "TRANSITION"
          ? { from: transitionDecision.from, to: transitionDecision.to }
          : {}),
        reason: transitionDecision.reason,
      },
      consecutiveHealthyRuns,
      timestamp,
    });

    // Phase 3b: Lifecycle transition — proof event → mutation (fail-closed)
    let transition: { from: string; to: string; proofEventType: string } | undefined;

    if (transitionDecision.type === "TRANSITION" && instance) {
      // Write transition proof event FIRST — if this fails, no lifecycle mutation
      await appendProofEvent(strategyId, transitionDecision.proofEventType, {
        eventType: transitionDecision.proofEventType,
        recordId,
        strategyId,
        from: transitionDecision.from,
        to: transitionDecision.to,
        triggeringReasons: evalResult.reasons,
        consecutiveHealthyRuns,
        tradeSnapshotHash: snapshot.snapshotHash,
        liveFactCount: snapshot.factCount,
        configVersion,
        thresholdsHash,
        timestamp,
      });

      // Mutate lifecycle state
      await performLifecycleTransition(
        instance.instanceId,
        transitionDecision.from as StrategyLifecycleState,
        transitionDecision.to as StrategyLifecycleState,
        transitionDecision.reason
      );

      transition = {
        from: transitionDecision.from,
        to: transitionDecision.to,
        proofEventType: transitionDecision.proofEventType,
      };
    }

    // Phase 4: Mark run as COMPLETED
    await prisma.monitoringRun.update({
      where: { id: run.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        verdict: evalResult.verdict,
        reasons: evalResult.reasons,
        tradeSnapshotHash: snapshot.snapshotHash,
        liveFactCount: snapshot.factCount,
        configVersion,
        thresholdsHash,
        configSource,
      },
    });

    return {
      runId: run.id,
      recordId,
      verdict: evalResult.verdict,
      reasons: evalResult.reasons,
      tradeSnapshotHash: snapshot.snapshotHash,
      liveFactCount: snapshot.factCount,
      transition,
    };
  } catch (err) {
    // Any uncaught error — mark run as FAILED
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    log.error({ err, strategyId, runId: run.id, recordId }, "Monitoring run failed");

    await prisma.monitoringRun
      .update({
        where: { id: run.id },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          errorMessage,
        },
      })
      .catch((updateErr) => {
        log.error({ err: updateErr, runId: run.id }, "Failed to mark monitoring run as FAILED");
      });

    throw err;
  }
}

/**
 * Resolve the LiveEAInstance for a strategy.
 * Returns instanceId + current lifecycleState, or null if no instance exists.
 */
async function resolveInstanceForStrategy(
  strategyId: string
): Promise<{ instanceId: string; lifecycleState: string } | null> {
  const instance = await prisma.liveEAInstance.findFirst({
    where: {
      strategyVersion: {
        strategyIdentity: { strategyId },
      },
    },
    select: { id: true, lifecycleState: true },
  });
  if (!instance) return null;
  return { instanceId: instance.id, lifecycleState: instance.lifecycleState };
}

/**
 * Count consecutive HEALTHY monitoring runs (most recent first).
 * Only counts already-persisted COMPLETED runs — the current run is NOT yet persisted.
 * Bounded to 20 rows for efficiency.
 */
async function countConsecutiveHealthyRuns(strategyId: string): Promise<number> {
  const recentRuns = await prisma.monitoringRun.findMany({
    where: {
      strategyId,
      status: "COMPLETED",
    },
    orderBy: { completedAt: "desc" },
    take: 20,
    select: { verdict: true },
  });

  let count = 0;
  for (const run of recentRuns) {
    if (run.verdict === "HEALTHY") count++;
    else break;
  }
  return count;
}

/**
 * Mark a run as FAILED.
 *
 * @param reasonCode  Stable code recorded in proof event reasons (e.g. "CONFIG_UNAVAILABLE").
 * @param diagnostic  Human-readable detail stored in MonitoringRun.errorMessage (bounded, non-sensitive).
 */
async function failRun(
  runId: string,
  recordId: string,
  strategyId: string,
  reasonCode: string,
  diagnostic: string
): Promise<void> {
  // Best-effort proof event for failed runs
  try {
    await appendProofEvent(strategyId, "MONITORING_RUN_COMPLETED", {
      eventType: "MONITORING_RUN_COMPLETED",
      recordId,
      strategyId,
      monitoringVerdict: null,
      reasons: [reasonCode],
      ruleResults: [],
      tradeSnapshotHash: null,
      liveFactCount: 0,
      configVersion: null,
      thresholdsHash: null,
      configSource: null,
      timestamp: new Date().toISOString(),
    });
  } catch (proofErr) {
    log.error({ err: proofErr, runId, recordId }, "Failed to write proof event for failed run");
  }

  await prisma.monitoringRun.update({
    where: { id: runId },
    data: {
      status: "FAILED",
      completedAt: new Date(),
      errorMessage: diagnostic,
    },
  });
}

/**
 * Check if a monitoring run is allowed for the given strategy (cooldown check).
 *
 * Uses DB-based cooldown: queries the last COMPLETED or FAILED run's completedAt
 * and rejects if within COOLDOWN_SECONDS.
 *
 * Returns true if a new run is allowed.
 */
export async function isMonitoringCooldownExpired(strategyId: string): Promise<boolean> {
  const lastRun = await prisma.monitoringRun.findFirst({
    where: {
      strategyId,
      status: { in: ["COMPLETED", "FAILED"] },
    },
    orderBy: { completedAt: "desc" },
    select: { completedAt: true },
  });

  if (!lastRun?.completedAt) return true;

  const elapsedSeconds = (Date.now() - lastRun.completedAt.getTime()) / 1000;
  return elapsedSeconds >= MONITORING.COOLDOWN_SECONDS;
}
