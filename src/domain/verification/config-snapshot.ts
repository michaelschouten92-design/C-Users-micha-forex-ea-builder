/**
 * Pure config snapshot module — single source of truth for threshold
 * hash computation and snapshot verification.
 *
 * No DB, no env, no time, no randomness. All functions are deterministic
 * and safe to call from any context.
 */

import { createHash } from "node:crypto";
import { VERIFICATION } from "./constants";

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

/** Immutable snapshot of a config version — anchors every verification run. */
export interface VerificationThresholdsSnapshot {
  configVersion: string;
  thresholds: VerificationThresholds;
  thresholdsHash: string;
}

export interface SnapshotVerificationResult {
  valid: boolean;
  expected: string;
  actual: string;
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
 */
export function computeThresholdsHash(thresholds: VerificationThresholds): string {
  const json = canonicalJSON(thresholds as unknown as Record<string, unknown>);
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

  return {
    configVersion: VERIFICATION.CONFIG_VERSION,
    thresholds,
    thresholdsHash: computeThresholdsHash(thresholds),
  };
}

/**
 * Verify a snapshot's integrity by recomputing the hash from its thresholds.
 * Returns whether the stored hash matches, plus both values for diagnostics.
 */
export function verifyConfigSnapshot(
  snapshot: VerificationThresholdsSnapshot
): SnapshotVerificationResult {
  const actual = computeThresholdsHash(snapshot.thresholds);
  return {
    valid: actual === snapshot.thresholdsHash,
    expected: snapshot.thresholdsHash,
    actual,
  };
}
