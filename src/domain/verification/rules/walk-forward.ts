/**
 * D1: Walk-Forward Degradation — pure 3-tier guard.
 *
 * Evaluates Sharpe ratio degradation between in-sample and out-of-sample
 * windows, with sample-size gating to prevent false rejection on thin OOS data.
 *
 * Contract (VERIFICATION_CONTRACT.md §D1):
 *
 *   D1c: sharpeDegradation > EXTREME_SHARPE_DEGRADATION_PCT
 *        → NOT_DEPLOYABLE (regardless of OOS count)
 *        Rationale: no plausible edge survives >80% degradation.
 *
 *   D1a: sharpeDegradation > MAX_SHARPE_DEGRADATION_PCT
 *        AND outOfSampleTradeCount >= MIN_OOS_TRADE_COUNT
 *        → NOT_DEPLOYABLE (statistically meaningful)
 *
 *   D1b: sharpeDegradation > MAX_SHARPE_DEGRADATION_PCT
 *        AND outOfSampleTradeCount < MIN_OOS_TRADE_COUNT
 *        → UNCERTAIN (flagged, not conclusive)
 *        Rationale: prevents over-triggering on unstable Sharpe from thin OOS.
 *
 *   else: pass (no flag)
 *
 * Pure: no IO, no time, no randomness. Deterministic for identical inputs.
 */

import type { ReasonCode } from "../types";

/** Pre-computed walk-forward analysis results passed into the verdict engine. */
export interface WalkForwardInput {
  /** Percentage degradation of Sharpe ratio from IS to OOS (positive = worse OOS). */
  sharpeDegradationPct: number;
  /** Number of trades in the out-of-sample portion. */
  outOfSampleTradeCount: number;
}

/** Thresholds consumed by D1 — subset of VerificationThresholds. */
export interface WalkForwardThresholds {
  maxSharpeDegradationPct: number;
  extremeSharpeDegradationPct: number;
  minOosTradeCount: number;
}

export type D1Tier = "pass" | "D1a" | "D1b" | "D1c";

export interface WalkForwardEvaluation {
  tier: D1Tier;
  /** Reason code to push into the accumulator, or null if pass. */
  reasonCode: ReasonCode | null;
  measured: {
    sharpeDegradationPct: number;
    outOfSampleTradeCount: number;
  };
}

/**
 * Evaluate walk-forward degradation per the 3-tier D1 guard.
 *
 * Evaluation order follows the contract: D1c (extreme) is checked first
 * because it overrides the OOS sample-size gate.
 *
 * @throws never — all branches are handled. Caller wraps in try/catch
 *         for defense-in-depth (COMPUTATION_FAILED).
 */
export function evaluateWalkForwardDegradation(
  input: WalkForwardInput,
  thresholds: WalkForwardThresholds
): WalkForwardEvaluation {
  const { sharpeDegradationPct, outOfSampleTradeCount } = input;

  const measured = { sharpeDegradationPct, outOfSampleTradeCount };

  // D1c: extreme degradation — reject regardless of OOS count
  if (sharpeDegradationPct > thresholds.extremeSharpeDegradationPct) {
    return {
      tier: "D1c",
      reasonCode: "WALK_FORWARD_DEGRADATION_EXTREME",
      measured,
    };
  }

  // D1a/D1b: moderate degradation — outcome depends on OOS sample size
  if (sharpeDegradationPct > thresholds.maxSharpeDegradationPct) {
    if (outOfSampleTradeCount >= thresholds.minOosTradeCount) {
      // D1a: enough OOS data to trust the signal
      return {
        tier: "D1a",
        reasonCode: "WALK_FORWARD_DEGRADATION_EXTREME",
        measured,
      };
    }
    // D1b: OOS too thin — flag but don't reject
    return {
      tier: "D1b",
      reasonCode: "WALK_FORWARD_FLAGGED_NOT_CONCLUSIVE",
      measured,
    };
  }

  // Pass: degradation within acceptable limits
  return { tier: "pass", reasonCode: null, measured };
}
