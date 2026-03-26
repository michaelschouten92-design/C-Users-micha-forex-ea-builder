/**
 * Monitoring run orchestrator — executes a single monitoring evaluation.
 *
 * Instance-first: each run is scoped to a specific LiveEAInstance.
 * strategyId is retained for proof chain continuity and TradeFact queries.
 *
 * Phases:
 *   0.  Load config (reuse verification config-loader)
 *   1.  Build LIVE trade snapshot (scoped to source=LIVE, strategyId — TradeFact is strategy-scoped)
 *   1b. Compute live metrics from trade PnLs
 *   1c. Load baselines from BacktestBaseline (via instance's strategyVersionId)
 *   1d. Load CUSUM drift from HealthSnapshots (scoped to this instance)
 *   2.  Evaluate monitoring rules (5 deterministic rules)
 *   3+3b+4. Atomic transaction (Serializable):
 *       - Mark run COMPLETED
 *       - Count consecutive healthy runs (per instance)
 *       - Compute transition decision
 *       - Write MONITORING_RUN_COMPLETED proof event
 *       - If TRANSITION: write transition proof event → validate → mutate lifecycle
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
import { appendProofEvent, appendProofEventInTx } from "@/lib/proof/events";
import { evaluateMonitoring } from "./evaluate-monitoring";
import { MONITORING } from "./constants";
import {
  computeLiveMaxDrawdownPct,
  computeSharpe,
  computeLiveProfitFactor,
  computeLiveWinRate,
  computeCurrentLosingStreak,
  computeDaysSinceLastTrade,
} from "./live-metrics";
import { MonitoringConfigError } from "./types";
import type { MonitoringVerdict } from "./types";
import { decideMonitoringTransition } from "./decide-monitoring-transition";
import type { TransitionDecision } from "./decide-monitoring-transition";
import { performLifecycleTransitionInTx } from "@/lib/strategy-lifecycle/transition-service";
import type { StrategyLifecycleState } from "@/lib/strategy-lifecycle/transitions";
import { buildIncidentData } from "@/domain/incidents/open-incident";
import {
  emitTransitionAlerts,
  emitControlLayerAlert,
  emitMonitoringSignalAlerts,
  clearAlertByDedupe,
} from "@/lib/alerts/control-layer-alerts";
const log = logger.child({ service: "monitoring-run" });

export interface RunMonitoringParams {
  instanceId: string;
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
 * Execute a monitoring run for the given instance.
 *
 * Creates a MonitoringRun row in PENDING, transitions through RUNNING,
 * and ends as COMPLETED or FAILED. Proof event is written before completion.
 */
