"use client";

import { useState, useEffect } from "react";
import { showSuccess, showError } from "@/lib/toast";

interface BacktestResultOption {
  id: string;
  fileName: string;
  createdAt: string;
  results: {
    totalTrades: number;
    winRate: number;
    profitFactor: number;
    netProfit: number;
  };
}

interface BaselineSetupModalProps {
  projectId: string;
  strategyVersionId?: string;
  onClose: () => void;
  onBaselineSet: () => void;
}

export function BaselineSetupModal({
  projectId,
  strategyVersionId,
  onClose,
  onBaselineSet,
}: BaselineSetupModalProps) {
  const [backtestResults, setBacktestResults] = useState<BacktestResultOption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [durationDays, setDurationDays] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchBacktests() {
      try {
        const res = await fetch(`/api/backtest?projectId=${projectId}`);
        if (res.ok) {
          const data = await res.json();
          setBacktestResults(data.results || []);
        }
      } catch {
        // Handle error silently
      } finally {
        setLoading(false);
      }
    }
    fetchBacktests();
  }, [projectId]);

  async function handleSetBaseline() {
    if (!selectedId) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/strategy-identity/baseline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          backtestResultId: selectedId,
          strategyVersionId,
          ...(durationDays ? { durationDays: parseInt(durationDays, 10) } : {}),
        }),
      });

      if (res.ok) {
        showSuccess("Baseline set successfully");
        onBaselineSet();
        onClose();
      } else {
        const data = await res.json();
        showError(data.error || "Failed to set baseline");
      }
    } catch {
      showError("Failed to set baseline");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Set Backtest Baseline</h3>
          <button onClick={onClose} className="text-[#7C8DB0] hover:text-white transition-colors">
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

        <p className="text-sm text-[#7C8DB0] mb-4">
          Select a backtest result to use as the health monitor baseline. Live performance will be
          compared against these metrics.
        </p>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-[#0A0118] rounded-lg animate-pulse" />
            ))}
          </div>
        ) : backtestResults.length === 0 ? (
          <p className="text-sm text-[#7C8DB0] text-center py-8">
            No backtest results found for this project. Upload a backtest report first.
          </p>
        ) : (
          <div className="space-y-2 mb-4">
            {backtestResults.map((bt) => (
              <button
                key={bt.id}
                onClick={() => setSelectedId(bt.id)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  selectedId === bt.id
                    ? "border-[#4F46E5] bg-[#4F46E5]/10"
                    : "border-[rgba(79,70,229,0.15)] hover:border-[rgba(79,70,229,0.3)] bg-[#0A0118]/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white truncate">{bt.fileName}</span>
                  <span className="text-[10px] text-[#7C8DB0]">
                    {new Date(bt.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex gap-4 mt-1 text-xs text-[#7C8DB0]">
                  <span>{bt.results.totalTrades} trades</span>
                  <span>WR {bt.results.winRate.toFixed(1)}%</span>
                  <span>PF {bt.results.profitFactor.toFixed(2)}</span>
                  <span className={bt.results.netProfit >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}>
                    ${bt.results.netProfit.toFixed(0)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {selectedId && (
          <div className="mb-4">
            <label className="text-xs text-[#7C8DB0] block mb-1">
              Backtest Duration (days, optional)
            </label>
            <input
              type="number"
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
              placeholder="Auto-estimated if empty"
              className="w-full px-3 py-2 text-sm bg-[#0A0118] border border-[rgba(79,70,229,0.2)] rounded-lg text-white placeholder-[#7C8DB0]/50 focus:border-[#4F46E5] focus:outline-none"
            />
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-[#7C8DB0] hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSetBaseline}
            disabled={!selectedId || saving}
            className="px-4 py-2 text-sm font-medium bg-[#4F46E5] text-white rounded-lg hover:bg-[#4338CA] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {saving ? "Setting..." : "Set as Baseline"}
          </button>
        </div>
      </div>
    </div>
  );
}
