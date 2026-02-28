"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { WalkForwardResults } from "./walk-forward-results";
import { OptimizationResults } from "./optimization-results";
import type { WalkForwardResult } from "@/lib/backtest-parser/walk-forward";
import type { ParameterOptimization } from "@/lib/ai-strategy-doctor";

// ============================================
// Types
// ============================================

interface AIAnalysisData {
  id: string;
  analysis: string;
  weaknesses: Array<{
    category: string;
    severity: "HIGH" | "MEDIUM" | "LOW";
    description: string;
    recommendation: string;
  }>;
  model: string;
  createdAt: string;
}

interface BacktestDetail {
  id: string;
  uploadId: string;
  fileName: string;
  fileSize: number;
  projectId: string | null;
  createdAt: string;
  metadata: {
    eaName: string | null;
    symbol: string;
    timeframe: string;
    period: string;
    initialDeposit: number;
  };
  metrics: {
    totalNetProfit: number;
    profitFactor: number;
    maxDrawdownPct: number;
    maxDrawdownAbs: number;
    sharpeRatio: number | null;
    recoveryFactor: number | null;
    expectedPayoff: number;
    totalTrades: number;
    winRate: number;
    longWinRate: number | null;
    shortWinRate: number | null;
  };
  healthScore: number;
  healthStatus: "ROBUST" | "MODERATE" | "WEAK" | "INSUFFICIENT_DATA";
  healthScoreVersion: number | null;
  confidenceInterval: { lower: number; upper: number } | null;
  scoreBreakdown: Array<{
    metric: string;
    value: number;
    score: number;
    weight: number;
  }>;
  parseWarnings: string[];
  detectedLocale: string | null;
  dealCount: number;
  aiAnalysis: AIAnalysisData | null;
  walkForwardResult: WalkForwardResult | null;
  tier: string;
  optimizations: ParameterOptimization[] | null;
}

// ============================================
// Health status styling
// ============================================

function getHealthColor(status: string): string {
  switch (status) {
    case "ROBUST":
      return "#22C55E";
    case "MODERATE":
      return "#F59E0B";
    case "WEAK":
      return "#EF4444";
    case "INSUFFICIENT_DATA":
      return "#7C8DB0";
    default:
      return "#7C8DB0";
  }
}

function getHealthBg(status: string): string {
  switch (status) {
    case "ROBUST":
      return "rgba(34,197,94,0.1)";
    case "MODERATE":
      return "rgba(245,158,11,0.1)";
    case "WEAK":
      return "rgba(239,68,68,0.1)";
    case "INSUFFICIENT_DATA":
      return "rgba(124,141,176,0.1)";
    default:
      return "rgba(124,141,176,0.1)";
  }
}

