/**
 * D2: Monte Carlo Ruin Probability — bootstrap resampling simulation.
 *
 * Resamples the strategy's trade PnLs with replacement to estimate
 * the probability of account ruin (equity ≤ 0) under path-dependent
 * equity scenarios.
 *
 * Contract (VERIFICATION_CONTRACT.md §5 D2):
 *   monteCarlo.ruinProbability > RUIN_PROBABILITY_CEILING → NOT_DEPLOYABLE + RUIN_PROBABILITY_EXCEEDED
 *
 * Deterministic: uses mulberry32 PRNG seeded explicitly.
 * No IO, no time, no Math.random. Pure function.
 */

import type { ReasonCode } from "../types";

/** Well-known 32-bit PRNG with uniform distribution in [0, 1). */
export function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface MonteCarloInput {
  tradePnls: number[];
  initialBalance: number;
}

export interface MonteCarloThresholds {
  ruinProbabilityCeiling: number;
  monteCarloIterations: number;
}

export interface MonteCarloEvaluation {
  ruinProbability: number;
  simulationsRun: number;
  reasonCode: ReasonCode | null;
  measured: {
    ruinProbability: number;
    simulationsRun: number;
  };
}

/**
 * Run bootstrap-resampling Monte Carlo simulation to estimate ruin probability.
 *
 * Each simulation path resamples `tradePnls.length` trades with replacement,
 * tracking equity from `initialBalance`. If equity drops to ≤ 0, the path
 * is counted as ruin.
 *
 * @throws never — returns INVALID_SCORE for bad inputs. Caller wraps in
 *         try/catch for defense-in-depth (COMPUTATION_FAILED).
 */
export function evaluateMonteCarloRuin(
  input: MonteCarloInput,
  thresholds: MonteCarloThresholds,
  seed: number
): MonteCarloEvaluation {
  // --- Input validation ---
  if (!Number.isFinite(seed)) {
    return invalidResult();
  }
  if (!Number.isFinite(input.initialBalance) || input.initialBalance <= 0) {
    return invalidResult();
  }
  if (input.tradePnls.length === 0) {
    return invalidResult();
  }
  if (input.tradePnls.some((p) => !Number.isFinite(p))) {
    return invalidResult();
  }

  const { tradePnls, initialBalance } = input;
  const n = tradePnls.length;
  const iterations = thresholds.monteCarloIterations;
  const rng = mulberry32(seed);

  let ruinCount = 0;

  for (let sim = 0; sim < iterations; sim++) {
    let equity = initialBalance;
    for (let step = 0; step < n; step++) {
      const idx = Math.floor(rng() * n);
      equity += tradePnls[idx];
      if (equity <= 0) {
        ruinCount++;
        break;
      }
    }
  }

  const ruinProbability = ruinCount / iterations;
  const reasonCode: ReasonCode | null =
    ruinProbability > thresholds.ruinProbabilityCeiling ? "RUIN_PROBABILITY_EXCEEDED" : null;

  return {
    ruinProbability,
    simulationsRun: iterations,
    reasonCode,
    measured: {
      ruinProbability,
      simulationsRun: iterations,
    },
  };
}

function invalidResult(): MonteCarloEvaluation {
  return {
    ruinProbability: 0,
    simulationsRun: 0,
    reasonCode: "INVALID_SCORE",
    measured: {
      ruinProbability: 0,
      simulationsRun: 0,
    },
  };
}
