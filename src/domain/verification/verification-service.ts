import { createHash } from "node:crypto";
import { computeVerdict } from "./compute-verdict";
import type {
  VerificationInput,
  VerificationResult,
  TradeRecord,
  BacktestParameters,
  ReasonCode,
} from "./types";
import type { StrategyLifecycleState } from "@/lib/strategy-lifecycle/transitions";
import { applyLifecycleTransition } from "@/lib/strategy-lifecycle/lifecycle-transition";
import { appendVerificationRunProof } from "@/lib/proof/events";
import {
  loadActiveConfigWithFallback,
  NoActiveConfigError,
  ConfigIntegrityError,
} from "./config-loader";
import type { ConfigSource } from "./config-loader";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import {
  ingestTradeFactsFromDeals,
  buildTradeSnapshot,
  deriveIntermediateResults,
} from "@/domain/trade-ingest";
import type { TradeSnapshot } from "@/domain/trade-ingest";
import type { ParsedDeal } from "@/lib/backtest-parser/types";

const log = logger.child({ module: "verification" });

/**
 * Derive a deterministic 32-bit seed for Monte Carlo simulation.
 * Same recordId + thresholdsHash → same seed → identical MC results.
 */
export function deriveMonteCarloSeed(recordId: string, thresholdsHash: string): number {
  const hash = createHash("sha256")
    .update(recordId + thresholdsHash, "utf8")
    .digest("hex");
  return parseInt(hash.slice(0, 8), 16);
}

/** Pure domain value object — replaces boolean flags for lifecycle decisions. */
export type TransitionDecision =
  | {
      kind: "TRANSITION";
      from: StrategyLifecycleState;
      to: StrategyLifecycleState;
      reason: string;
    }
  | { kind: "NO_TRANSITION"; reason: string };

export interface RunVerificationParams {
  strategyId: string;
  strategyVersion: number;
  currentLifecycleState: StrategyLifecycleState;
  tradeHistory: TradeRecord[];
  backtestParameters: BacktestParameters;
  intermediateResults?: VerificationInput["intermediateResults"];
  backtestRunId?: string;
}

export interface RunVerificationResult {
  verdictResult: VerificationResult;
  lifecycleState: StrategyLifecycleState;
  decision: TransitionDecision;
  configSource: ConfigSource | "missing";
  monteCarloSeed?: number;
}

/**
 * Pure decision: should we transition the lifecycle?
 * No IO — safe to call before persistence.
 */
function decideTransition(
  verdict: VerificationResult["verdict"],
  currentState: StrategyLifecycleState
): TransitionDecision {
  if (verdict === "READY" && currentState === "BACKTESTED") {
    return {
      kind: "TRANSITION",
      from: "BACKTESTED",
      to: "VERIFIED",
      reason: "verification_passed",
    };
  }

  if (verdict !== "READY") {
    return { kind: "NO_TRANSITION", reason: `verdict_${verdict.toLowerCase()}` };
  }

  return {
    kind: "NO_TRANSITION",
    reason: `state_not_eligible:${currentState}`,
  };
}

/**
 * Build a NOT_DEPLOYABLE result for governance failures (missing or tampered config).
 * No thresholds are available — all scores are null/zero.
 */
function buildGovernanceFailureResult(
  strategyId: string,
  strategyVersion: number,
  reasonCode: ReasonCode
): VerificationResult {
  return {
    strategyId,
    strategyVersion,
    verdict: "NOT_DEPLOYABLE",
    reasonCodes: [reasonCode],
    scores: {
      composite: 0,
      walkForwardDegradationPct: null,
      walkForwardOosSampleSize: null,
      monteCarloRuinProbability: null,
      sampleSize: 0,
    },
    thresholdsUsed: {
      configVersion: "unknown",
      thresholdsHash: "unknown",
      minTradeCount: 0,
      readyConfidenceThreshold: 0,
      notDeployableThreshold: 0,
      maxSharpeDegradationPct: 0,
      extremeSharpeDegradationPct: 0,
      minOosTradeCount: 0,
      ruinProbabilityCeiling: 0,
      monteCarloIterations: 0,
    },
    warnings: [],
  };
}

/**
 * Orchestrates verdict computation, proof persistence, and lifecycle transition.
 *
 * Governance enforcement:
 *   - Missing ACTIVE config → NOT_DEPLOYABLE + CONFIG_SNAPSHOT_MISSING
 *   - Tampered config hash  → NOT_DEPLOYABLE + CONFIG_HASH_MISMATCH
 *   - Both still write a VERIFICATION_RUN_COMPLETED proof event.
 *   - DB connectivity errors propagate as exceptions (route returns 500).
 *
 * Ordering guarantee: the lifecycle transition result
 * (decision.kind="TRANSITION", lifecycleState="VERIFIED") is only
 * constructed AFTER proof ledger persistence succeeds. If persistence
 * fails, no transitioned result ever exists — the error propagates
 * to the caller (fail-closed).
 */
