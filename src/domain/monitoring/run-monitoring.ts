/**
 * Monitoring run orchestrator — executes a single monitoring evaluation.
 *
 * Phases:
 *   0. Load config (reuse verification config-loader)
 *   1. Build LIVE trade snapshot (scoped to source=LIVE)
 *   2. Evaluate monitoring rules (currently stub)
 *   3. Write MONITORING_RUN_COMPLETED proof event (fail-closed)
 *   4. Persist MonitoringRun row with outcome
 *
 * Does NOT mutate lifecycle state — that comes in a future step.
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
import { appendProofEvent } from "@/lib/proof/events";
import { evaluateMonitoring } from "./evaluate-monitoring";
import { MONITORING } from "./constants";
import type { MonitoringVerdict } from "./types";

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

    try {
      const loaded = await loadActiveConfigWithFallback();
      configVersion = loaded.config.configVersion;
      thresholdsHash = loaded.config.thresholdsHash;
      configSource = loaded.source;
    } catch (err) {
      if (err instanceof NoActiveConfigError || err instanceof ConfigIntegrityError) {
        // Config unavailable — fail the run, still write proof if possible
        const errorMessage =
          err instanceof ConfigIntegrityError
            ? `Config integrity error: ${err.message}`
            : "No active monitoring config";

        await failRun(run.id, recordId, strategyId, errorMessage);
        return {
          runId: run.id,
          recordId,
          verdict: "AT_RISK",
          reasons: ["CONFIG_UNAVAILABLE"],
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
      await failRun(run.id, recordId, strategyId, "No LIVE TradeFacts found for strategy");
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

    // Phase 2: Evaluate rules
    const evalResult = evaluateMonitoring({
      strategyId,
      liveFactCount: snapshot.factCount,
      snapshotHash: snapshot.snapshotHash,
      configVersion,
    });

    // Phase 3: Write proof event (fail-closed)
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
      timestamp,
    });

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
 * Mark a run as FAILED with a specific error message.
 * Attempts to write a MONITORING_RUN_COMPLETED proof event with the failure reason.
 */
async function failRun(
  runId: string,
  recordId: string,
  strategyId: string,
  errorMessage: string
): Promise<void> {
  // Best-effort proof event for failed runs
  try {
    await appendProofEvent(strategyId, "MONITORING_RUN_COMPLETED", {
      eventType: "MONITORING_RUN_COMPLETED",
      recordId,
      strategyId,
      monitoringVerdict: null,
      reasons: [errorMessage],
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
      errorMessage,
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
