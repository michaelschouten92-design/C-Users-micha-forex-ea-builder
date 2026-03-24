"use client";

import { useState, useEffect, useMemo } from "react";
import { getCsrfHeaders } from "@/lib/api-client";

export interface BaselineData {
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
}

interface BacktestOption {
  uploadId: string;
  runId: string;
  fileName: string;
  eaName: string | null;
  symbol: string;
  timeframe: string | null;
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  healthScore: number;
  createdAt: string;
}

/** Deployment context used for baseline auto-suggestion */
export interface DeploymentContext {
  symbol: string | null;
  timeframe: string | null;
  eaName: string | null;
}

/**
 * Score a backtest against deployment context.
 * Returns 0 (no match) to 3 (strong match).
 * Only returns > 0 if symbol matches exactly.
 */
function scoreMatch(bt: BacktestOption, ctx: DeploymentContext): number {
  if (!ctx.symbol) return 0;

  // Normalize symbols: strip trailing suffixes like ".r" or "m" for broker variants
  const normSymbol = (s: string) => s.replace(/[.\-_].*$/, "").toUpperCase();
  if (normSymbol(bt.symbol) !== normSymbol(ctx.symbol)) return 0;

  let score = 1; // symbol match

  if (ctx.timeframe && bt.timeframe) {
    const normTf = (t: string) => t.replace(/^PERIOD_/, "").toUpperCase();
    if (normTf(bt.timeframe) === normTf(ctx.timeframe)) {
      score += 1;
    }
  }

  if (ctx.eaName && bt.eaName) {
    if (bt.eaName.toLowerCase() === ctx.eaName.toLowerCase()) {
      score += 1;
    }
  }

  return score;
}

function findSuggestion(
  backtests: BacktestOption[],
  ctx: DeploymentContext | undefined
): BacktestOption | null {
  if (!ctx || !ctx.symbol) return null;

  const scored = backtests
    .map((bt) => ({ bt, score: scoreMatch(bt, ctx) }))
    .filter((s) => s.score >= 2) // require at least symbol + one more match
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.bt.healthScore - a.bt.healthScore; // tie-break by health
    });

  if (scored.length === 0) return null;

  // Only suggest if top match is clearly better than alternatives
  if (scored.length > 1 && scored[0].score === scored[1].score) {
    // Multiple equally strong matches — don't suggest ambiguously
    return null;
  }

  return scored[0].bt;
}

