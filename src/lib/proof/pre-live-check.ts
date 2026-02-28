/**
 * Pre-Live Verification Check — deployment readiness assessment from backtest data.
 *
 * Pure function that evaluates whether a strategy is ready for live deployment
 * based on backtest metrics, Monte Carlo validation, and walk-forward analysis.
 *
 * Verdicts:
 *   READY          — all hard gates pass, soft gate failures below threshold
 *   UNCERTAIN      — all hard gates pass, but soft gate failures >= threshold
 *   NOT_DEPLOYABLE — one or more hard gates fail
 */

import type { BacktestRun } from "@prisma/client";

// ============================================
// Types
// ============================================

export type PreLiveVerdict = "READY" | "UNCERTAIN" | "NOT_DEPLOYABLE";

export type ReasonSeverity = "error" | "warning" | "info";

export type ReasonType =
  | "INSUFFICIENT_TRADES"
  | "LOW_HEALTH_SCORE"
  | "HEALTH_STATUS_WEAK"
  | "LOW_EXPECTED_PAYOFF"
  | "LOW_PROFIT_FACTOR"
  | "MISSING_MONTE_CARLO"
  | "LOW_SURVIVAL_RATE"
  | "NEGATIVE_P5_RETURN"
  | "MISSING_WALK_FORWARD"
  | "WALK_FORWARD_OVERFITTED"
  | "LOW_CONSISTENCY"
  | "HIGH_OVERFIT_PROBABILITY"
  | "EXCESSIVE_DRAWDOWN"
  | "BACKTEST_WARNINGS"
  | "BELOW_ROBUST_SCORE"
  | "LOW_SHARPE"
  | "LOW_RECOVERY_FACTOR";

export interface PreLiveReason {
  type: ReasonType;
  message: string;
  severity: ReasonSeverity;
}

export interface PreLiveAction {
  label: string;
  description: string;
  href?: string;
}

export interface GateResult {
  gate: string;
  passed: boolean;
  hard: boolean;
  detail?: string;
}

export interface PreLiveCheckInput {
  // From BacktestRun (always present)
  healthScore: number;
  healthStatus: "ROBUST" | "MODERATE" | "WEAK" | "INSUFFICIENT_DATA";
  totalTrades: number;
  profitFactor: number;
  maxDrawdownPct: number;
  expectedPayoff: number;
  winRate: number;
  // From BacktestRun (nullable)
  sharpeRatio: number | null;
  recoveryFactor: number | null;
  confidenceLower: number | null;
  confidenceUpper: number | null;
  warnings: string[];
  // From BacktestRun JSON fields (nullable)
  walkForward: {
    consistencyScore: number;
    overfitProbability: number;
    verdict: "ROBUST" | "MODERATE" | "OVERFITTED";
  } | null;
  monteCarlo: {
    survivalRate: number;
    p5: number;
    p50: number;
    p95: number;
  } | null;
}

export interface PreLiveCheckResult {
  verdict: PreLiveVerdict;
  reasons: PreLiveReason[];
  actions: PreLiveAction[];
  gateResults: GateResult[];
  readinessScore: number;
}

// ============================================
// Constants
// ============================================

// Hard gate thresholds — reuse ladder defaults where aligned
export const PRE_LIVE_MIN_TRADES = 100;
export const PRE_LIVE_MIN_HEALTH_SCORE = 50;
export const PRE_LIVE_MIN_PROFIT_FACTOR = 1.0;

// Soft gate thresholds
export const PRE_LIVE_MIN_SURVIVAL = 0.7;
export const PRE_LIVE_MAX_DRAWDOWN = 30;
export const PRE_LIVE_MIN_CONSISTENCY = 50;
export const PRE_LIVE_MAX_OVERFIT_PROB = 0.5;
export const PRE_LIVE_ROBUST_SCORE = 80;
export const PRE_LIVE_MIN_SHARPE = 0.5;
export const PRE_LIVE_MIN_RECOVERY_FACTOR = 1.0;

// Verdict threshold
export const UNCERTAIN_WEIGHT_THRESHOLD = 4;

// Hard gate weight for readiness score
const HARD_GATE_WEIGHT = 10;

// ============================================
// computePreLiveVerdict
// ============================================