export async function runMonitoring(params: RunMonitoringParams): Promise<RunMonitoringResult> {
  const { instanceId, strategyId, source } = params;
  const recordId = crypto.randomUUID();

  // Reclaim stale active runs (crash recovery).
  // A PENDING/RUNNING row older than STALE_RUN_THRESHOLD_MS is presumed
  // orphaned from a process crash. Mark it FAILED to unblock the instance.
  await prisma.monitoringRun.updateMany({
    where: {
      instanceId,
      status: { in: ["PENDING", "RUNNING"] },
      requestedAt: { lt: new Date(Date.now() - MONITORING.STALE_RUN_THRESHOLD_MS) },
    },
    data: {
      status: "FAILED",
      completedAt: new Date(),
      errorMessage: "Reclaimed: stale active run (presumed process crash)",
    },
  });

  // Create PENDING run row — partial unique index enforces at most one
  // active (PENDING/RUNNING) run per instance. P2002 = already running.
  let run;
  try {
    run = await prisma.monitoringRun.create({
      data: {
        instanceId,
        strategyId,
        source,
        recordId,
        status: "PENDING",
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      log.info({ instanceId, strategyId }, "Monitoring run skipped: active run already exists");
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

        await failRun(run.id, recordId, strategyId, instanceId, reasonCode, diagnostic);
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

    // Phase 1: Build LIVE trade snapshot — instance-scoped.
    // Primary: query by instanceId (post-migration rows).
    // Fallback: if no instance-scoped rows exist, fall back to strategyId
    // for pre-migration LIVE TradeFacts that lack instanceId.
    let liveFacts = await prisma.tradeFact.findMany({
      where: { instanceId, source: "LIVE" },
      orderBy: [{ executedAt: "asc" }, { id: "asc" }],
    });

    if (liveFacts.length === 0) {
      // Pre-migration fallback: load LIVE facts by strategyId where instanceId is null.
      // This is narrow — only picks up rows that were never tagged with an instance.
      liveFacts = await prisma.tradeFact.findMany({
        where: { strategyId, source: "LIVE", instanceId: null },
        orderBy: [{ executedAt: "asc" }, { id: "asc" }],
      });
      if (liveFacts.length > 0) {
        log.info(
          { instanceId, strategyId, count: liveFacts.length },
          "Using pre-migration LIVE TradeFacts (instanceId=null fallback)"
        );
      }
    }

    if (liveFacts.length === 0) {
      // No live facts — cannot evaluate, mark FAILED
      await failRun(
        run.id,
        recordId,
        strategyId,
        instanceId,
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
    const liveProfitFactor = computeLiveProfitFactor(recentPnls);
    const liveWinRate = computeLiveWinRate(recentPnls);
    const currentLosingStreak = computeCurrentLosingStreak(snapshot.tradePnls);
    const daysSinceLastTrade = computeDaysSinceLastTrade(
      new Date(snapshot.range.latest),
      new Date()
    );

    // Phase 1c: Load baselines via instance's specific strategyVersionId.
    // This is more precise than querying through strategyId — it uses the exact
    // version linked to this instance, not the latest version of the strategy.
    const instanceForBaseline = await prisma.liveEAInstance.findUnique({
      where: { id: instanceId },
      select: { strategyVersionId: true },
    });
    let baseline: {
      maxDrawdownPct: number;
      sharpeRatio: number | null;
      profitFactor: number;
      winRate: number;
    } | null = null;
    if (instanceForBaseline?.strategyVersionId) {
      baseline = await prisma.backtestBaseline.findUnique({
        where: { strategyVersionId: instanceForBaseline.strategyVersionId },
        select: { maxDrawdownPct: true, sharpeRatio: true, profitFactor: true, winRate: true },
      });
    }
    const baselineMissing = !baseline;

    // Fail-safe: abort if no verified baseline exists.
    // The trigger already guards this, but this catches race conditions
    // (e.g. baseline unlinked between trigger and evaluation) and
    // alternative entry points (e.g. manual runs).
    if (baselineMissing) {
      await failRun(
        run.id,
        recordId,
        strategyId,
        instanceId,
        "NO_VERIFIED_BASELINE",
        "No BacktestBaseline found — monitoring requires a verified baseline"
      );
      return {
        runId: run.id,
        recordId,
        verdict: "HEALTHY",
        reasons: ["NO_VERIFIED_BASELINE"],
        tradeSnapshotHash: snapshot.snapshotHash,
        liveFactCount: liveFacts.length,
      };
    }

    // Phase 1d: Load CUSUM drift from HealthSnapshots scoped to THIS instance.
    // Previously queried through strategyId which could blend multiple instances.
    const driftSnapshots = await prisma.healthSnapshot.findMany({
      where: { instanceId },
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
        instanceId,
        strategyId,
        configVersion,
        liveFactCount: snapshot.factCount,
        snapshotHash: snapshot.snapshotHash,
        liveMaxDrawdownPct,
        liveRollingSharpe,
        liveProfitFactor,
        liveWinRate,
        currentLosingStreak,
        daysSinceLastTrade,
        baselineMaxDrawdownPct: baseline?.maxDrawdownPct ?? null,
        baselineSharpeRatio: baseline?.sharpeRatio ?? null,
        baselineProfitFactor: baseline?.profitFactor ?? null,
        baselineWinRate: baseline?.winRate ?? null,
        baselineMissing,
        consecutiveDriftSnapshots,
      },
      monitoringThresholds
    );

    // Phase 3+3b+4 (atomic): proof events + lifecycle transition + run COMPLETED.
    // All writes in a single Serializable transaction — either all commit or none.
    const timestamp = new Date().toISOString();

    const atomicResult = await prisma.$transaction(
      async (tx) => {
        // a. Mark run COMPLETED
        await tx.monitoringRun.update({
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

        // b. Re-verify baseline is still linked (guards against concurrent unlink
        // between Phase 1c read and this atomic commit).
        const baselineCheck = await tx.liveEAInstance.findUnique({
          where: { id: instanceId },
          select: { strategyVersionId: true },
        });
        if (!baselineCheck?.strategyVersionId) {
          throw Object.assign(new Error("Baseline unlinked during monitoring run"), { code: "BASELINE_GONE" });
        }

        // c. Load instance lifecycle state — use the known instanceId directly,
        // not findFirst through strategyId (which could pick a wrong instance).
        const instanceRow = await tx.liveEAInstance.findUnique({
          where: { id: instanceId },
          select: { id: true, lifecycleState: true, userId: true },
        });
        const instance = instanceRow
          ? {
              instanceId: instanceRow.id,
              lifecycleState: instanceRow.lifecycleState,
              userId: instanceRow.userId,
            }
          : null;

        // c. Count consecutive HEALTHY runs for THIS INSTANCE
        // (includes current, now COMPLETED — no +1 hack)
        let consecutiveHealthyRuns = 0;
        if (instance) {
          const recentRuns = await tx.monitoringRun.findMany({
            where: { instanceId, status: "COMPLETED" },
            orderBy: { completedAt: "desc" },
            take: 20,
            select: { verdict: true },
          });
          for (const r of recentRuns) {
            if (r.verdict === "HEALTHY") consecutiveHealthyRuns++;
            else break;
          }
        }

        // d. Compute transition decision
        let transitionDecision: TransitionDecision = {
          type: "NO_TRANSITION",
          reason: "no_instance",
        };
        if (instance) {
          transitionDecision = decideMonitoringTransition({
            currentLifecycleState: instance.lifecycleState,
            monitoringVerdict: evalResult.verdict,
            reasons: evalResult.reasons,
            consecutiveHealthyRuns,
            recoveryRunsRequired: monitoringThresholds.recoveryRunsRequired,
          });
        }

        // e. Write MONITORING_RUN_COMPLETED proof event
        await appendProofEventInTx(tx, strategyId, "MONITORING_RUN_COMPLETED", {
          eventType: "MONITORING_RUN_COMPLETED",
          recordId,
          instanceId,
          strategyId,
          monitoringVerdict: evalResult.verdict,
          reasons: evalResult.reasons,
          ruleResults: JSON.stringify(evalResult.ruleResults),
          tradeSnapshotHash: snapshot.snapshotHash,
          liveFactCount: snapshot.factCount,
          snapshotRange: JSON.stringify(snapshot.range),
          configVersion,
          thresholdsHash,
          configSource,
          liveMaxDrawdownPct,
          liveRollingSharpe,
          currentLosingStreak,
          daysSinceLastTrade,
          baselineMissing,
          consecutiveDriftSnapshots,
          transitionDecision: JSON.stringify({
            type: transitionDecision.type,
            ...(transitionDecision.type === "TRANSITION"
              ? { from: transitionDecision.from, to: transitionDecision.to }
              : {}),
            reason: transitionDecision.reason,
          }),
          consecutiveHealthyRuns,
          timestamp,
        });

        // f. Lifecycle transition — proof event → validate → mutate (via lifecycle module)
        let transition: { from: string; to: string; proofEventType: string } | undefined;

        if (transitionDecision.type === "TRANSITION" && instance) {
          // Write transition proof event FIRST — if this fails, no lifecycle mutation
          await appendProofEventInTx(tx, strategyId, transitionDecision.proofEventType, {
            eventType: transitionDecision.proofEventType,
            recordId,
            instanceId,
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

          // Validate + mutate via lifecycle module (single ownership of lifecycle mutations)
          await performLifecycleTransitionInTx(
            tx,
            instance.instanceId,
            transitionDecision.from as StrategyLifecycleState,
            transitionDecision.to as StrategyLifecycleState,
            transitionDecision.reason,
            "monitoring"
          );

          transition = {
            from: transitionDecision.from,
            to: transitionDecision.to,
            proofEventType: transitionDecision.proofEventType,
          };

          // Enqueue durable alert — fails → entire tx rolls back → no silent loss
          await tx.alertOutbox.create({
            data: {
              eventType: "lifecycle_transition",
              dedupeKey: `lifecycle_transition:${recordId}`,
              payload: {
                instanceId,
                strategyId,
                fromState: transitionDecision.from,
                toState: transitionDecision.to,
                monitoringVerdict: evalResult.verdict,
                reasonCodes: evalResult.reasons,
                tradeSnapshotHash: snapshot.snapshotHash,
                configVersion,
                thresholdsHash,
                recordId,
              },
            },
          });

          // g. In-app control-layer alert — atomic with transition
          await emitTransitionAlerts(tx, {
            userId: instance.userId,
            instanceId,
            fromState: transitionDecision.from!,
            toState: transitionDecision.to!,
            reasons: evalResult.reasons,
          });

          // h. Incident management — atomic with transition, scoped to instance
          if (transitionDecision.to === "EDGE_AT_RISK") {
            // Open incident for this specific instance
            const incidentData = buildIncidentData({
              strategyId,
              instanceId,
              severity: "AT_RISK",
              triggerRecordId: recordId,
              reasonCodes: evalResult.reasons,
              snapshotHash: snapshot.snapshotHash,
              configVersion,
              thresholdsHash,
              ackDeadlineMinutes: monitoringThresholds.ackDeadlineMinutes,
              autoInvalidateMinutes: monitoringThresholds.autoInvalidateMinutes,
              now: new Date(),
            });
            try {
              const incident = await tx.incident.create({ data: incidentData });

              await appendProofEventInTx(tx, strategyId, "INCIDENT_OPENED", {
                eventType: "INCIDENT_OPENED",
                recordId,
                instanceId,
                strategyId,
                incidentId: incident.id,
                severity: incidentData.severity,
                reasonCodes: evalResult.reasons,
                ackDeadlineAt: incidentData.ackDeadlineAt.toISOString(),
                invalidateDeadlineAt: incidentData.invalidateDeadlineAt?.toISOString() ?? null,
                configVersion,
                thresholdsHash,
                timestamp,
              });

              await tx.alertOutbox.create({
                data: {
                  eventType: "incident_opened",
                  dedupeKey: `incident_opened:${incident.id}`,
                  payload: {
                    instanceId,
                    strategyId,
                    incidentId: incident.id,
                    severity: incidentData.severity,
                    reasonCodes: evalResult.reasons,
                    ackDeadlineAt: incidentData.ackDeadlineAt.toISOString(),
                  },
                },
              });
            } catch (incidentErr) {
              if (
                incidentErr instanceof Prisma.PrismaClientKnownRequestError &&
                incidentErr.code === "P2002"
              ) {
                log.warn({ instanceId, strategyId }, "Incident already exists (P2002)");
              } else {
                throw incidentErr;
              }
            }
          } else if (
            transitionDecision.to === "LIVE_MONITORING" ||
            transitionDecision.to === "INVALIDATED"
          ) {
            // Close incident for this instance on recovery or invalidation
            const openIncident = await tx.incident.findFirst({
              where: { instanceId, status: { not: "CLOSED" } },
            });
            if (openIncident) {
              const closeReason =
                transitionDecision.to === "LIVE_MONITORING" ? "RECOVERED" : "INVALIDATED";
              await tx.incident.update({
                where: { id: openIncident.id },
                data: { status: "CLOSED", closedAt: new Date(), closeReason },
              });

              await appendProofEventInTx(tx, strategyId, "INCIDENT_CLOSED", {
                eventType: "INCIDENT_CLOSED",
                recordId,
                instanceId,
                strategyId,
                incidentId: openIncident.id,
                closeReason,
                configVersion,
                thresholdsHash,
                timestamp,
              });

              await tx.alertOutbox.create({
                data: {
                  eventType: "incident_closed",
                  dedupeKey: `incident_closed:${openIncident.id}`,
                  payload: {
                    instanceId,
                    strategyId,
                    incidentId: openIncident.id,
                    closeReason,
                  },
                },
              });
            }
          }
        }

        return { consecutiveHealthyRuns, transition, userId: instance?.userId ?? null };
      },
      { isolationLevel: "Serializable" }
    );

    // ── Fire-and-forget control-layer alerts (outside serializable tx) ──

    if (atomicResult.userId) {
      const userId = atomicResult.userId;

      // DEPLOYMENT_REVIEW: verdict AT_RISK but no lifecycle transition occurred
      if (evalResult.verdict === "AT_RISK" && !atomicResult.transition) {
        emitControlLayerAlert(prisma, {
          userId,
          instanceId,
          alertType: "DEPLOYMENT_REVIEW",
          reasons: evalResult.reasons,
        }).catch((err) => {
          log.error({ err, instanceId }, "Failed to emit DEPLOYMENT_REVIEW alert");
        });
      }

      // BASELINE_MISSING / VERSION_OUTDATED: condition-based with clear-on-resolve
      const versionOutdated = instanceForBaseline?.strategyVersionId
        ? await prisma.strategyIdentity
            .findUnique({
              where: { strategyId },
              select: { currentVersionId: true },
            })
            .then((si) =>
              si?.currentVersionId
                ? instanceForBaseline!.strategyVersionId !== si.currentVersionId
                : false
            )
        : false;

      emitMonitoringSignalAlerts(prisma, {
        userId,
        instanceId,
        baselineMissing,
        versionOutdated,
      }).catch((err) => {
        log.error({ err, instanceId }, "Failed to emit monitoring signal alerts");
      });

      // Clear resolved conditions
      if (!baselineMissing) {
        clearAlertByDedupe(prisma, `BASELINE_MISSING:${instanceId}`).catch((err) => {
          log.error({ err, instanceId }, "Failed to clear BASELINE_MISSING alert");
        });
      }
      if (!versionOutdated) {
        clearAlertByDedupe(prisma, `VERSION_OUTDATED:${instanceId}`).catch((err) => {
          log.error({ err, instanceId }, "Failed to clear VERSION_OUTDATED alert");
        });
      }
    }

    return {
      runId: run.id,
      recordId,
      verdict: evalResult.verdict,
      reasons: evalResult.reasons,
      tradeSnapshotHash: snapshot.snapshotHash,
      liveFactCount: snapshot.factCount,
      transition: atomicResult.transition,
    };
  } catch (err) {
    // Controlled exit: baseline was unlinked during the monitoring run
    if (err instanceof Error && (err as { code?: string }).code === "BASELINE_GONE") {
      log.warn({ instanceId, strategyId, runId: run.id }, "Baseline unlinked during monitoring run — aborting cleanly");
      await failRun(run.id, recordId, strategyId, instanceId, "NO_VERIFIED_BASELINE", err.message);
      return { runId: run.id, recordId, verdict: "HEALTHY" as const, reasons: ["NO_VERIFIED_BASELINE"], tradeSnapshotHash: "", liveFactCount: 0 };
    }

    // Any uncaught error — mark run as FAILED
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    log.error({ err, instanceId, strategyId, runId: run.id, recordId }, "Monitoring run failed");

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
 * Mark a run as FAILED.
 *
 * @param reasonCode  Stable code recorded in proof event reasons (e.g. "CONFIG_UNAVAILABLE").
 * @param diagnostic  Human-readable detail stored in MonitoringRun.errorMessage (bounded, non-sensitive).
 */
async function failRun(
  runId: string,
  recordId: string,
  strategyId: string,
  instanceId: string,
  reasonCode: string,
  diagnostic: string
): Promise<void> {
  // Best-effort proof event for failed runs
  try {
    await appendProofEvent(strategyId, "MONITORING_RUN_COMPLETED", {
      eventType: "MONITORING_RUN_COMPLETED",
      recordId,
      instanceId,
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
 * Check if a monitoring run is allowed for the given instance (cooldown check).
 *
 * Uses DB-based cooldown: queries the last COMPLETED or FAILED run's completedAt
 * and rejects if within COOLDOWN_SECONDS.
 *
 * Instance-first: cooldown is per instance, not per strategy.
 * This ensures one instance's monitoring doesn't block another's.
 *
 * Returns true if a new run is allowed.
 */
export async function isMonitoringCooldownExpired(instanceId: string): Promise<boolean> {
  const lastRun = await prisma.monitoringRun.findFirst({
    where: {
      instanceId,
      status: { in: ["COMPLETED", "FAILED"] },
    },
    orderBy: { completedAt: "desc" },
    select: { completedAt: true },
  });

  if (!lastRun?.completedAt) return true;

  const elapsedSeconds = (Date.now() - lastRun.completedAt.getTime()) / 1000;
  return elapsedSeconds >= MONITORING.COOLDOWN_SECONDS;
}
