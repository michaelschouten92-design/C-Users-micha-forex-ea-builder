/**
 * Pure config snapshot module — single source of truth for threshold
 * hash computation and snapshot verification.
 *
 * No DB, no env, no time, no randomness. All functions are deterministic
 * and safe to call from any context.
 */

import { createHash } from "node:crypto";
import { VERIFICATION } from "./constants";
import { MONITORING } from "@/domain/monitoring/constants";

/** Threshold fields that participate in hash computation and verification runs. */
export interface VerificationThresholds {
  minTradeCount: number;
  readyConfidenceThreshold: number;
  notDeployableThreshold: number;
  maxSharpeDegradationPct: number;
  extremeSharpeDegradationPct: number;
  minOosTradeCount: number;
  ruinProbabilityCeiling: number;
  monteCarloIterations: number;
}

/** Monitoring threshold fields — governed, included in hash when present. */
export interface MonitoringThresholds {
  drawdownBreachMultiplier: number;
  sharpeMinRatio: number;
  maxLosingStreak: number;
  maxInactivityDays: number;
  cusumDriftConsecutiveSnapshots: number;
  recoveryRunsRequired: number;
}

/** Immutable snapshot of a config version — anchors every verification run. */
export interface VerificationThresholdsSnapshot {
  configVersion: string;
  thresholds: VerificationThresholds;
  monitoringThresholds?: MonitoringThresholds;
  thresholdsHash: string;
}

export interface SnapshotVerificationResult {
  valid: boolean;
  expected: string;
  actual: string;
}

/**
 * Returns true if the configVersion is 2.x or later.
 * Used to enforce structural requirements (e.g., monitoringThresholds must be present).
 */
export function isV2OrLater(configVersion: string): boolean {
  const major = parseInt(configVersion.split(".")[0], 10);
  return Number.isFinite(major) && major >= 2;
}

/**
 * Deterministic JSON — keys sorted alphabetically, compact.
 * Equivalent to stableJSON in proof/chain.ts but local to avoid
 * coupling domain code to proof infrastructure.
 */
function canonicalJSON(obj: Record<string, unknown>): string {
  return JSON.stringify(obj, Object.keys(obj).sort());
}

/**
 * Compute SHA-256 hash of a thresholds object.
 * Pure function — same input always produces the same hash.
 *
 * Preimage: canonical JSON of threshold fields only (sorted keys).
 * configVersion is intentionally excluded from the hash preimage —
 * it's metadata about the version, not a threshold value.
 *
 * When monitoringThresholds is provided, its fields are flattened into
 * the preimage with a `monitoring_` prefix. canonicalJSON sorts all keys
 * alphabetically → deterministic. When absent, hash is identical to v1.0.0
 * (backward compatible).
 */
export function computeThresholdsHash(
  thresholds: VerificationThresholds,
  monitoringThresholds?: MonitoringThresholds
): string {
  const preimage: Record<string, unknown> = {
    ...(thresholds as unknown as Record<string, unknown>),
  };

  if (monitoringThresholds) {
    for (const [key, value] of Object.entries(monitoringThresholds)) {
      preimage[`monitoring_${key}`] = value;
    }
  }

  const json = canonicalJSON(preimage);
  return createHash("sha256").update(json, "utf8").digest("hex");
}

/**
 * Build a complete snapshot from the current hardcoded constants.
 * Returns configVersion + all thresholds + computed hash.
 */
export function buildConfigSnapshot(): VerificationThresholdsSnapshot {
  const thresholds: VerificationThresholds = {
    minTradeCount: VERIFICATION.MIN_TRADE_COUNT,
    readyConfidenceThreshold: VERIFICATION.READY_CONFIDENCE_THRESHOLD,
    notDeployableThreshold: VERIFICATION.NOT_DEPLOYABLE_THRESHOLD,
    maxSharpeDegradationPct: VERIFICATION.MAX_SHARPE_DEGRADATION_PCT,
    extremeSharpeDegradationPct: VERIFICATION.EXTREME_SHARPE_DEGRADATION_PCT,
    minOosTradeCount: VERIFICATION.MIN_OOS_TRADE_COUNT,
    ruinProbabilityCeiling: VERIFICATION.RUIN_PROBABILITY_CEILING,
    monteCarloIterations: VERIFICATION.MONTE_CARLO_ITERATIONS,
  };

  const monitoringThresholds: MonitoringThresholds = {
    drawdownBreachMultiplier: MONITORING.DRAWDOWN_BREACH_MULTIPLIER,
    sharpeMinRatio: MONITORING.SHARPE_MIN_RATIO,
    maxLosingStreak: MONITORING.MAX_LOSING_STREAK,
    maxInactivityDays: MONITORING.MAX_INACTIVITY_DAYS,
    cusumDriftConsecutiveSnapshots: MONITORING.CUSUM_DRIFT_CONSECUTIVE_SNAPSHOTS,
    recoveryRunsRequired: MONITORING.RECOVERY_RUNS_REQUIRED,
  };

  return {
    configVersion: VERIFICATION.CONFIG_VERSION,
    thresholds,
    monitoringThresholds,
    thresholdsHash: computeThresholdsHash(thresholds, monitoringThresholds),
  };
}

/**
 * Verify a snapshot's integrity by recomputing the hash from its thresholds.
 * Returns whether the stored hash matches, plus both values for diagnostics.
 *
 * For configVersion >= 2.0.0, monitoringThresholds MUST be present.
 * A v2+ snapshot without monitoring thresholds is a structural integrity failure.
 */
export function verifyConfigSnapshot(
  snapshot: VerificationThresholdsSnapshot
): SnapshotVerificationResult {
  // Structural check: v2+ requires monitoringThresholds
  if (isV2OrLater(snapshot.configVersion) && !snapshot.monitoringThresholds) {
    return {
      valid: false,
      expected: snapshot.thresholdsHash,
      actual: `STRUCTURAL:monitoringThresholds required for v${snapshot.configVersion}`,
    };
  }

  const actual = computeThresholdsHash(snapshot.thresholds, snapshot.monitoringThresholds);
  return {
    valid: actual === snapshot.thresholdsHash,
    expected: snapshot.thresholdsHash,
    actual,
  };
}
