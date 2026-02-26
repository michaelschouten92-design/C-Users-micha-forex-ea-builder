/**
 * Trust Score computation for trader profiles.
 *
 * Formula (0–100):
 *   base = weighted average of strategy-level scores
 *   bonuses for breadth, consistency, and longevity
 *
 * Components:
 *   1. Best strategy ladder level (0–40 points)
 *      SUBMITTED=5, VALIDATED=15, VERIFIED=25, PROVEN=35, INSTITUTIONAL=40
 *   2. Average backtest health score across validated strategies (0–25 points)
 *      normalized: (avgHealthScore / 100) * 25
 *   3. Live track record depth (0–20 points)
 *      min(liveTrades / 500, 1) * 10 + min(liveDays / 365, 1) * 10
 *   4. Consistency bonus (0–15 points)
 *      strategies with stable health + low drawdown
 *
 * The score is designed to reward breadth (multiple validated strategies)
 * and depth (long live track records) over gaming a single metric.
 */

import type { LadderLevel } from "@prisma/client";
import { LADDER_RANK } from "./ladder";

export interface TrustScoreInput {
  /** All strategy data for this user */
  strategies: Array<{
    ladderLevel: LadderLevel;
    backtestHealthScore: number | null;
    liveTrades: number;
    liveDays: number;
    liveMaxDrawdownPct: number | null;
    liveHealthScore: number | null;
  }>;
}

export interface TrustScoreResult {
  score: number; // 0–100
  breakdown: {
    levelPoints: number;
    healthPoints: number;
    depthPoints: number;
    consistencyPoints: number;
  };
  level: LadderLevel; // Best level across strategies
}

const LEVEL_POINTS: Record<LadderLevel, number> = {
  SUBMITTED: 5,
  VALIDATED: 15,
  VERIFIED: 25,
  PROVEN: 35,
  INSTITUTIONAL: 40,
};

export function computeTrustScore(input: TrustScoreInput): TrustScoreResult {
  const { strategies } = input;

  if (strategies.length === 0) {
    return {
      score: 0,
      breakdown: { levelPoints: 0, healthPoints: 0, depthPoints: 0, consistencyPoints: 0 },
      level: "SUBMITTED",
    };
  }

  // 1. Best ladder level (0–40)
  let bestLevel: LadderLevel = "SUBMITTED";
  for (const s of strategies) {
    if (LADDER_RANK[s.ladderLevel] > LADDER_RANK[bestLevel]) {
      bestLevel = s.ladderLevel;
    }
  }
  const levelPoints = LEVEL_POINTS[bestLevel];

  // 2. Average health score across validated+ strategies (0–25)
  const validatedStrategies = strategies.filter(
    (s) => s.backtestHealthScore !== null && s.backtestHealthScore > 0
  );
  const avgHealth =
    validatedStrategies.length > 0
      ? validatedStrategies.reduce((sum, s) => sum + (s.backtestHealthScore ?? 0), 0) /
        validatedStrategies.length
      : 0;
  const healthPoints = Math.min(25, (avgHealth / 100) * 25);

  // 3. Live track record depth (0–20)
  const totalLiveTrades = strategies.reduce((sum, s) => sum + s.liveTrades, 0);
  const maxLiveDays = Math.max(...strategies.map((s) => s.liveDays), 0);
  const tradeDepth = Math.min(1, totalLiveTrades / 500) * 10;
  const timeDepth = Math.min(1, maxLiveDays / 365) * 10;
  const depthPoints = tradeDepth + timeDepth;

  // 4. Consistency bonus (0–15)
  let consistencyPoints = 0;
  const stableStrategies = strategies.filter(
    (s) =>
      s.liveHealthScore !== null &&
      s.liveHealthScore >= 0.6 &&
      (s.liveMaxDrawdownPct === null || s.liveMaxDrawdownPct <= 15)
  );
  if (stableStrategies.length > 0) {
    consistencyPoints = Math.min(15, stableStrategies.length * 5);
  }

  const score = Math.min(
    100,
    Math.round(levelPoints + healthPoints + depthPoints + consistencyPoints)
  );

  return {
    score,
    breakdown: {
      levelPoints,
      healthPoints: Math.round(healthPoints * 10) / 10,
      depthPoints: Math.round(depthPoints * 10) / 10,
      consistencyPoints,
    },
    level: bestLevel,
  };
}

/**
 * Derive badge eligibility from strategy data.
 */
export interface ProfileBadge {
  id: string;
  label: string;
  description: string;
  earned: boolean;
}

export function computeBadges(strategies: TrustScoreInput["strategies"]): ProfileBadge[] {
  const hasVerified = strategies.some((s) => LADDER_RANK[s.ladderLevel] >= 2);

  const lowDdStrategies = strategies.filter(
    (s) => s.liveMaxDrawdownPct !== null && s.liveMaxDrawdownPct <= 10
  );
  const consistentStrategies = strategies.filter(
    (s) => s.liveHealthScore !== null && s.liveHealthScore >= 0.7 && s.liveDays >= 30
  );

  return [
    {
      id: "consistent",
      label: "Consistent",
      description: "At least one strategy with healthy live performance for 30+ days",
      earned: consistentStrategies.length > 0,
    },
    {
      id: "low-dd",
      label: "Low Drawdown",
      description: "At least one strategy with max drawdown under 10%",
      earned: lowDdStrategies.length > 0,
    },
    {
      id: "execution-quality",
      label: "Execution Quality",
      description: "Verified live trades matching broker records",
      earned: hasVerified,
    },
    {
      id: "multi-strategy",
      label: "Multi-Strategy",
      description: "Two or more validated strategies",
      earned: strategies.filter((s) => LADDER_RANK[s.ladderLevel] >= 1).length >= 2,
    },
  ];
}
