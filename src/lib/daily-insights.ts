/**
 * Daily Insight Engine — rule-based insights from live EA data + backtest results.
 *
 * Generates simple, actionable insights without AI.
 * Each insight has a type, message, and severity level.
 */

interface LiveEASummary {
  id: string;
  eaName: string;
  symbol: string | null;
  status: string;
  totalProfit: number;
  totalTrades: number;
  balance: number | null;
  equity: number | null;
  lastHeartbeat: Date | null;
  strategyStatus?: string;
}

interface BacktestSummary {
  id: string;
  eaName: string | null;
  symbol: string;
  healthScore: number;
  healthStatus: string;
  totalNetProfit: number;
  profitFactor: number;
  maxDrawdownPct: number;
  winRate: number;
  totalTrades: number;
  createdAt: Date;
}

export interface DailyInsight {
  type: "info" | "warning" | "success" | "action";
  icon: string; // emoji-like identifier for the UI to render
  message: string;
  detail?: string;
  linkHref?: string;
  linkLabel?: string;
}

/**
 * Generate daily insights from the user's data.
 * Returns up to 3 most relevant insights, prioritized by importance.
 */
export function generateDailyInsights(
  liveEAs: LiveEASummary[],
  recentBacktests: BacktestSummary[],
  projectCount: number
): DailyInsight[] {
  const insights: DailyInsight[] = [];

  // ========================================
  // 1. No activity — nudge to upload
  // ========================================
  if (liveEAs.length === 0 && recentBacktests.length === 0 && projectCount === 0) {
    insights.push({
      type: "action",
      icon: "upload",
      message: "No strategies yet — upload a backtest to get started",
      detail: "Upload your MT5 Strategy Tester report and get an instant health score.",
      linkHref: "/app/evaluate",
      linkLabel: "Upload Backtest",
    });
    return insights;
  }

  // ========================================
  // 2. Live EA insights
  // ========================================
  const onlineEAs = liveEAs.filter((ea) => ea.status === "ONLINE");
  const offlineEAs = liveEAs.filter((ea) => ea.status === "OFFLINE");
  const errorEAs = liveEAs.filter((ea) => ea.status === "ERROR");

  // EAs in error state
  if (errorEAs.length > 0) {
    const names = errorEAs.map((ea) => ea.eaName).join(", ");
    insights.push({
      type: "warning",
      icon: "alert",
      message: `${errorEAs.length} EA${errorEAs.length > 1 ? "s" : ""} reporting errors: ${names}`,
      detail: "Check your terminal and EA logs for details.",
      linkHref: "/app/monitor",
      linkLabel: "View Live EAs",
    });
  }

  // EAs offline for a while
  const staleOffline = offlineEAs.filter((ea) => {
    if (!ea.lastHeartbeat) return true;
    const hoursSinceHeartbeat =
      (Date.now() - new Date(ea.lastHeartbeat).getTime()) / (1000 * 60 * 60);
    return hoursSinceHeartbeat > 24;
  });

  if (staleOffline.length > 0) {
    insights.push({
      type: "warning",
      icon: "offline",
      message: `${staleOffline.length} EA${staleOffline.length > 1 ? "s" : ""} offline for 24+ hours`,
      detail: "Check if your terminal is running and the EA is attached.",
      linkHref: "/app/monitor",
      linkLabel: "View Live EAs",
    });
  }

  // Strategy status-based insights
  const degradedStrategies = liveEAs.filter((ea) => ea.strategyStatus === "EDGE_DEGRADED");
  const verifiedStrategies = liveEAs.filter((ea) => ea.strategyStatus === "CONSISTENT");
  const unstableStrategies = liveEAs.filter((ea) => ea.strategyStatus === "UNSTABLE");

  if (degradedStrategies.length > 0) {
    const names = degradedStrategies.map((ea) => ea.eaName).join(", ");
    insights.push({
      type: "warning",
      icon: "alert",
      message: `${degradedStrategies.length} strategy${degradedStrategies.length > 1 ? "s have" : " has"} degraded edge — review performance`,
      detail: names,
      linkHref: "/app/monitor",
      linkLabel: "View Strategies",
    });
  }

  if (verifiedStrategies.length > 0) {
    insights.push({
      type: "success",
      icon: "profit",
      message: `${verifiedStrategies.length} ${verifiedStrategies.length === 1 ? "strategy" : "strategies"} verified and performing`,
    });
  }

  if (unstableStrategies.length > 0 && insights.length < 3) {
    const names = unstableStrategies.map((ea) => ea.eaName).join(", ");
    insights.push({
      type: "warning",
      icon: "weak",
      message: `${unstableStrategies.length === 1 ? `Strategy ${names}` : `${unstableStrategies.length} strategies`} showing warning signs`,
      linkHref: "/app/monitor",
      linkLabel: "Review",
    });
  }

  // Profitable EAs summary (only if no verified insight already added)
  const profitableEAs = onlineEAs.filter((ea) => ea.totalProfit > 0);
  if (profitableEAs.length > 0 && onlineEAs.length > 0 && verifiedStrategies.length === 0) {
    const totalProfit = profitableEAs.reduce((sum, ea) => sum + ea.totalProfit, 0);
    insights.push({
      type: "success",
      icon: "profit",
      message: `${profitableEAs.length} of ${onlineEAs.length} active strategies are profitable`,
      detail: `Combined profit: $${totalProfit.toFixed(2)}`,
    });
  }

  // ========================================
  // 3. Backtest insights
  // ========================================
  const recentWeek = recentBacktests.filter((bt) => {
    const daysSince = (Date.now() - new Date(bt.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince <= 7;
  });

  // Weak strategies uploaded recently
  const weakStrategies = recentWeek.filter((bt) => bt.healthStatus === "WEAK");
  if (weakStrategies.length > 0) {
    const names = weakStrategies.map((bt) => bt.eaName || bt.symbol).join(", ");
    insights.push({
      type: "warning",
      icon: "weak",
      message: `${weakStrategies.length} recent backtest${weakStrategies.length > 1 ? "s" : ""} scored WEAK: ${names}`,
      detail: "Review the health score breakdown and consider optimizing before going live.",
    });
  }

  // Robust strategies — positive reinforcement
  const robustStrategies = recentWeek.filter((bt) => bt.healthStatus === "ROBUST");
  if (robustStrategies.length > 0) {
    const best = robustStrategies.sort((a, b) => b.healthScore - a.healthScore)[0];
    insights.push({
      type: "success",
      icon: "robust",
      message: `${best.eaName || best.symbol} scored ${best.healthScore}/100 — looking robust`,
      detail: `PF ${best.profitFactor.toFixed(2)}, DD ${best.maxDrawdownPct.toFixed(1)}%, ${best.totalTrades} trades`,
    });
  }

  // High drawdown warning
  const highDD = recentBacktests.filter((bt) => bt.maxDrawdownPct > 30);
  if (highDD.length > 0 && insights.length < 3) {
    insights.push({
      type: "warning",
      icon: "drawdown",
      message: `${highDD.length} strategy${highDD.length > 1 ? "s have" : " has"} drawdown above 30%`,
      detail:
        "High drawdown increases the risk of account blowup. Consider tightening risk management.",
    });
  }

  // ========================================
  // 4. Nudge to upload if only projects, no backtests
  // ========================================
  if (recentBacktests.length === 0 && projectCount > 0 && insights.length < 2) {
    insights.push({
      type: "action",
      icon: "upload",
      message: "You have projects but no backtests — validate your strategies",
      detail: "Upload a backtest report to get a health score and AI analysis.",
      linkHref: "/app/evaluate",
      linkLabel: "Upload Backtest",
    });
  }

  // Return top 3 most relevant
  return insights.slice(0, 3);
}

/**
 * Determine the overall portfolio status from live EAs and backtests.
 */
export function getPortfolioStatus(
  liveEAs: LiveEASummary[],
  recentBacktests: BacktestSummary[]
): {
  status: "HEALTHY" | "ATTENTION" | "AT_RISK" | "NO_DATA";
  label: string;
} {
  if (liveEAs.length === 0 && recentBacktests.length === 0) {
    return { status: "NO_DATA", label: "No active strategies" };
  }

  const errorEAs = liveEAs.filter((ea) => ea.status === "ERROR");
  const weakBacktests = recentBacktests.filter((bt) => bt.healthStatus === "WEAK");

  if (errorEAs.length > 0 || weakBacktests.length > recentBacktests.length / 2) {
    return { status: "AT_RISK", label: "Needs Attention" };
  }

  const offlineEAs = liveEAs.filter((ea) => ea.status === "OFFLINE");
  const moderateBacktests = recentBacktests.filter((bt) => bt.healthStatus === "MODERATE");

  if (
    offlineEAs.length > liveEAs.length / 2 ||
    moderateBacktests.length > recentBacktests.length / 2
  ) {
    return { status: "ATTENTION", label: "Monitor Closely" };
  }

  return { status: "HEALTHY", label: "Portfolio Healthy" };
}