export function computePreLiveVerdict(input: PreLiveCheckInput): PreLiveCheckResult {
  const gateResults: GateResult[] = [];
  const reasons: PreLiveReason[] = [];
  const actions: PreLiveAction[] = [];

  // --- Tier 1: Hard Gates (all run, no short-circuit) ---

  const h1 = input.totalTrades >= PRE_LIVE_MIN_TRADES;
  gateResults.push({
    gate: "H1",
    passed: h1,
    hard: true,
    detail: `totalTrades=${input.totalTrades}, required>=${PRE_LIVE_MIN_TRADES}`,
  });
  if (!h1) {
    reasons.push({
      type: "INSUFFICIENT_TRADES",
      message: `Only ${input.totalTrades} trades — at least ${PRE_LIVE_MIN_TRADES} required for meaningful assessment.`,
      severity: "error",
    });
    actions.push({
      label: "Extend backtest",
      description: "Run a longer backtest period to accumulate more trades.",
    });
  }

  const h2 = input.healthScore >= PRE_LIVE_MIN_HEALTH_SCORE;
  gateResults.push({
    gate: "H2",
    passed: h2,
    hard: true,
    detail: `healthScore=${input.healthScore}, required>=${PRE_LIVE_MIN_HEALTH_SCORE}`,
  });
  if (!h2) {
    reasons.push({
      type: "LOW_HEALTH_SCORE",
      message: `Health score ${input.healthScore} is below the minimum of ${PRE_LIVE_MIN_HEALTH_SCORE}.`,
      severity: "error",
    });
    actions.push({
      label: "Improve strategy",
      description: "Review score breakdown and address weak metrics.",
    });
  }

  const h3 = input.healthStatus !== "WEAK" && input.healthStatus !== "INSUFFICIENT_DATA";
  gateResults.push({
    gate: "H3",
    passed: h3,
    hard: true,
    detail: `healthStatus=${input.healthStatus}`,
  });
  if (!h3) {
    reasons.push({
      type: "HEALTH_STATUS_WEAK",
      message: `Health status is ${input.healthStatus} — strategy has fundamental issues.`,
      severity: "error",
    });
  }

  const h4 = input.expectedPayoff > 0;
  gateResults.push({
    gate: "H4",
    passed: h4,
    hard: true,
    detail: `expectedPayoff=${input.expectedPayoff}, required>0`,
  });
  if (!h4) {
    reasons.push({
      type: "LOW_EXPECTED_PAYOFF",
      message: `Expected payoff is ${input.expectedPayoff} — strategy loses money on average.`,
      severity: "error",
    });
  }

  const h5 = input.profitFactor >= PRE_LIVE_MIN_PROFIT_FACTOR;
  gateResults.push({
    gate: "H5",
    passed: h5,
    hard: true,
    detail: `profitFactor=${input.profitFactor}, required>=${PRE_LIVE_MIN_PROFIT_FACTOR}`,
  });
  if (!h5) {
    reasons.push({
      type: "LOW_PROFIT_FACTOR",
      message: `Profit factor ${input.profitFactor} is below ${PRE_LIVE_MIN_PROFIT_FACTOR} — gross loss exceeds gross profit.`,
      severity: "error",
    });
  }

  const anyHardFailed = !h1 || !h2 || !h3 || !h4 || !h5;

  // --- Tier 2: Soft Gates (weighted failures accumulate) ---

  let totalSoftWeight = 0;
  let failedSoftWeight = 0;

  // S1: Monte Carlo survival rate
  const s1Weight = 3;
  totalSoftWeight += s1Weight;
  if (input.monteCarlo != null) {
    const s1 = input.monteCarlo.survivalRate >= PRE_LIVE_MIN_SURVIVAL;
    gateResults.push({
      gate: "S1",
      passed: s1,
      hard: false,
      detail: `survivalRate=${input.monteCarlo.survivalRate}, required>=${PRE_LIVE_MIN_SURVIVAL}`,
    });
    if (!s1) {
      failedSoftWeight += s1Weight;
      reasons.push({
        type: "LOW_SURVIVAL_RATE",
        message: `Monte Carlo survival rate ${(input.monteCarlo.survivalRate * 100).toFixed(0)}% is below ${PRE_LIVE_MIN_SURVIVAL * 100}%.`,
        severity: "warning",
      });
    }
  } else {
    gateResults.push({ gate: "S1", passed: false, hard: false, detail: "monteCarlo=null" });
    failedSoftWeight += s1Weight;
    reasons.push({
      type: "MISSING_MONTE_CARLO",
      message: "Monte Carlo validation has not been run.",
      severity: "warning",
    });
    actions.push({
      label: "Run Monte Carlo validation",
      description: "Run Monte Carlo simulation to assess ruin probability and return distribution.",
    });
  }

  // S2: Monte Carlo P5
  const s2Weight = 1;
  totalSoftWeight += s2Weight;
  if (input.monteCarlo != null) {
    const s2 = input.monteCarlo.p5 >= 0;
    gateResults.push({
      gate: "S2",
      passed: s2,
      hard: false,
      detail: `p5=${input.monteCarlo.p5}, required>=0`,
    });
    if (!s2) {
      failedSoftWeight += s2Weight;
      reasons.push({
        type: "NEGATIVE_P5_RETURN",
        message: `Worst-case (5th percentile) return is ${input.monteCarlo.p5.toFixed(2)}% — risk of capital loss.`,
        severity: "warning",
      });
    }
  } else {
    gateResults.push({ gate: "S2", passed: false, hard: false, detail: "monteCarlo=null" });
    failedSoftWeight += s2Weight;
    // Reason already added by S1 MISSING_MONTE_CARLO
  }

  // S3: Walk-forward overfitted
  const s3Weight = 3;
  totalSoftWeight += s3Weight;
  if (input.walkForward != null) {
    const s3 = input.walkForward.verdict !== "OVERFITTED";
    gateResults.push({
      gate: "S3",
      passed: s3,
      hard: false,
      detail: `verdict=${input.walkForward.verdict}`,
    });
    if (!s3) {
      failedSoftWeight += s3Weight;
      reasons.push({
        type: "WALK_FORWARD_OVERFITTED",
        message: "Walk-forward analysis indicates the strategy is overfitted to historical data.",
        severity: "warning",
      });
    }
  } else {
    gateResults.push({ gate: "S3", passed: false, hard: false, detail: "walkForward=null" });
    failedSoftWeight += s3Weight;
    reasons.push({
      type: "MISSING_WALK_FORWARD",
      message: "Walk-forward analysis has not been run.",
      severity: "warning",
    });
    actions.push({
      label: "Run walk-forward analysis",
      description:
        "Run walk-forward analysis to test out-of-sample performance and detect overfitting.",
    });
  }

  // S4: Walk-forward consistency
  const s4Weight = 2;
  totalSoftWeight += s4Weight;
  if (input.walkForward != null) {
    const s4 = input.walkForward.consistencyScore >= PRE_LIVE_MIN_CONSISTENCY;
    gateResults.push({
      gate: "S4",
      passed: s4,
      hard: false,
      detail: `consistencyScore=${input.walkForward.consistencyScore}, required>=${PRE_LIVE_MIN_CONSISTENCY}`,
    });
    if (!s4) {
      failedSoftWeight += s4Weight;
      reasons.push({
        type: "LOW_CONSISTENCY",
        message: `Walk-forward consistency score ${input.walkForward.consistencyScore} is below ${PRE_LIVE_MIN_CONSISTENCY} — out-of-sample performance is erratic.`,
        severity: "warning",
      });
    }
  } else {
    gateResults.push({ gate: "S4", passed: false, hard: false, detail: "walkForward=null" });
    failedSoftWeight += s4Weight;
    // Reason already added by S3 MISSING_WALK_FORWARD
  }

  // S5: Walk-forward overfit probability
  const s5Weight = 2;
  totalSoftWeight += s5Weight;
  if (input.walkForward != null) {
    const s5 = input.walkForward.overfitProbability < PRE_LIVE_MAX_OVERFIT_PROB;
    gateResults.push({
      gate: "S5",
      passed: s5,
      hard: false,
      detail: `overfitProbability=${input.walkForward.overfitProbability}, required<${PRE_LIVE_MAX_OVERFIT_PROB}`,
    });
    if (!s5) {
      failedSoftWeight += s5Weight;
      reasons.push({
        type: "HIGH_OVERFIT_PROBABILITY",
        message: `Overfit probability ${(input.walkForward.overfitProbability * 100).toFixed(0)}% exceeds ${PRE_LIVE_MAX_OVERFIT_PROB * 100}% threshold.`,
        severity: "warning",
      });
    }
  } else {
    gateResults.push({ gate: "S5", passed: false, hard: false, detail: "walkForward=null" });
    failedSoftWeight += s5Weight;
    // Reason already added by S3 MISSING_WALK_FORWARD
  }

  // S6: Max drawdown
  const s6Weight = 2;
  totalSoftWeight += s6Weight;
  const s6 = input.maxDrawdownPct <= PRE_LIVE_MAX_DRAWDOWN;
  gateResults.push({
    gate: "S6",
    passed: s6,
    hard: false,
    detail: `maxDrawdownPct=${input.maxDrawdownPct}, required<=${PRE_LIVE_MAX_DRAWDOWN}`,
  });
  if (!s6) {
    failedSoftWeight += s6Weight;
    reasons.push({
      type: "EXCESSIVE_DRAWDOWN",
      message: `Max drawdown ${input.maxDrawdownPct.toFixed(1)}% exceeds ${PRE_LIVE_MAX_DRAWDOWN}% limit.`,
      severity: "warning",
    });
  }

  // S7: Warnings
  const s7Weight = 1;
  totalSoftWeight += s7Weight;
  const s7 = input.warnings.length === 0;
  gateResults.push({
    gate: "S7",
    passed: s7,
    hard: false,
    detail: `warnings=${input.warnings.length}`,
  });
  if (!s7) {
    failedSoftWeight += s7Weight;
    reasons.push({
      type: "BACKTEST_WARNINGS",
      message: `${input.warnings.length} warning(s) detected: ${input.warnings[0]}${input.warnings.length > 1 ? ` (+${input.warnings.length - 1} more)` : ""}`,
      severity: "warning",
    });
  }

  // S8: Below robust score
  const s8Weight = 1;
  totalSoftWeight += s8Weight;
  const s8 = input.healthScore >= PRE_LIVE_ROBUST_SCORE;
  gateResults.push({
    gate: "S8",
    passed: s8,
    hard: false,
    detail: `healthScore=${input.healthScore}, required>=${PRE_LIVE_ROBUST_SCORE}`,
  });
  if (!s8) {
    failedSoftWeight += s8Weight;
    reasons.push({
      type: "BELOW_ROBUST_SCORE",
      message: `Health score ${input.healthScore} is below the Robust tier threshold of ${PRE_LIVE_ROBUST_SCORE}.`,
      severity: "info",
    });
  }

  // S9: Sharpe ratio (skip if null)
  const s9Weight = 1;
  if (input.sharpeRatio != null) {
    totalSoftWeight += s9Weight;
    const s9 = input.sharpeRatio >= PRE_LIVE_MIN_SHARPE;
    gateResults.push({
      gate: "S9",
      passed: s9,
      hard: false,
      detail: `sharpeRatio=${input.sharpeRatio}, required>=${PRE_LIVE_MIN_SHARPE}`,
    });
    if (!s9) {
      failedSoftWeight += s9Weight;
      reasons.push({
        type: "LOW_SHARPE",
        message: `Sharpe ratio ${input.sharpeRatio.toFixed(2)} is below ${PRE_LIVE_MIN_SHARPE} — poor risk-adjusted returns.`,
        severity: "info",
      });
    }
  } else {
    gateResults.push({
      gate: "S9",
      passed: true,
      hard: false,
      detail: "sharpeRatio=null, skipped",
    });
  }

  // S10: Recovery factor (skip if null)
  const s10Weight = 1;
  if (input.recoveryFactor != null) {
    totalSoftWeight += s10Weight;
    const s10 = input.recoveryFactor >= PRE_LIVE_MIN_RECOVERY_FACTOR;
    gateResults.push({
      gate: "S10",
      passed: s10,
      hard: false,
      detail: `recoveryFactor=${input.recoveryFactor}, required>=${PRE_LIVE_MIN_RECOVERY_FACTOR}`,
    });
    if (!s10) {
      failedSoftWeight += s10Weight;
      reasons.push({
        type: "LOW_RECOVERY_FACTOR",
        message: `Recovery factor ${input.recoveryFactor.toFixed(2)} is below ${PRE_LIVE_MIN_RECOVERY_FACTOR} — net profit hasn't recovered from worst drawdown.`,
        severity: "info",
      });
    }
  } else {
    gateResults.push({
      gate: "S10",
      passed: true,
      hard: false,
      detail: "recoveryFactor=null, skipped",
    });
  }

  // --- Compute verdict ---

  let verdict: PreLiveVerdict;
  if (anyHardFailed) {
    verdict = "NOT_DEPLOYABLE";
  } else if (failedSoftWeight >= UNCERTAIN_WEIGHT_THRESHOLD) {
    verdict = "UNCERTAIN";
  } else {
    verdict = "READY";
  }

  // --- Compute readiness score ---

  const hardGateCount = 5;
  const hardTotal = hardGateCount * HARD_GATE_WEIGHT;
  const hardPassed = gateResults.filter((g) => g.hard && g.passed).length * HARD_GATE_WEIGHT;
  const totalWeight = hardTotal + totalSoftWeight;
  const passedWeight = hardPassed + (totalSoftWeight - failedSoftWeight);
  const readinessScore = Math.round((100 * passedWeight) / totalWeight);

  // --- Order reasons: errors first, then warnings, then info; limit to top 3 ---

  const severityOrder: Record<ReasonSeverity, number> = { error: 0, warning: 1, info: 2 };
  reasons.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  const topReasons = reasons.slice(0, 3);

  return {
    verdict,
    reasons: topReasons,
    actions,
    gateResults,
    readinessScore,
  };
}