function getMetricLabel(metric: string): string {
  const labels: Record<string, string> = {
    profitFactor: "Profit Factor",
    maxDrawdownPct: "Max Drawdown",
    totalTrades: "Total Trades",
    expectedPayoff: "Expected Payoff",
    winRate: "Win Rate",
    sharpeRatio: "Sharpe Ratio",
    recoveryFactor: "Recovery Factor",
  };
  return labels[metric] || metric;
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case "HIGH":
      return "#EF4444";
    case "MEDIUM":
      return "#F59E0B";
    case "LOW":
      return "#3B82F6";
    default:
      return "#7C8DB0";
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ============================================
// Sub-components
// ============================================

function MetricCard({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive: boolean;
}) {
  return (
    <div className="bg-[rgba(0,0,0,0.2)] rounded-xl px-4 py-3">
      <p className="text-xs text-[#7C8DB0] mb-1">{label}</p>
      <p className="text-lg font-bold" style={{ color: positive ? "#22C55E" : "#EF4444" }}>
        {value}
      </p>
    </div>
  );
}

// ============================================
// Component
// ============================================

export default function BacktestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [data, setData] = useState<BacktestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisData | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Fetch backtest data
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/backtest/${id}`);
        if (!res.ok) {
          setError("Backtest not found");
          return;
        }
        const json = await res.json();
        setData(json);
        if (json.aiAnalysis) {
          setAiAnalysis(json.aiAnalysis);
        }
      } catch {
        setError("Failed to load backtest data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  const handleAnalyze = async () => {
    if (!data || analyzing) return;

    setAnalyzing(true);
    try {
      const res = await fetch(`/api/backtest/${id}/analyze`, {
        method: "POST",
      });

      const json = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          toast.info("Analysis already exists");
        } else if (res.status === 429) {
          toast.error("Daily analysis limit reached. Upgrade your plan for more.");
        } else if (res.status === 503) {
          toast.error("AI analysis is currently unavailable");
        } else {
          toast.error(json.error || "Analysis failed");
        }
        return;
      }

      setAiAnalysis(json);
      toast.success("AI analysis complete!");
    } catch {
      toast.error("Analysis failed. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this backtest analysis?")) return;

    try {
      const res = await fetch(`/api/backtest/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Backtest deleted");
        router.push("/app/evaluate");
      } else {
        toast.error("Failed to delete");
      }
    } catch {
      toast.error("Failed to delete");
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0118] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#4F46E5] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0A0118]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <Link
            href="/app/evaluate"
            className="text-sm text-[#7C8DB0] hover:text-[#A78BFA] transition-colors mb-4 inline-block"
          >
            &larr; Back to Backtest
          </Link>
          <div className="mt-8 px-4 py-3 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/20">
            <p className="text-sm text-[#EF4444]">{error || "Backtest not found"}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0118]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/app/evaluate"
            className="text-sm text-[#7C8DB0] hover:text-[#A78BFA] transition-colors mb-4 inline-block"
          >
            &larr; Back to Backtest
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            {data.metadata.eaName || "Strategy"} — {data.metadata.symbol}
          </h1>
          <p className="text-[#7C8DB0] mt-2">
            {data.metadata.timeframe} | {data.metadata.period} | {data.metrics.totalTrades} trades
          </p>
        </div>

        <div className="space-y-6">
          {/* Health Score Card */}
          <div
            className="rounded-2xl p-6 sm:p-8 border"
            style={{
              background: getHealthBg(data.healthStatus),
              borderColor: `${getHealthColor(data.healthStatus)}33`,
            }}
          >
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Score Circle */}
              <div className="flex-shrink-0">
                <div
                  className="w-28 h-28 rounded-full flex items-center justify-center border-4"
                  style={{ borderColor: getHealthColor(data.healthStatus) }}
                >
                  <div className="text-center">
                    <div
                      className="text-3xl font-bold"
                      style={{ color: getHealthColor(data.healthStatus) }}
                    >
                      {data.healthScore}
                    </div>
                    <div className="text-xs text-[#7C8DB0]">/ 100</div>
                    {data.confidenceInterval && data.healthStatus !== "INSUFFICIENT_DATA" && (
                      <div className="text-[10px] text-[#7C8DB0] mt-0.5">
                        ±
                        {Math.round(
                          (data.confidenceInterval.upper - data.confidenceInterval.lower) / 2
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Badge + Explainer */}
              <div className="flex-1 text-center sm:text-left">
                <span
                  className="text-sm font-semibold px-3 py-1 rounded-full"
                  style={{
                    color: getHealthColor(data.healthStatus),
                    background: `${getHealthColor(data.healthStatus)}20`,
                  }}
                >
                  {data.healthStatus}
                </span>
                {data.confidenceInterval && data.healthStatus !== "INSUFFICIENT_DATA" && (
                  <span className="text-[10px] text-[#7C8DB0] ml-2">
                    CI: {data.confidenceInterval.lower}–{data.confidenceInterval.upper}
                  </span>
                )}
                <p className="text-xs text-[#94A3B8] mt-2 max-w-md">
                  {data.healthStatus === "ROBUST" &&
                    "Strategy shows consistent edge across multiple metrics. Consider paper trading or Monte Carlo validation before live deployment."}
                  {data.healthStatus === "MODERATE" &&
                    "Some metrics are below optimal. Review the score breakdown for specific concerns before deploying."}
                  {data.healthStatus === "WEAK" &&
                    "Multiple metrics indicate poor or risky performance. Do not deploy without significant improvements and retesting."}
                  {data.healthStatus === "INSUFFICIENT_DATA" &&
                    "Not enough trades for a statistically reliable assessment. Upload a backtest with at least 30 trades."}
                </p>
                <div className="mt-2 text-[11px] text-[#7C8DB0]">
                  <span className="font-medium text-[#A78BFA]">Next steps: </span>
                  {data.healthStatus === "ROBUST" &&
                    "Run Monte Carlo validation below \u2192 Set up live monitoring after deployment."}
                  {data.healthStatus === "MODERATE" &&
                    "Review weak metrics in the breakdown \u2192 Consider parameter optimization \u2192 Retest with a longer period."}
                  {data.healthStatus === "WEAK" &&
                    "Review strategy fundamentals \u2192 Check for overfitting with walk-forward analysis \u2192 Rework entry/exit logic before retesting."}
                  {data.healthStatus === "INSUFFICIENT_DATA" &&
                    "Upload a backtest with more trades (ideally 100+) for a reliable assessment."}
                </div>
              </div>
            </div>

            {/* Key Metrics Grid (4 columns) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
              <MetricCard
                label="Net Profit"
                value={`$${data.metrics.totalNetProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                positive={data.metrics.totalNetProfit > 0}
              />
              <MetricCard
                label="Profit Factor"
                value={data.metrics.profitFactor.toFixed(2)}
                positive={data.metrics.profitFactor > 1}
              />
              <MetricCard
                label="Max Drawdown"
                value={`${data.metrics.maxDrawdownPct.toFixed(2)}%`}
                positive={data.metrics.maxDrawdownPct < 20}
              />
              <MetricCard
                label="Win Rate"
                value={`${data.metrics.winRate.toFixed(1)}%`}
                positive={data.metrics.winRate > 50}
              />
            </div>
          </div>

          {/* Risk Disclaimer */}
          <div className="bg-[#1A0626]/50 border border-[#F59E0B]/20 rounded-lg px-4 py-3">
            <p className="text-[11px] text-[#F59E0B]/80 leading-relaxed">
              Past performance does not guarantee future results. Backtest results are hypothetical
              and subject to model limitations.
            </p>
          </div>

          {/* Extended Metrics */}
          <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
            <h3 className="text-sm font-medium text-white mb-4">Extended Metrics</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <p className="text-xs text-[#7C8DB0] mb-1">Sharpe Ratio</p>
                <p className="text-sm font-semibold text-white">
                  {data.metrics.sharpeRatio != null ? data.metrics.sharpeRatio.toFixed(2) : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#7C8DB0] mb-1">Recovery Factor</p>
                <p className="text-sm font-semibold text-white">
                  {data.metrics.recoveryFactor != null
                    ? data.metrics.recoveryFactor.toFixed(2)
                    : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#7C8DB0] mb-1">Expected Payoff</p>
                <p className="text-sm font-semibold text-white">
                  ${data.metrics.expectedPayoff.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#7C8DB0] mb-1">Total Trades</p>
                <p className="text-sm font-semibold text-white">{data.metrics.totalTrades}</p>
              </div>
              <div>
                <p className="text-xs text-[#7C8DB0] mb-1">Max Drawdown (abs)</p>
                <p className="text-sm font-semibold text-white">
                  ${data.metrics.maxDrawdownAbs.toFixed(2)}
                </p>
              </div>
              {data.metrics.longWinRate != null && (
                <div>
                  <p className="text-xs text-[#7C8DB0] mb-1">Long Win Rate</p>
                  <p className="text-sm font-semibold text-white">
                    {data.metrics.longWinRate.toFixed(1)}%
                  </p>
                </div>
              )}
              {data.metrics.shortWinRate != null && (
                <div>
                  <p className="text-xs text-[#7C8DB0] mb-1">Short Win Rate</p>
                  <p className="text-sm font-semibold text-white">
                    {data.metrics.shortWinRate.toFixed(1)}%
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Score Breakdown (expandable) */}
          {data.scoreBreakdown && data.scoreBreakdown.length > 0 && (
            <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-xl overflow-hidden">
              <button
                onClick={() => setShowBreakdown(!showBreakdown)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-[rgba(79,70,229,0.05)] transition-colors"
              >
                <span className="text-sm font-medium text-white">Score Breakdown</span>
                <svg
                  className={`w-4 h-4 text-[#7C8DB0] transition-transform ${showBreakdown ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {showBreakdown && (
                <div className="px-6 pb-5 space-y-3">
                  {data.scoreBreakdown.map((item) => (
                    <div key={item.metric} className="flex items-center gap-3">
                      <span className="text-xs text-[#7C8DB0] w-32 flex-shrink-0">
                        {getMetricLabel(item.metric)}
                      </span>
                      <div className="flex-1 h-2 bg-[rgba(79,70,229,0.1)] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${item.score}%`,
                            background:
                              item.score >= 70
                                ? "#22C55E"
                                : item.score >= 40
                                  ? "#F59E0B"
                                  : "#EF4444",
                          }}
                        />
                      </div>
                      <span className="text-xs text-[#94A3B8] w-16 text-right">
                        {item.score.toFixed(0)} / 100
                      </span>
                      <span className="text-xs text-[#64748b] w-12 text-right">
                        ({(item.weight * 100).toFixed(0)}%)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* AI Strategy Insights */}
          <AIStrategyInsights
            analysis={aiAnalysis}
            analyzing={analyzing}
            onAnalyze={handleAnalyze}
          />

          {/* AI Strategy Optimizer */}
          <OptimizationResults
            backtestId={id}
            existingOptimizations={data.optimizations}
            hasAiAnalysis={!!aiAnalysis}
            tier={data.tier ?? "FREE"}
          />

          {/* Walk-Forward Analysis */}
          <WalkForwardResults
            backtestId={id}
            existingResult={data.walkForwardResult}
            tier={data.tier ?? "FREE"}
          />

          {/* Warnings — red flags separated from informational */}
          {data.parseWarnings.length > 0 &&
            (() => {
              const RED_FLAG_PATTERNS = [
                "martingale",
                "grid",
                "outlier",
                "catastrophic",
                "overfitting",
                "suspiciously high",
                "extremely high",
                "unusually high",
                "insufficient sample",
              ];
              const isRedFlag = (w: string) =>
                RED_FLAG_PATTERNS.some((p) => w.toLowerCase().includes(p));
              const redFlags = data.parseWarnings.filter(isRedFlag);
              const infoWarnings = data.parseWarnings.filter((w) => !isRedFlag(w));

              return (
                <>
                  {redFlags.length > 0 && (
                    <div className="bg-[#EF4444]/5 border border-[#EF4444]/25 rounded-xl px-5 py-4">
                      <div className="flex items-center gap-2 mb-2">
                        <svg
                          className="w-4 h-4 text-[#EF4444] flex-shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                          />
                        </svg>
                        <p className="text-xs font-semibold text-[#EF4444]">Red Flags</p>
                      </div>
                      <ul className="text-xs text-[#F87171] space-y-1.5">
                        {redFlags.map((w, i) => (
                          <li key={i} className="pl-1">
                            - {w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {infoWarnings.length > 0 && (
                    <div className="bg-[#F59E0B]/5 border border-[#F59E0B]/20 rounded-xl px-5 py-4">
                      <p className="text-xs font-medium text-[#F59E0B] mb-2">Warnings</p>
                      <ul className="text-xs text-[#94A3B8] space-y-1">
                        {infoWarnings.map((w, i) => (
                          <li key={i}>- {w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              );
            })()}

          {/* Validate Strategy CTA */}
          <Link
            href={`/app/evaluate/${id}/validate`}
            className="block bg-gradient-to-r from-[rgba(34,211,238,0.1)] to-[rgba(79,70,229,0.15)] border border-[rgba(34,211,238,0.25)] rounded-xl p-5 hover:border-[rgba(34,211,238,0.4)] transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#22D3EE]/10 flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-5 h-5 text-[#22D3EE]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white group-hover:text-[#22D3EE] transition-colors">
                    Validate Strategy
                  </h3>
                  <p className="text-xs text-[#7C8DB0]">
                    Run a Monte Carlo simulation to test survival probability
                  </p>
                </div>
              </div>
              <svg
                className="w-5 h-5 text-[#7C8DB0] group-hover:text-[#22D3EE] transition-colors flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </Link>

          {/* Evaluation → Live Bridge */}
          <div className="flex items-center gap-3 px-5 py-3.5 bg-[#1A0626]/60 border border-[rgba(79,70,229,0.1)] rounded-xl">
            <svg
              className="w-4 h-4 text-[#A78BFA] flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
            <p className="text-xs text-[#94A3B8]">
              <span className="text-[#A78BFA] font-medium">Next: </span>
              Deploy this strategy live to begin the evaluation lifecycle. New strategies start at{" "}
              <span className="text-[#A78BFA] font-medium">Testing</span> status and progress as
              they build a track record.
            </p>
            <Link
              href="/app/monitor"
              className="text-xs text-[#A78BFA] hover:text-[#22D3EE] transition-colors font-medium whitespace-nowrap flex-shrink-0"
            >
              Set Up &rarr;
            </Link>
          </div>

          {/* Action Bar */}
          <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="text-xs text-[#7C8DB0] space-y-1">
              <p>
                File: {data.fileName} ({formatFileSize(data.fileSize)})
              </p>
              <p>Uploaded: {new Date(data.createdAt).toLocaleString()}</p>
              {data.detectedLocale && <p>Locale: {data.detectedLocale}</p>}
              {data.dealCount > 0 && <p>Deals: {data.dealCount}</p>}
            </div>
            <button
              onClick={handleDelete}
              className="text-xs text-[#7C8DB0] hover:text-[#EF4444] transition-colors px-3 py-1.5 border border-[rgba(239,68,68,0.2)] hover:border-[rgba(239,68,68,0.4)] rounded-lg"
            >
              Delete Backtest
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// AI Strategy Insights
// ============================================

function AIStrategyInsights({
  analysis,
  analyzing,
  onAnalyze,
}: {
  analysis: AIAnalysisData | null;
  analyzing: boolean;
  onAnalyze: () => void;
}) {
  if (!analysis && !analyzing) {
    return (
      <div className="bg-gradient-to-r from-[rgba(79,70,229,0.15)] to-[rgba(167,139,250,0.1)] border border-[rgba(79,70,229,0.25)] rounded-xl p-6">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-[#4F46E5]/20 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-[#A78BFA]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"
                />
              </svg>
            </div>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-sm font-semibold text-white mb-1">AI Strategy Insights</h3>
            <p className="text-xs text-[#7C8DB0]">
              Get AI-powered analysis of your strategy — weaknesses, overfitting signals, and risk
              assessment. This is educational analysis, not a deployment decision.
            </p>
          </div>
          <button
            onClick={onAnalyze}
            className="px-5 py-2.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-medium rounded-lg transition-colors flex-shrink-0"
          >
            Analyze Strategy
          </button>
        </div>
      </div>
    );
  }

  if (analyzing) {
    return (
      <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-5 h-5 border-2 border-[#4F46E5] border-t-transparent rounded-full animate-spin" />
          <h3 className="text-sm font-semibold text-white">AI Strategy Insights is analyzing...</h3>
        </div>
        <p className="text-xs text-[#7C8DB0]">
          Reviewing metrics, trade patterns, and risk factors. This usually takes 10-20 seconds.
        </p>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-[rgba(79,70,229,0.1)]">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-[#A78BFA]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"
            />
          </svg>
          <h3 className="text-sm font-semibold text-white">AI Strategy Insights</h3>
          <span className="text-[10px] text-[#64748b] ml-auto">{analysis.model}</span>
        </div>
      </div>

      <div className="px-6 py-5">
        <div className="prose prose-invert prose-sm max-w-none text-[#CBD5E1] text-sm leading-relaxed whitespace-pre-wrap">
          {analysis.analysis}
        </div>
      </div>

      {analysis.weaknesses.length > 0 && (
        <div className="px-6 pb-5">
          <h4 className="text-xs font-semibold text-white mb-3 uppercase tracking-wider">
            Identified Weaknesses
          </h4>
          <div className="space-y-3">
            {analysis.weaknesses.map((w, i) => (
              <div
                key={i}
                className="bg-[rgba(0,0,0,0.2)] rounded-lg p-4 border-l-2"
                style={{ borderLeftColor: getSeverityColor(w.severity) }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                    style={{
                      color: getSeverityColor(w.severity),
                      background: `${getSeverityColor(w.severity)}15`,
                    }}
                  >
                    {w.severity}
                  </span>
                  <span className="text-[10px] text-[#64748b] uppercase tracking-wider">
                    {w.category.replace(/_/g, " ")}
                  </span>
                </div>
                <p className="text-xs text-[#CBD5E1] mb-1.5">{w.description}</p>
                <p className="text-xs text-[#A78BFA]">{w.recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
