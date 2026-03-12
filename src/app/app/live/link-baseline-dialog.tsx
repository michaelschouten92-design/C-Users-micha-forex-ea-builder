"use client";

import { useState, useEffect } from "react";
import { showSuccess } from "@/lib/toast";
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
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  healthScore: number;
  createdAt: string;
}

export function LinkBaselineDialog({
  instanceId,
  instanceName,
  isRelink,
  deploymentLabel,
  onClose,
  onLinked,
}: {
  instanceId: string;
  instanceName: string;
  isRelink?: boolean;
  /** Compact deployment identity, e.g. "EURUSD · H1 · Magic 12345" */
  deploymentLabel?: string;
  onClose: () => void;
  onLinked: (instanceId: string, baseline: BaselineData) => void;
}) {
  const [backtests, setBacktests] = useState<BacktestOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

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

  async function handleLink() {
    if (!selectedRunId) return;
    setLinking(true);
    setError(null);
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
        setError(json.error || "Failed to link baseline");
        setLinking(false);
        return;
      }
      showSuccess("Baseline linked successfully");
      onLinked(instanceId, json.baseline);
    } catch {
      setError("Network error — please try again");
      setLinking(false);
    }
  }

  const selected = backtests.find((b) => b.runId === selectedRunId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.3)] rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-[rgba(79,70,229,0.15)]">
          <h2 className="text-lg font-semibold text-white">
            {isRelink ? "Restore Baseline Trust" : "Link Backtest Baseline"}
          </h2>
          <p className="text-xs text-[#7C8DB0] mt-1">
            {isRelink
              ? `Baseline trust was suspended due to a material configuration change on "${instanceName}". Select a replacement backtest baseline to restore monitoring.`
              : `Select a backtest to use as baseline for "${instanceName}". Edge drift monitoring will compare live performance against this baseline.`}
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
                    <span className="text-[10px] text-[#7C8DB0] ml-2 shrink-0">{bt.symbol}</span>
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
              className="px-4 py-2 rounded-lg text-xs font-medium text-[#7C8DB0] border border-[rgba(79,70,229,0.2)] hover:text-white transition-all duration-200"
            >
              Cancel
            </button>
            <button
              onClick={handleLink}
              disabled={!selectedRunId || linking}
              className="px-4 py-2 rounded-lg text-xs font-medium text-white bg-[#4F46E5] hover:bg-[#6366F1] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {linking ? "Linking..." : "Link Baseline"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