// ============================================
// extractPreLiveInput — maps BacktestRun to PreLiveCheckInput
// ============================================

interface WalkForwardJson {
  consistencyScore?: number;
  overfitProbability?: number;
  verdict?: string;
}

interface MonteCarloJson {
  survivalRate?: number;
  p5?: number;
  p50?: number;
  p95?: number;
}

export function extractPreLiveInput(backtest: BacktestRun): PreLiveCheckInput {
  // Parse walkForwardResult JSON
  let walkForward: PreLiveCheckInput["walkForward"] = null;
  if (backtest.walkForwardResult != null) {
    const wf = backtest.walkForwardResult as WalkForwardJson;
    if (
      typeof wf.consistencyScore === "number" &&
      typeof wf.overfitProbability === "number" &&
      typeof wf.verdict === "string" &&
      (wf.verdict === "ROBUST" || wf.verdict === "MODERATE" || wf.verdict === "OVERFITTED")
    ) {
      walkForward = {
        consistencyScore: wf.consistencyScore,
        overfitProbability: wf.overfitProbability,
        verdict: wf.verdict,
      };
    }
  }

  // Parse validationResult (Monte Carlo) JSON
  let monteCarlo: PreLiveCheckInput["monteCarlo"] = null;
  if (backtest.validationResult != null) {
    const mc = backtest.validationResult as MonteCarloJson;
    if (
      typeof mc.survivalRate === "number" &&
      typeof mc.p5 === "number" &&
      typeof mc.p50 === "number" &&
      typeof mc.p95 === "number"
    ) {
      monteCarlo = {
        survivalRate: mc.survivalRate,
        p5: mc.p5,
        p50: mc.p50,
        p95: mc.p95,
      };
    }
  }

  // Parse warnings from parseWarnings JSON field
  let warnings: string[] = [];
  if (backtest.parseWarnings != null) {
    const pw = backtest.parseWarnings;
    if (Array.isArray(pw)) {
      warnings = pw.filter((w): w is string => typeof w === "string");
    }
  }

  return {
    healthScore: backtest.healthScore,
    healthStatus: backtest.healthStatus,
    totalTrades: backtest.totalTrades,
    profitFactor: backtest.profitFactor,
    maxDrawdownPct: backtest.maxDrawdownPct,
    expectedPayoff: backtest.expectedPayoff,
    winRate: backtest.winRate,
    sharpeRatio: backtest.sharpeRatio,
    recoveryFactor: backtest.recoveryFactor,
    confidenceLower: backtest.confidenceLower,
    confidenceUpper: backtest.confidenceUpper,
    warnings,
    walkForward,
    monteCarlo,
  };
}
