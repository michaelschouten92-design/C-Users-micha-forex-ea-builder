"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import useSWR from "swr";
import { toast } from "sonner";

// ============================================
// Types
// ============================================

interface UploadResult {
  uploadId: string;
  runId: string;
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
    expectedPayoff: number;
    totalTrades: number;
    winRate: number;
    sharpeRatio: number | null;
    recoveryFactor: number | null;
  };
  healthScore: number;
  healthStatus: "ROBUST" | "MODERATE" | "WEAK";
  scoreBreakdown: Array<{
    metric: string;
    value: number;
    score: number;
    weight: number;
  }>;
  parseWarnings: string[];
  dealCount: number;
}

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

interface BacktestListItem {
  uploadId: string;
  runId: string | null;
  fileName: string;
  fileSize: number;
  createdAt: string;
  eaName?: string;
  symbol?: string;
  timeframe?: string;
  totalNetProfit?: number;
  profitFactor?: number;
  maxDrawdownPct?: number;
  totalTrades?: number;
  winRate?: number;
  healthScore?: number;
  healthStatus?: string;
  project?: { id: string; name: string } | null;
}

// ============================================
// Fetcher
// ============================================

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ============================================
// Health status styling
// ============================================

function getHealthColor(status: string): string {
  switch (status) {
    case "ROBUST":
      return "#22C55E"; // green
    case "MODERATE":
      return "#F59E0B"; // amber
    case "WEAK":
      return "#EF4444"; // red
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

// ============================================
// Component
// ============================================

export default function BacktestPage() {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisData | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const { data: listData, mutate } = useSWR<{
    data: BacktestListItem[];
    pagination: { total: number };
  }>("/api/backtest/list?limit=10", fetcher);

  const handleUpload = useCallback(
    async (file: File) => {
      setError(null);
      setResult(null);

      // Client-side validation
      if (!file.name.endsWith(".html") && !file.name.endsWith(".htm")) {
        setError("Please upload an HTML file (.html or .htm)");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError("File is too large (max 5MB)");
        return;
      }

      setUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/backtest/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          if (res.status === 409) {
            setError("This report has already been uploaded.");
          } else {
            setError(data.error || "Upload failed");
          }
          return;
        }

        setResult(data);
        toast.success("Backtest parsed successfully!");
        mutate(); // Refresh the list
      } catch {
        setError("Upload failed. Please try again.");
      } finally {
        setUploading(false);
      }
    },
    [mutate]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleUpload(file);
    },
    [handleUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  }, []);

  const handleDelete = async (runId: string) => {
    if (!confirm("Delete this backtest analysis?")) return;

    try {
      const res = await fetch(`/api/backtest/${runId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Backtest deleted");
        mutate();
        if (result?.runId === runId) {
          setResult(null);
          setAiAnalysis(null);
        }
      } else {
        toast.error("Failed to delete");
      }
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleAnalyze = async () => {
    if (!result?.runId || analyzing) return;

    setAnalyzing(true);
    try {
      const res = await fetch(`/api/backtest/${result.runId}/analyze`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          toast.info("Analysis already exists");
        } else if (res.status === 429) {
          toast.error("Daily analysis limit reached. Upgrade your plan for more.");
        } else if (res.status === 503) {
          toast.error("AI analysis is currently unavailable");
        } else {
          toast.error(data.error || "Analysis failed");
        }
        return;
      }

      setAiAnalysis(data);
      toast.success("AI analysis complete!");
    } catch {
      toast.error("Analysis failed. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0118]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/app"
            className="text-sm text-[#7C8DB0] hover:text-[#A78BFA] transition-colors mb-4 inline-block"
          >
            &larr; Back to Dashboard
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Strategy Health Check</h1>
          <p className="text-[#7C8DB0] mt-2">
            Upload your MT5 Strategy Tester report and instantly know if your strategy is robust.
          </p>
        </div>

        {/* Upload Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-2xl p-10 sm:p-14 text-center transition-colors cursor-pointer mb-8 ${
            dragging
              ? "border-[#4F46E5] bg-[#4F46E5]/5"
              : "border-[rgba(79,70,229,0.3)] hover:border-[rgba(79,70,229,0.5)]"
          } ${uploading ? "opacity-50 pointer-events-none" : ""}`}
          onClick={() => {
            if (uploading) return;
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".html,.htm";
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) handleUpload(file);
            };
            input.click();
          }}
        >
          {uploading ? (
            <>
              <div className="w-10 h-10 mx-auto border-2 border-[#4F46E5] border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-white font-medium">Parsing report...</p>
            </>
          ) : (
            <>
              <svg
                className="w-12 h-12 mx-auto text-[#7C8DB0] mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="text-white font-medium mb-1">Drop MT5 backtest report here</p>
              <p className="text-sm text-[#7C8DB0]">
                or click to browse — accepts .html files from Strategy Tester
              </p>
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-8 px-4 py-3 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/20">
            <p className="text-sm text-[#EF4444]">{error}</p>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="mb-10 space-y-6">
            {/* Health Score Card */}
            <div
              className="rounded-2xl p-6 sm:p-8 border"
              style={{
                background: getHealthBg(result.healthStatus),
                borderColor: `${getHealthColor(result.healthStatus)}33`,
              }}
            >
              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* Score Circle */}
                <div className="flex-shrink-0">
                  <div
                    className="w-28 h-28 rounded-full flex items-center justify-center border-4"
                    style={{ borderColor: getHealthColor(result.healthStatus) }}
                  >
                    <div className="text-center">
                      <div
                        className="text-3xl font-bold"
                        style={{ color: getHealthColor(result.healthStatus) }}
                      >
                        {result.healthScore}
                      </div>
                      <div className="text-xs text-[#7C8DB0]">/ 100</div>
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="flex-1 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                    <span
                      className="text-sm font-semibold px-3 py-1 rounded-full"
                      style={{
                        color: getHealthColor(result.healthStatus),
                        background: `${getHealthColor(result.healthStatus)}20`,
                      }}
                    >
                      {result.healthStatus}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white mb-1">
                    {result.metadata.eaName || "Strategy"} — {result.metadata.symbol}
                  </h2>
                  <p className="text-sm text-[#7C8DB0]">
                    {result.metadata.timeframe} | {result.metadata.period} |{" "}
                    {result.metrics.totalTrades} trades
                  </p>
                </div>
              </div>

              {/* Key Metrics Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                <MetricCard
                  label="Net Profit"
                  value={`$${result.metrics.totalNetProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  positive={result.metrics.totalNetProfit > 0}
                />
                <MetricCard
                  label="Profit Factor"
                  value={result.metrics.profitFactor.toFixed(2)}
                  positive={result.metrics.profitFactor > 1}
                />
                <MetricCard
                  label="Max Drawdown"
                  value={`${result.metrics.maxDrawdownPct.toFixed(2)}%`}
                  positive={result.metrics.maxDrawdownPct < 20}
                />
                <MetricCard
                  label="Win Rate"
                  value={`${result.metrics.winRate.toFixed(1)}%`}
                  positive={result.metrics.winRate > 50}
                />
              </div>
            </div>

            {/* Score Breakdown (expandable) */}
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
                  {result.scoreBreakdown.map((item) => (
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

            {/* Parse Warnings */}
            {result.parseWarnings.length > 0 && (
              <div className="bg-[#F59E0B]/5 border border-[#F59E0B]/20 rounded-xl px-5 py-4">
                <p className="text-xs font-medium text-[#F59E0B] mb-2">Parse Warnings</p>
                <ul className="text-xs text-[#94A3B8] space-y-1">
                  {result.parseWarnings.map((w, i) => (
                    <li key={i}>- {w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* AI Strategy Doctor */}
            <AIStrategyDoctor
              runId={result.runId}
              analysis={aiAnalysis}
              analyzing={analyzing}
              onAnalyze={handleAnalyze}
            />

            {/* Validate Strategy CTA */}
            <Link
              href={`/app/backtest/${result.runId}/validate`}
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
          </div>
        )}

        {/* Previous Uploads */}
        {listData && listData.data.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">Previous Uploads</h2>
            <div className="space-y-3">
              {listData.data.map((item) => (
                <div
                  key={item.uploadId}
                  className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-white truncate">
                        {item.eaName || item.fileName}
                      </span>
                      {item.healthStatus && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{
                            color: getHealthColor(item.healthStatus),
                            background: `${getHealthColor(item.healthStatus)}15`,
                          }}
                        >
                          {item.healthScore}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[#7C8DB0]">
                      {item.symbol && <span>{item.symbol}</span>}
                      {item.timeframe && <span>{item.timeframe}</span>}
                      {item.totalTrades != null && <span>{item.totalTrades} trades</span>}
                      {item.profitFactor != null && <span>PF {item.profitFactor.toFixed(2)}</span>}
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {item.runId && (
                      <Link
                        href={`/app/backtest/${item.runId}`}
                        className="text-xs text-[#A78BFA] hover:text-[#22D3EE] transition-colors"
                      >
                        View
                      </Link>
                    )}
                    {item.runId && (
                      <button
                        onClick={() => handleDelete(item.runId!)}
                        className="text-xs text-[#7C8DB0] hover:text-[#EF4444] transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {listData.pagination.total > 10 && (
              <p className="text-xs text-[#7C8DB0] mt-3 text-center">
                Showing 10 of {listData.pagination.total} uploads
              </p>
            )}
          </div>
        )}

        {/* How it works */}
        {!result && (
          <div className="mt-8 bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
            <h3 className="text-sm font-medium text-white mb-3">How it works</h3>
            <div className="space-y-3 text-xs text-[#7C8DB0]">
              <div className="flex items-start gap-3">
                <span className="bg-[#4F46E5]/20 text-[#A78BFA] rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
                  1
                </span>
                <p>
                  Run a backtest in MT5 Strategy Tester, then save the report as HTML (right-click
                  &rarr; Save as Report).
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-[#4F46E5]/20 text-[#A78BFA] rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
                  2
                </span>
                <p>
                  Upload the HTML file here. We parse all metrics, trades, and performance data
                  automatically.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-[#4F46E5]/20 text-[#A78BFA] rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
                  3
                </span>
                <p>
                  Get an instant Health Score (0-100) that tells you if your strategy is robust,
                  moderate, or weak — based on profit factor, drawdown, Sharpe ratio, and more.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
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

function AIStrategyDoctor({
  runId,
  analysis,
  analyzing,
  onAnalyze,
}: {
  runId: string;
  analysis: AIAnalysisData | null;
  analyzing: boolean;
  onAnalyze: () => void;
}) {
  // Not yet analyzed — show trigger button
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
            <h3 className="text-sm font-semibold text-white mb-1">AI Strategy Doctor</h3>
            <p className="text-xs text-[#7C8DB0]">
              Get a deep AI analysis of your strategy — weaknesses, overfitting signals, risk
              assessment, and live trading readiness.
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

  // Analyzing in progress
  if (analyzing) {
    return (
      <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-5 h-5 border-2 border-[#4F46E5] border-t-transparent rounded-full animate-spin" />
          <h3 className="text-sm font-semibold text-white">AI Strategy Doctor is analyzing...</h3>
        </div>
        <p className="text-xs text-[#7C8DB0]">
          Reviewing metrics, trade patterns, and risk factors. This usually takes 10-20 seconds.
        </p>
      </div>
    );
  }

  // Analysis complete — show results
  if (!analysis) return null;

  return (
    <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-xl overflow-hidden">
      {/* Header */}
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
          <h3 className="text-sm font-semibold text-white">AI Strategy Doctor</h3>
          <span className="text-[10px] text-[#64748b] ml-auto">{analysis.model}</span>
        </div>
      </div>

      {/* Analysis Text */}
      <div className="px-6 py-5">
        <div className="prose prose-invert prose-sm max-w-none text-[#CBD5E1] text-sm leading-relaxed whitespace-pre-wrap">
          {analysis.analysis}
        </div>
      </div>

      {/* Weaknesses */}
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
