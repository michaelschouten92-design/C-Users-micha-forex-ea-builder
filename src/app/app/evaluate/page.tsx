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
    grossProfit?: number;
    grossLoss?: number;
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
  symbolSource?: "html_report" | "file_name" | "unknown";
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
  parseWarnings?: string[];
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
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [listLimit, setListLimit] = useState(10);
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());

  const { data: listData, mutate } = useSWR<{
    data: BacktestListItem[];
    pagination: { total: number };
  }>(`/api/backtest/list?limit=${listLimit}`, fetcher);

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

  const handleRename = async (runId: string) => {
    const name = renameValue.trim();
    if (!name) return;
    try {
      const res = await fetch(`/api/backtest/${runId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({ eaName: name }),
      });
      if (res.ok) {
        toast.success("Name updated");
        setRenamingId(null);
        mutate();
      } else {
        toast.error("Failed to rename");
      }
    } catch {
      toast.error("Failed to rename");
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
              <p className="text-white font-medium mb-1">Drop your backtest report here</p>
              <p className="text-sm text-[#71717A]">
                or click to browse — accepts MT4 and MT5 Strategy Tester .html files
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
              className="rounded-xl p-5 sm:p-6 border"
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
                    {/* Score Interpretation Guide */}
                    <ScoreGuide />
                  </div>
                  <h2 className="text-xl font-bold text-white mb-1">
                    {result.metadata.eaName || "Strategy"} — {result.metadata.symbol}
                    {result.symbolSource && result.symbolSource !== "html_report" && (
                      <span
                        className="ml-2 text-[10px] font-medium px-2 py-0.5 rounded-full align-middle"
                        style={{
                          color: result.symbolSource === "file_name" ? "#F59E0B" : "#71717A",
                          background:
                            result.symbolSource === "file_name"
                              ? "rgba(245,158,11,0.15)"
                              : "rgba(113,113,122,0.15)",
                        }}
                      >
                        {result.symbolSource === "file_name"
                          ? "detected from filename"
                          : "symbol unknown"}
                      </span>
                    )}
                  </h2>
                  <p className="text-sm text-[#71717A]">
                    {result.metadata.timeframe} | {result.metadata.period} |{" "}
                    {result.metrics.totalTrades} trades
                  </p>
                </div>
              </div>

              {/* Key Metrics Row */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6">
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
                <MetricCard
                  label="Sharpe Ratio"
                  value={result.metrics.sharpeRatio?.toFixed(2) ?? "N/A"}
                  positive={(result.metrics.sharpeRatio ?? 0) > 1}
                />
                <MetricCard
                  label="Recovery Factor"
                  value={result.metrics.recoveryFactor?.toFixed(2) ?? "N/A"}
                  positive={(result.metrics.recoveryFactor ?? 0) > 2}
                />
              </div>

              {/* Prop Firm Compliance Check */}
              <PropFirmCheck
                maxDrawdownPct={result.metrics.maxDrawdownPct}
                profitFactor={result.metrics.profitFactor}
                totalTrades={result.metrics.totalTrades}
              />
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

            {/* Warnings — prioritized: red flags first, then informational */}
            {result.parseWarnings.length > 0 && <WarningsPanel warnings={result.parseWarnings} />}

            {/* Next Steps — prominent CTAs */}
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Primary: Link as Baseline */}
              <Link
                href="/app/live"
                className="block bg-[#111114] border border-[rgba(16,185,129,0.2)] rounded-xl p-5 hover:border-[rgba(16,185,129,0.4)] transition-all group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-[#10B981]/10 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-5 h-5 text-[#10B981]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.03a4.5 4.5 0 00-6.364-6.364L6.34 5.47a4.5 4.5 0 001.242 7.244"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Link as Baseline</h3>
                    <p className="text-xs text-[#71717A]">
                      Use this backtest as the reference for live drift detection
                    </p>
                  </div>
                </div>
                <p className="text-[10px] text-[#10B981]">Recommended next step &rarr;</p>
              </Link>

              {/* Secondary: Monte Carlo */}
              <Link
                href={`/app/evaluate/${result.runId}/validate`}
                className="block bg-[#111114] border border-[rgba(255,255,255,0.06)] rounded-xl p-5 hover:border-[rgba(255,255,255,0.10)] transition-all group"
              >
                <div className="flex items-center gap-3 mb-2">
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
                    <h3 className="text-sm font-semibold text-white">Run Monte Carlo</h3>
                    <p className="text-xs text-[#71717A]">
                      Test survival probability with 1,000 randomized simulations
                    </p>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        )}

        {/* Previous Uploads */}
        {listData && listData.data.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Previous Uploads</h2>
              {compareIds.size === 2 && (
                <CompareButton
                  items={listData.data.filter((d) => d.runId && compareIds.has(d.runId))}
                />
              )}
              {compareIds.size === 1 && (
                <span className="text-xs text-[#71717A]">Select one more to compare</span>
              )}
            </div>
            <div className="space-y-3">
              {listData.data.map((item) => (
                <div
                  key={item.uploadId}
                  className="bg-[#111114] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {renamingId === item.runId ? (
                        <form
                          className="flex items-center gap-1.5"
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleRename(item.runId!);
                          }}
                        >
                          <input
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            autoFocus
                            className="text-sm font-medium text-white bg-[#18181B] border border-[rgba(255,255,255,0.15)] rounded px-2 py-0.5 w-48 outline-none focus:border-[#818CF8]"
                            onKeyDown={(e) => {
                              if (e.key === "Escape") setRenamingId(null);
                            }}
                          />
                          <button
                            type="submit"
                            className="text-[10px] text-[#10B981] hover:text-white"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setRenamingId(null)}
                            className="text-[10px] text-[#71717A] hover:text-white"
                          >
                            Cancel
                          </button>
                        </form>
                      ) : (
                        <span className="text-sm font-medium text-white truncate">
                          {(() => {
                            const sym =
                              item.symbol && item.symbol !== "UNKNOWN" ? item.symbol : null;
                            const tf = sym ? item.timeframe : null;
                            const ea = item.eaName && item.eaName !== "Report" ? item.eaName : null;
                            return [sym, tf].filter(Boolean).join(" · ") || ea || item.fileName;
                          })()}
                        </span>
                      )}
                      {item.healthStatus && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{
                            color: getHealthColor(item.healthStatus),
                            background: `${getHealthColor(item.healthStatus)}15`,
                          }}
                        >
                          {item.healthScore}/100
                        </span>
                      )}
                      {item.parseWarnings && item.parseWarnings.length > 0 && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium text-[#F59E0B] bg-[#F59E0B]/10 cursor-help"
                          title={(item.parseWarnings as string[]).join("\n")}
                        >
                          {item.parseWarnings.length} warning
                          {item.parseWarnings.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    {item.symbol &&
                      item.symbol !== "UNKNOWN" &&
                      item.eaName &&
                      item.eaName !== "Report" && (
                        <div className="text-xs text-[#A1A1AA] truncate mb-0.5">{item.eaName}</div>
                      )}
                    <div className="flex items-center gap-3 text-xs text-[#71717A]">
                      {item.totalTrades != null && <span>{item.totalTrades} trades</span>}
                      {item.profitFactor != null && <span>PF {item.profitFactor.toFixed(2)}</span>}
                      {item.maxDrawdownPct != null && (
                        <span>DD {item.maxDrawdownPct.toFixed(1)}%</span>
                      )}
                      {item.totalNetProfit != null && (
                        <span style={{ color: item.totalNetProfit > 0 ? "#10B981" : "#EF4444" }}>
                          $
                          {item.totalNetProfit.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      )}
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Compare checkbox */}
                    {item.runId && (
                      <label
                        className="flex items-center gap-1 cursor-pointer mr-2"
                        title="Select for comparison"
                      >
                        <input
                          type="checkbox"
                          checked={compareIds.has(item.runId)}
                          onChange={() => {
                            setCompareIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(item.runId!)) {
                                next.delete(item.runId!);
                              } else if (next.size < 2) {
                                next.add(item.runId!);
                              }
                              return next;
                            });
                          }}
                          className="w-3.5 h-3.5 rounded border-[rgba(255,255,255,0.2)] bg-[#18181B] accent-[#6366F1]"
                        />
                        <span className="text-[10px] text-[#71717A]">Compare</span>
                      </label>
                    )}
                    {item.runId && (
                      <button
                        onClick={() => {
                          setRenamingId(item.runId);
                          setRenameValue(item.eaName || item.fileName || "");
                        }}
                        className="px-2.5 py-1 text-[11px] font-medium rounded-md border border-[rgba(255,255,255,0.12)] text-[#FAFAFA] hover:text-white hover:border-[rgba(255,255,255,0.25)] bg-transparent transition-colors"
                        title="Rename"
                      >
                        Rename
                      </button>
                    )}
                    {item.runId && (
                      <Link
                        href={`/app/evaluate/${item.runId}`}
                        className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-[#6366F1] text-white hover:bg-[#6366F1] transition-colors"
                      >
                        View
                      </Link>
                    )}
                    {item.runId && (
                      <button
                        onClick={() => handleDelete(item.runId!)}
                        disabled={deletingId === item.runId}
                        className="px-2.5 py-1 text-[11px] font-medium rounded-md border border-[rgba(239,68,68,0.3)] text-[#EF4444] hover:bg-[rgba(239,68,68,0.1)] hover:border-[rgba(239,68,68,0.5)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

            {listData.pagination.total > listData.data.length && (
              <button
                onClick={() => setListLimit((prev) => prev + 10)}
                className="w-full mt-3 py-2 text-xs text-[#818CF8] hover:text-white border border-[rgba(255,255,255,0.06)] rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors"
              >
                Load more ({listData.data.length} of {listData.pagination.total})
              </button>
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

// ============================================
// Score Interpretation Guide
// ============================================

function ScoreGuide() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="text-[#71717A] hover:text-[#A1A1AA] transition-colors"
        aria-label="What does this score mean?"
        title="What does this score mean?"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-2 z-50 w-72 bg-[#111114] border border-[rgba(255,255,255,0.1)] rounded-xl p-4 shadow-2xl">
            <h4 className="text-sm font-semibold text-white mb-3">Score Interpretation</h4>
            <div className="space-y-2.5">
              <div className="flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[#10B981] mt-1.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-[#10B981]">75-100: Robust</p>
                  <p className="text-[11px] text-[#71717A]">
                    Strong statistical edge. Good profit factor, controlled drawdown, sufficient
                    sample size.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[#F59E0B] mt-1.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-[#F59E0B]">40-74: Moderate</p>
                  <p className="text-[11px] text-[#71717A]">
                    Shows potential but has weaknesses. May need more trades, lower drawdown, or
                    better risk/reward.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[#EF4444] mt-1.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-[#EF4444]">0-39: Weak</p>
                  <p className="text-[11px] text-[#71717A]">
                    Significant risks detected. High drawdown, low profit factor, or insufficient
                    trade data.
                  </p>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-[#52525B] mt-3 pt-2 border-t border-[rgba(255,255,255,0.06)]">
              Score is weighted across 7 metrics: profit factor (20%), max drawdown (25%), total
              trades (10%), expected payoff (10%), win rate (10%), Sharpe (15%), recovery factor
              (10%).
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================
// Prop Firm Compliance Check
// ============================================

function PropFirmCheck({
  maxDrawdownPct,
  profitFactor,
  totalTrades,
}: {
  maxDrawdownPct: number;
  profitFactor: number;
  totalTrades: number;
}) {
  const [expanded, setExpanded] = useState(false);

  const checks = [
    {
      label: "Max Drawdown ≤ 10%",
      pass: maxDrawdownPct <= 10,
      detail: `${maxDrawdownPct.toFixed(1)}%`,
      critical: maxDrawdownPct > 10,
    },
    {
      label: "Daily Drawdown ≤ 5%",
      pass: maxDrawdownPct <= 5,
      detail: maxDrawdownPct <= 5 ? "Within limit" : "Exceeds — check daily DD separately",
      critical: false,
    },
    {
      label: "Profit Factor > 1.2",
      pass: profitFactor > 1.2,
      detail: profitFactor.toFixed(2),
      critical: profitFactor <= 1.0,
    },
    {
      label: "Minimum 50 trades",
      pass: totalTrades >= 50,
      detail: `${totalTrades} trades`,
      critical: totalTrades < 30,
    },
  ];

  const passCount = checks.filter((c) => c.pass).length;
  const allPass = passCount === checks.length;

  return (
    <div className="mt-5 pt-4 border-t border-[rgba(255,255,255,0.06)]">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs w-full text-left"
      >
        <span className={`font-medium ${allPass ? "text-[#10B981]" : "text-[#F59E0B]"}`}>
          Prop Firm Check: {passCount}/{checks.length} passed
        </span>
        <svg
          className={`w-3 h-3 text-[#71717A] transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="mt-3 space-y-2">
          {checks.map((check) => (
            <div key={check.label} className="flex items-center gap-2 text-xs">
              {check.pass ? (
                <svg
                  className="w-3.5 h-3.5 text-[#10B981] shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <svg
                  className="w-3.5 h-3.5 text-[#EF4444] shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
              <span className={check.pass ? "text-[#A1A1AA]" : "text-[#EF4444]"}>
                {check.label}
              </span>
              <span className="text-[#71717A] ml-auto">{check.detail}</span>
            </div>
          ))}
          <p className="text-[10px] text-[#52525B] mt-2">
            Based on common prop firm rules (FTMO, MFF, E8). Check your specific firm&apos;s
            requirements.
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================
// Warnings Panel — prioritized
// ============================================

const RED_FLAG_PATTERNS = [
  "martingale",
  "overfitting",
  "outlier",
  "single trade",
  "catastrophic",
  "ruin",
  "blow",
  "grid pattern",
];

function WarningsPanel({ warnings }: { warnings: string[] }) {
  const redFlags = warnings.filter((w) =>
    RED_FLAG_PATTERNS.some((p) => w.toLowerCase().includes(p))
  );
  const informational = warnings.filter(
    (w) => !RED_FLAG_PATTERNS.some((p) => w.toLowerCase().includes(p))
  );

  return (
    <div className="space-y-3">
      {/* Red flags first */}
      {redFlags.length > 0 && (
        <div className="bg-[#EF4444]/5 border border-[#EF4444]/20 rounded-xl px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-4 h-4 text-[#EF4444]"
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
          <ul className="text-xs text-[#A1A1AA] space-y-1">
            {redFlags.map((w, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-[#EF4444] mt-0.5">•</span>
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Informational warnings */}
      {informational.length > 0 && (
        <div className="bg-[#F59E0B]/5 border border-[#F59E0B]/20 rounded-xl px-5 py-4">
          <p className="text-xs font-medium text-[#F59E0B] mb-2">Parse Notes</p>
          <ul className="text-xs text-[#71717A] space-y-1">
            {informational.map((w, i) => (
              <li key={i}>- {w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ============================================
// Compare Button + Side-by-Side Modal
// ============================================

function CompareButton({ items }: { items: BacktestListItem[] }) {
  const [open, setOpen] = useState(false);

  if (items.length !== 2) return null;
  const [a, b] = items;

  const metrics = [
    { label: "Health Score", a: a.healthScore ?? 0, b: b.healthScore ?? 0, higher: true },
    { label: "Profit Factor", a: a.profitFactor ?? 0, b: b.profitFactor ?? 0, higher: true },
    { label: "Max Drawdown", a: a.maxDrawdownPct ?? 0, b: b.maxDrawdownPct ?? 0, higher: false },
    { label: "Win Rate", a: a.winRate ?? 0, b: b.winRate ?? 0, higher: true },
    { label: "Total Trades", a: a.totalTrades ?? 0, b: b.totalTrades ?? 0, higher: true },
    { label: "Net Profit", a: a.totalNetProfit ?? 0, b: b.totalNetProfit ?? 0, higher: true },
  ];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 text-xs font-medium bg-[#6366F1] text-white rounded-lg hover:bg-[#818CF8] transition-colors"
      >
        Compare Selected
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative bg-[#111114] border border-[rgba(255,255,255,0.1)] rounded-xl p-6 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-semibold text-white">Strategy Comparison</h3>
              <button onClick={() => setOpen(false)} className="text-[#71717A] hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Header row */}
            <div className="grid grid-cols-3 gap-3 mb-4 text-xs">
              <div />
              <div className="text-center font-medium text-[#A1A1AA] truncate">
                {a.symbol && a.symbol !== "UNKNOWN" ? a.symbol : a.eaName || "Strategy A"}
              </div>
              <div className="text-center font-medium text-[#A1A1AA] truncate">
                {b.symbol && b.symbol !== "UNKNOWN" ? b.symbol : b.eaName || "Strategy B"}
              </div>
            </div>

            {/* Metrics */}
            <div className="space-y-2">
              {metrics.map((m) => {
                const aWins = m.higher ? m.a > m.b : m.a < m.b;
                const bWins = m.higher ? m.b > m.a : m.b < m.a;
                const isDraw = m.a === m.b;

                return (
                  <div
                    key={m.label}
                    className="grid grid-cols-3 gap-3 py-2 border-b border-[rgba(255,255,255,0.04)]"
                  >
                    <span className="text-xs text-[#71717A]">{m.label}</span>
                    <span
                      className={`text-xs text-center font-mono ${isDraw ? "text-[#A1A1AA]" : aWins ? "text-[#10B981] font-semibold" : "text-[#A1A1AA]"}`}
                    >
                      {m.label === "Net Profit"
                        ? `$${m.a.toFixed(2)}`
                        : m.label === "Max Drawdown" || m.label === "Win Rate"
                          ? `${m.a.toFixed(1)}%`
                          : m.a.toFixed(2)}
                    </span>
                    <span
                      className={`text-xs text-center font-mono ${isDraw ? "text-[#A1A1AA]" : bWins ? "text-[#10B981] font-semibold" : "text-[#A1A1AA]"}`}
                    >
                      {m.label === "Net Profit"
                        ? `$${m.b.toFixed(2)}`
                        : m.label === "Max Drawdown" || m.label === "Win Rate"
                          ? `${m.b.toFixed(1)}%`
                          : m.b.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>

            <p className="text-[10px] text-[#52525B] mt-4">
              Green = better performer for that metric. Lower drawdown is better.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
