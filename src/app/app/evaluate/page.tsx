"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import useSWR from "swr";
import { toast } from "sonner";
import { getCsrfHeaders } from "@/lib/api-client";

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

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`Fetch failed: ${r.status}`);
    return r.json();
  });

// ============================================
// Health status styling
// ============================================

function getHealthColor(status: string): string {
  switch (status) {
    case "ROBUST":
      return "#10B981"; // green
    case "MODERATE":
      return "#F59E0B"; // amber
    case "WEAK":
      return "#EF4444"; // red
    default:
      return "#71717A";
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
      return "rgba(113,113,122,0.1)";
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

export default function EvaluatePage() {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
          headers: { ...getCsrfHeaders() },
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

    setDeletingId(runId);
    try {
      const res = await fetch(`/api/backtest/${runId}`, {
        method: "DELETE",
        headers: { ...getCsrfHeaders() },
      });
      if (res.ok) {
        toast.success("Backtest deleted");
        mutate();
        if (result?.runId === runId) {
          setResult(null);
        }
      } else {
        toast.error("Failed to delete");
      }
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090B]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/app"
            className="text-sm text-[#71717A] hover:text-[#818CF8] transition-colors mb-4 inline-block"
          >
            &larr; Back to Dashboard
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Strategy Evaluation</h1>
          <p className="text-[#71717A] mt-2">
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
              ? "border-[#6366F1] bg-[#6366F1]/5"
              : "border-[rgba(255,255,255,0.10)] hover:border-[rgba(255,255,255,0.10)]"
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
              <div className="w-10 h-10 mx-auto border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-white font-medium">Parsing report...</p>
            </>
          ) : (
            <>
              <svg
                className="w-12 h-12 mx-auto text-[#71717A] mb-4"
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
              <p className="text-sm text-[#71717A]">
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
                      <div className="text-xs text-[#71717A]">/ 100</div>
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
                  <p className="text-sm text-[#71717A]">
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
            <div className="bg-[#111114] border border-[rgba(255,255,255,0.06)] rounded-xl overflow-hidden">
              <button
                onClick={() => setShowBreakdown(!showBreakdown)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-[rgba(255,255,255,0.06)] transition-colors"
              >
                <span className="text-sm font-medium text-white">Score Breakdown</span>
                <svg
                  className={`w-4 h-4 text-[#71717A] transition-transform ${showBreakdown ? "rotate-180" : ""}`}
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
                      <span className="text-xs text-[#71717A] w-32 flex-shrink-0">
                        {getMetricLabel(item.metric)}
                      </span>
                      <div className="flex-1 h-2 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${item.score}%`,
                            background:
                              item.score >= 70
                                ? "#10B981"
                                : item.score >= 40
                                  ? "#F59E0B"
                                  : "#EF4444",
                          }}
                        />
                      </div>
                      <span className="text-xs text-[#A1A1AA] w-16 text-right">
                        {item.score.toFixed(0)} / 100
                      </span>
                      <span className="text-xs text-[#71717A] w-12 text-right">
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
                <ul className="text-xs text-[#A1A1AA] space-y-1">
                  {result.parseWarnings.map((w, i) => (
                    <li key={i}>- {w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Validate Strategy CTA */}
            <Link
              href={`/app/evaluate/${result.runId}/validate`}
              className="block bg-[#111114] border border-[rgba(255,255,255,0.06)] rounded-xl p-5 hover:border-[rgba(255,255,255,0.10)] transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#6366F1]/10 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-5 h-5 text-[#6366F1]"
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
                    <h3 className="text-sm font-semibold text-white group-hover:text-white transition-colors">
                      Validate Strategy
                    </h3>
                    <p className="text-xs text-[#71717A]">
                      Run a Monte Carlo simulation to test survival probability
                    </p>
                  </div>
                </div>
                <svg
                  className="w-5 h-5 text-[#71717A] group-hover:text-white transition-colors flex-shrink-0"
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
                  className="bg-[#111114] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3"
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
                    <div className="flex items-center gap-3 text-xs text-[#71717A]">
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
                        href={`/app/evaluate/${item.runId}`}
                        className="text-xs text-[#818CF8] hover:text-white transition-colors"
                      >
                        View
                      </Link>
                    )}
                    {item.runId && (
                      <button
                        onClick={() => handleDelete(item.runId!)}
                        disabled={deletingId === item.runId}
                        className="text-xs text-[#71717A] hover:text-[#EF4444] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deletingId === item.runId ? (
                          <span className="flex items-center gap-1">
                            <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              />
                            </svg>
                            Deleting...
                          </span>
                        ) : (
                          "Delete"
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {listData.pagination.total > 10 && (
              <p className="text-xs text-[#71717A] mt-3 text-center">
                Showing 10 of {listData.pagination.total} uploads
              </p>
            )}
          </div>
        )}

        {/* How it works */}
        {!result && (
          <div className="mt-8 bg-[#111114] border border-[rgba(255,255,255,0.06)] rounded-xl p-6">
            <h3 className="text-sm font-medium text-white mb-3">How it works</h3>
            <div className="space-y-3 text-xs text-[#71717A]">
              <div className="flex items-start gap-3">
                <span className="bg-[#6366F1]/20 text-[#818CF8] rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
                  1
                </span>
                <p>
                  Run a backtest in MT5 Strategy Tester, then save the report as HTML (right-click
                  &rarr; Save as Report).
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-[#6366F1]/20 text-[#818CF8] rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
                  2
                </span>
                <p>
                  Upload the HTML file here. We parse all metrics, trades, and performance data
                  automatically.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-[#6366F1]/20 text-[#818CF8] rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
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
    <div className="bg-[#18181B] rounded-xl px-4 py-3">
      <p className="text-xs text-[#71717A] mb-1">{label}</p>
      <p className="text-lg font-bold" style={{ color: positive ? "#10B981" : "#EF4444" }}>
        {value}
      </p>
    </div>
  );
}