export async function runVerification(
  params: RunVerificationParams
): Promise<RunVerificationResult> {
  const {
    strategyId,
    strategyVersion,
    currentLifecycleState,
    tradeHistory,
    backtestParameters,
    backtestRunId,
  } = params;
  let { intermediateResults } = params;

  // --- Phase 0: Load/ingest TradeFacts + derive intermediate results ---
  let snapshot: TradeSnapshot | undefined;

  if (backtestRunId) {
    try {
      // Check if TradeFacts already exist for this run
      const existingCount = await prisma.tradeFact.count({
        where: { strategyId, sourceRunId: backtestRunId },
      });

      if (existingCount === 0) {
        // Load BacktestRun and ingest deals
        const backtestRun = await prisma.backtestRun.findUniqueOrThrow({
          where: { id: backtestRunId },
          select: { trades: true, symbol: true, initialDeposit: true },
        });

        await ingestTradeFactsFromDeals({
          strategyId,
          source: "BACKTEST",
          sourceRunId: backtestRunId,
          deals: backtestRun.trades as unknown as ParsedDeal[],
          symbolFallback: backtestRun.symbol,
        });
      }

      // Load all TradeFacts for this strategy, ordered for deterministic snapshot
      const facts = await prisma.tradeFact.findMany({
        where: { strategyId },
        orderBy: [{ executedAt: "asc" }, { id: "asc" }],
      });

      // Load initialDeposit from BacktestRun
      const run = await prisma.backtestRun.findUniqueOrThrow({
        where: { id: backtestRunId },
        select: { initialDeposit: true },
      });

      snapshot = buildTradeSnapshot(facts, run.initialDeposit);

      // Derive MC + WF data server-side (overrides any client-supplied values)
      const derived = deriveIntermediateResults(facts, run.initialDeposit);
      intermediateResults = {
        ...intermediateResults,
        monteCarlo: derived.monteCarlo,
        walkForward: derived.walkForward,
      };
    } catch (err) {
      log.error(
        { err, strategyId, backtestRunId },
        "Phase 0: TradeFact ingest/snapshot build failed — returning NOT_DEPLOYABLE"
      );

      const verdictResult = buildGovernanceFailureResult(
        strategyId,
        strategyVersion,
        "SNAPSHOT_BUILD_FAILED"
      );
      const decision = decideTransition(verdictResult.verdict, currentLifecycleState);

      return {
        verdictResult,
        lifecycleState: currentLifecycleState,
        decision,
        configSource: "missing",
      };
    }
  }

  // --- Phase 1: Load config (may fail with governance error) ---
  let verdictResult: VerificationResult;
  let configVersion: string | null;
  let thresholdsHash: string | null;
  let configSource: ConfigSource | "missing";
  let mcSeed: number | undefined;

  // Generate recordId early so we can derive the MC seed before computeVerdict.
  const recordId = crypto.randomUUID();

  try {
    const loaded = await loadActiveConfigWithFallback();
    configSource = loaded.source;

    const input: VerificationInput = {
      strategyId,
      strategyVersion,
      tradeHistory,
      backtestParameters,
      intermediateResults,
    };

    // Derive MC seed when monteCarlo data is provided
    if (intermediateResults?.monteCarlo) {
      mcSeed = deriveMonteCarloSeed(recordId, loaded.config.thresholdsHash);
    }

    verdictResult = computeVerdict(
      input,
      loaded.config,
      mcSeed !== undefined ? { monteCarloSeed: mcSeed } : undefined
    );
    configVersion = verdictResult.thresholdsUsed.configVersion;
    thresholdsHash = verdictResult.thresholdsUsed.thresholdsHash;
  } catch (err) {
    if (err instanceof NoActiveConfigError) {
      log.warn({ strategyId, strategyVersion }, "No ACTIVE config — returning NOT_DEPLOYABLE");
      verdictResult = buildGovernanceFailureResult(
        strategyId,
        strategyVersion,
        "CONFIG_SNAPSHOT_MISSING"
      );
      configVersion = null;
      thresholdsHash = null;
      configSource = "missing";
    } else if (err instanceof ConfigIntegrityError) {
      log.error(
        { strategyId, strategyVersion, details: err.details },
        "Config integrity failure — returning NOT_DEPLOYABLE"
      );
      verdictResult = buildGovernanceFailureResult(
        strategyId,
        strategyVersion,
        "CONFIG_HASH_MISMATCH"
      );
      configVersion = null;
      thresholdsHash = null;
      configSource = "missing";
    } else {
      throw err; // DB connectivity etc. → 500
    }
  }

  const decision = decideTransition(verdictResult.verdict, currentLifecycleState);

  // --- Phase 2: Persist proof events BEFORE finalizing lifecycle result ---
  const timestamp = new Date().toISOString();

  try {
    await appendVerificationRunProof({
      strategyId,
      recordId,
      runCompletedPayload: {
        eventType: "VERIFICATION_RUN_COMPLETED",
        strategyId,
        strategyVersion,
        verdict: verdictResult.verdict,
        reasonCodes: verdictResult.reasonCodes,
        configVersion,
        thresholdsHash,
        configSource,
        recordId,
        timestamp,
        ...(mcSeed !== undefined && {
          monteCarloSeed: mcSeed,
          monteCarloIterations: verdictResult.thresholdsUsed.monteCarloIterations,
        }),
        ...(snapshot && {
          tradeSnapshotHash: snapshot.snapshotHash,
          tradeFactCount: snapshot.factCount,
          snapshotRange: snapshot.range,
          dataSources: snapshot.dataSources,
        }),
      },
      passedPayload:
        decision.kind === "TRANSITION"
          ? {
              eventType: "VERIFICATION_PASSED",
              strategyId,
              strategyVersion,
              recordId,
              timestamp,
            }
          : undefined,
    });
  } catch (err) {
    log.error(
      { err, recordId, timestamp, strategyId, strategyVersion, decision },
      "Failed to persist verification events"
    );
    throw err;
  }

  // --- Phase 3: Lifecycle transition (only after proof persistence succeeded) ---
  if (decision.kind === "TRANSITION") {
    const newState = applyLifecycleTransition(
      strategyId,
      strategyVersion,
      decision.from,
      decision.to,
      decision.reason
    );
    return {
      verdictResult,
      lifecycleState: newState,
      decision,
      configSource,
      monteCarloSeed: mcSeed,
    };
  }

  return {
    verdictResult,
    lifecycleState: currentLifecycleState,
    decision,
    configSource,
    monteCarloSeed: mcSeed,
  };
}
