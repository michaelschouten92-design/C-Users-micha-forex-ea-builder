/**
 * Edge decay projection — predicts when a strategy will lose its edge.
 *
 * Uses health snapshot history to compute a linear decay trend and project
 * future performance. All functions are pure — no IO, no side effects.
 */

// ── Types ──────────────────────────────────────────────────

export interface HealthDataPoint {
  overallScore: number; // 0–1
  expectancy: number | null; // avg PnL per trade as % of balance
  createdAt: string; // ISO-8601
}

export interface EdgeProjection {
  /** Current decay rate per day (negative = declining). Null if insufficient data. */
  decayRatePerDay: number | null;
  /** Estimated daily P&L impact in account currency. Null if no expectancy data. */
  estimatedDailyLoss: number | null;
  /** Projected cumulative loss over 7/14/30 days. Null if no daily loss. */
  projectedLoss7d: number | null;
  projectedLoss14d: number | null;
  projectedLoss30d: number | null;
  /** Approximate days until edge score reaches the warning threshold (0.5). Null if not declining or already below. */
  daysUntilBreak: number | null;
  /** Current score trend direction */
  trend: "improving" | "stable" | "declining";
  /** Number of data points used for projection */
  dataPoints: number;
}

// ── Constants ──────────────────────────────────────────────

/** Minimum snapshots needed for a meaningful trend */
const MIN_DATA_POINTS = 5;

/** Score threshold where edge is considered "broken" */
const BREAK_THRESHOLD = 0.5;

/** Minimum absolute decay rate to classify as "declining" (per day) */
const DECLINE_THRESHOLD = 0.002;

// ── Core computation ───────────────────────────────────────

/**
 * Compute edge decay projection from health snapshot history.
 *
 * @param snapshots - Health snapshots ordered newest-first (as returned by DB)
 * @param currentBalance - Current account balance for P&L estimation
 * @param currentExpectancy - Latest expectancy value (avg PnL per trade as % of balance)
 */
export function computeEdgeProjection(
  snapshots: HealthDataPoint[],
  currentBalance: number,
  currentExpectancy: number | null
): EdgeProjection {
  const noProjection: EdgeProjection = {
    decayRatePerDay: null,
    estimatedDailyLoss: null,
    projectedLoss7d: null,
    projectedLoss14d: null,
    projectedLoss30d: null,
    daysUntilBreak: null,
    trend: "stable",
    dataPoints: snapshots.length,
  };

  if (snapshots.length < MIN_DATA_POINTS) {
    return noProjection;
  }

  // Sort oldest-first for regression
  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Linear regression: score vs days-since-first-snapshot
  const t0 = new Date(sorted[0].createdAt).getTime();
  const points = sorted.map((s) => ({
    x: (new Date(s.createdAt).getTime() - t0) / (1000 * 60 * 60 * 24), // days
    y: s.overallScore,
  }));

  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumXX = points.reduce((s, p) => s + p.x * p.x, 0);

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return noProjection;

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const currentScore = sorted[sorted.length - 1].overallScore;

  // Determine trend
  let trend: "improving" | "stable" | "declining";
  if (slope < -DECLINE_THRESHOLD) {
    trend = "declining";
  } else if (slope > DECLINE_THRESHOLD) {
    trend = "improving";
  } else {
    trend = "stable";
  }

  // Days until break threshold
  let daysUntilBreak: number | null = null;
  if (slope < 0 && currentScore > BREAK_THRESHOLD) {
    const daysToBreak = (currentScore - BREAK_THRESHOLD) / Math.abs(slope);
    daysUntilBreak = Math.round(daysToBreak);
  }

  // Daily P&L estimation from expectancy + decay
  let estimatedDailyLoss: number | null = null;
  let projectedLoss7d: number | null = null;
  let projectedLoss14d: number | null = null;
  let projectedLoss30d: number | null = null;

  if (currentExpectancy !== null && currentBalance > 0 && trend === "declining") {
    // Expectancy is avg PnL per trade as % of balance.
    // As score declines, expectancy degrades proportionally.
    // Estimate: daily loss = balance × expectancy_decay_rate
    //
    // Use the score slope as a proxy for expectancy decay:
    // If score drops 0.01/day and current expectancy is -0.5%/trade,
    // the expectancy is worsening — each day adds more loss.
    //
    // Simplified model: daily loss ≈ balance × abs(slope) × 10
    // The ×10 factor converts score-space (0-1) to rough P&L impact
    const dailyLoss = currentBalance * Math.abs(slope) * 10;
    estimatedDailyLoss = -Math.round(dailyLoss * 100) / 100;

    // If expectancy is already negative, add that as base loss
    if (currentExpectancy < 0) {
      // expectancy is per-trade %; estimate ~1-2 trades/day
      const baseDailyLoss = currentBalance * Math.abs(currentExpectancy / 100) * 1.5;
      estimatedDailyLoss = -Math.round((dailyLoss + baseDailyLoss) * 100) / 100;
    }

    projectedLoss7d = Math.round(estimatedDailyLoss * 7 * 100) / 100;
    projectedLoss14d = Math.round(estimatedDailyLoss * 14 * 100) / 100;
    projectedLoss30d = Math.round(estimatedDailyLoss * 30 * 100) / 100;
  }

  return {
    decayRatePerDay: Math.round(slope * 10000) / 10000,
    estimatedDailyLoss,
    projectedLoss7d,
    projectedLoss14d,
    projectedLoss30d,
    daysUntilBreak,
    trend,
    dataPoints: n,
  };
}

/**
 * Generate a human-readable alert message for edge decay.
 * Returns null if the projection doesn't warrant an alert.
 */
export function generateEdgeDecayAlert(
  projection: EdgeProjection,
  eaName: string,
  currentScore: number
): string | null {
  if (projection.trend !== "declining" || projection.daysUntilBreak === null) {
    return null;
  }

  // Only alert if break is projected within 60 days
  if (projection.daysUntilBreak > 60) return null;

  const scorePercent = Math.round(currentScore * 100);
  const parts: string[] = [];

  parts.push(`${eaName}: Edge score at ${scorePercent}% and declining.`);

  if (projection.daysUntilBreak <= 14) {
    parts.push(
      `At this pace, edge breaks below threshold within ~${projection.daysUntilBreak} days.`
    );
  } else {
    parts.push(`Projected edge break in ~${projection.daysUntilBreak} days if trend continues.`);
  }

  if (projection.estimatedDailyLoss !== null) {
    parts.push(
      `Estimated daily impact: $${Math.abs(projection.estimatedDailyLoss).toFixed(2)}/day.`
    );
  }

  parts.push("Consider pausing or reviewing this strategy.");

  return parts.join(" ");
}
