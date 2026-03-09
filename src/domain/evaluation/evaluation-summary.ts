/**
 * Evaluation summary — deterministic rule-based verdict for backtest uploads.
 *
 * Pure function — no IO, no DB, no AI. Caller provides metrics.
 * Produces a compact user-facing summary: VERIFIED or NOT_VERIFIED with reasons.
 */

export interface EvaluationInput {
  totalTrades: number;
  profitFactor: number;
  maxDrawdownPct: number;
  winRate: number;
}

export interface EvaluationSummary {
  verdict: "VERIFIED" | "NOT_VERIFIED";
  reasons: string[];
}

const MIN_TRADE_COUNT = 100;
const MIN_PROFIT_FACTOR = 1.2;
const MAX_DRAWDOWN_PCT = 35;
const MIN_WIN_RATE = 0.35;
const MAX_REASONS = 3;

export function buildEvaluationSummary(input: EvaluationInput): EvaluationSummary {
  const { totalTrades, profitFactor, maxDrawdownPct, winRate } = input;
  const reasons: string[] = [];

  if (totalTrades < MIN_TRADE_COUNT) {
    reasons.push("Too few trades");
  }

  if (profitFactor < MIN_PROFIT_FACTOR) {
    reasons.push("Profit factor below minimum threshold");
  }

  if (maxDrawdownPct > MAX_DRAWDOWN_PCT) {
    reasons.push("Drawdown too high");
  }

  if (winRate < MIN_WIN_RATE) {
    reasons.push("Win rate unusually low");
  }

  return {
    verdict: reasons.length === 0 ? "VERIFIED" : "NOT_VERIFIED",
    reasons: reasons.slice(0, MAX_REASONS),
  };
}