export function LinkBaselineDialog({
  instanceId,
  instanceName,
  isRelink,
  deploymentLabel,
  deploymentContext,
  onLinkingStarted,
  isActivating,
  onClose,
  onLinked,
}: {
  instanceId: string;
  instanceName: string;
  isRelink?: boolean;
  /** Compact deployment identity, e.g. "EURUSD · H1 · Magic 12345" */
  deploymentLabel?: string;
  /** Deployment fields used for auto-suggestion */
  deploymentContext?: DeploymentContext;
  /** Called when the link API call starts */
  onLinkingStarted?: () => void;
  /** True while the parent is running lifecycle activation after linking */
  isActivating?: boolean;
  onClose: () => void;
  onLinked: (instanceId: string, baseline: BaselineData) => void;
}) {
  const [backtests, setBacktests] = useState<BacktestOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchBacktests() {
      try {
        const res = await fetch("/api/backtest/list");
        if (!res.ok) throw new Error("Failed to load backtests");
        const json = await res.json();
        if (cancelled) return;

        // Filter eligible backtests (30+ trades, has a run)
        const options: BacktestOption[] = [];
        for (const item of json.data ?? []) {
          if (!item.runId || !item.totalTrades || item.totalTrades < 30) continue;
          options.push({
            uploadId: item.uploadId,
            runId: item.runId,
            fileName: item.fileName,
            eaName: item.eaName ?? null,
            symbol: item.symbol ?? "",
            timeframe: item.timeframe ?? null,
            totalTrades: item.totalTrades,
            winRate: item.winRate ?? 0,
            profitFactor: item.profitFactor ?? 0,
            healthScore: item.healthScore ?? 0,
            createdAt: item.createdAt,
          });
        }
        setBacktests(options);
      } catch {
        if (!cancelled) setError("Failed to load backtests");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchBacktests();
    return () => {
      cancelled = true;
    };
  }, []);

  const suggestion = useMemo(
    () => findSuggestion(backtests, deploymentContext),
    [backtests, deploymentContext]
  );

  // Auto-select suggestion when backtests load (only if user hasn't picked yet)
  useEffect(() => {
    if (suggestion && !selectedRunId && !suggestionDismissed) {
      setSelectedRunId(suggestion.runId);
    }
  }, [suggestion, selectedRunId, suggestionDismissed]);

  async function handleLink() {
    if (!selectedRunId) return;
    setLinking(true);
    setError(null);
    onLinkingStarted?.();
    try {
      const res = await fetch(`/api/live/${instanceId}/link-baseline`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({
          backtestRunId: selectedRunId,
          ...(isRelink ? { relink: true } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        const message =
          json.code === "BASELINE_ALREADY_LINKED"
            ? "A baseline is already linked to this instance. Refresh the page to see the current baseline."
            : json.code === "INELIGIBLE_INSTANCE"
              ? "This EA is managed through the export flow and cannot be linked manually."
              : json.error || "Something went wrong — please try again.";
        setError(message);
        setLinking(false);
        return;
      }
      onLinked(instanceId, json.baseline);
    } catch {
      setError("Connection failed — check your network and try again.");
      setLinking(false);
    }
  }

  const selected = backtests.find((b) => b.runId === selectedRunId);
  const showSuggestion = suggestion && !suggestionDismissed;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.3)] rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-[rgba(79,70,229,0.15)]">
          <h2 className="text-lg font-semibold text-white">
            {isRelink ? "Restore Baseline Trust" : "Link Strategy Baseline"}
          </h2>
          <p className="text-xs text-[#7C8DB0] mt-1">
            {isRelink
              ? `Baseline trust was suspended due to a material configuration change on "${instanceName}". Select a replacement backtest baseline to restore monitoring.`
              : `Choose the backtest that represents this strategy's intended behaviour. Edge drift monitoring will compare live performance against this reference.`}
          </p>
          {deploymentLabel && (
            <p className="text-[10px] text-[#64748B] mt-2">
              Deployment: <span className="text-[#94A3B8] font-medium">{deploymentLabel}</span>
            </p>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-[#4F46E5] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && error && !backtests.length && (
            <p className="text-sm text-[#EF4444] text-center py-4">{error}</p>
          )}

          {!loading && !error && backtests.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-[#94A3B8]">No eligible backtests found.</p>
              <p className="text-xs text-[#64748B] mt-1">
                Upload a backtest with at least 30 trades to link it as a baseline.
              </p>
            </div>
          )}

          {/* Suggestion banner */}
          {!loading && showSuggestion && (
            <div className="mb-3 p-3 rounded-lg bg-[#4F46E5]/10 border border-[#4F46E5]/25">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[#A78BFA]">Suggested baseline</p>
                  <p className="text-sm text-white truncate mt-0.5">
                    {suggestion.eaName || suggestion.fileName}
                  </p>
                  <div className="flex items-center gap-3 text-[10px] text-[#7C8DB0] mt-1">
                    <span>{suggestion.symbol}</span>
                    {suggestion.timeframe && <span>{suggestion.timeframe}</span>}
                    <span>{suggestion.totalTrades} trades</span>
                    <span>WR {suggestion.winRate.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => {
                      setSelectedRunId(suggestion.runId);
                      setSuggestionDismissed(true);
                    }}
                    className="px-2.5 py-1 rounded text-[10px] font-medium text-white bg-[#4F46E5] hover:bg-[#6366F1] transition-colors"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => {
                      setSuggestionDismissed(true);
                      if (selectedRunId === suggestion.runId) {
                        setSelectedRunId(null);
                      }
                    }}
                    className="px-2.5 py-1 rounded text-[10px] font-medium text-[#7C8DB0] border border-[rgba(79,70,229,0.2)] hover:text-white transition-colors"
                  >
                    Choose different
                  </button>
                </div>
              </div>
              <p className="text-[9px] text-[#64748B] mt-2">
                Matched on {deploymentContext?.symbol && "symbol"}
                {deploymentContext?.timeframe && suggestion.timeframe ? " + timeframe" : ""}
                {deploymentContext?.eaName && suggestion.eaName ? " + EA name" : ""}
              </p>
            </div>
          )}

          {!loading && backtests.length > 0 && (
            <div className="space-y-2">
              {backtests.map((bt) => (
                <button
                  key={bt.runId}
                  onClick={() => setSelectedRunId(bt.runId)}
                  className={`w-full text-left p-3 rounded-lg border transition-all duration-150 ${
                    selectedRunId === bt.runId
                      ? "border-[#4F46E5] bg-[#4F46E5]/10"
                      : "border-[rgba(79,70,229,0.15)] hover:border-[rgba(79,70,229,0.3)] bg-[#0A0118]/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-white truncate">
                      {bt.eaName || bt.fileName}
                    </span>
                    <span className="text-[10px] text-[#7C8DB0] ml-2 shrink-0">
                      {bt.symbol}
                      {bt.timeframe ? ` · ${bt.timeframe}` : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-[#7C8DB0]">
                    <span>{bt.totalTrades} trades</span>
                    <span>WR {bt.winRate.toFixed(1)}%</span>
                    <span>PF {bt.profitFactor.toFixed(2)}</span>
                    <span>Health {bt.healthScore}/100</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {error && backtests.length > 0 && <p className="text-xs text-[#EF4444] mt-3">{error}</p>}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-[rgba(79,70,229,0.15)] flex items-center justify-between gap-3">
          {selected && (
            <p className="text-[10px] text-[#7C8DB0] truncate flex-1">
              Selected: {selected.eaName || selected.fileName} ({selected.symbol})
            </p>
          )}
          {!selected && <div className="flex-1" />}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onClose}
              disabled={linking || isActivating}
              className="px-4 py-2 rounded-lg text-xs font-medium text-[#7C8DB0] border border-[rgba(79,70,229,0.2)] hover:text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleLink}
              disabled={!selectedRunId || linking || isActivating}
              className="px-4 py-2 rounded-lg text-xs font-medium text-white bg-[#4F46E5] hover:bg-[#6366F1] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isActivating ? "Activating..." : linking ? "Linking..." : "Link Baseline"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
