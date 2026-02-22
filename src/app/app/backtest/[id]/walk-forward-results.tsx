"use client";

import { useState } from "react";
import type { WalkForwardResult } from "@/lib/backtest-parser/walk-forward";

function getVerdictColor(verdict: string): string {
  switch (verdict) {
    case "ROBUST":
      return "#22C55E";
    case "MODERATE":
      return "#F59E0B";
    case "OVERFITTED":
      return "#EF4444";
    default:
      return "#7C8DB0";
  }
}

interface WalkForwardResultsProps {
  backtestId: string;
  existingResult: WalkForwardResult | null;
  tier: string;
}

export function WalkForwardResults({ backtestId, existingResult, tier }: WalkForwardResultsProps) {
  const [result, setResult] = useState<WalkForwardResult | null>(existingResult);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canRun = tier === "PRO" || tier === "ELITE";

  async function handleRun() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/backtest/${backtestId}/walk-forward`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numWindows: 5, oosRatio: 0.2 }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Analysis failed");
        return;
      }
      const data = await res.json();
      setResult(data);
    } catch {
      setError("Failed to run analysis");
    } finally {
      setLoading(false);
    }
  }

  if (!canRun && !result) {
    return (
      <div className="bg-gradient-to-r from-[rgba(245,158,11,0.1)] to-[rgba(79,70,229,0.1)] border border-[rgba(245,158,11,0.25)] rounded-xl p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#F59E0B]/10 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-5 h-5 text-[#F59E0B]"
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
            <h3 className="text-sm font-semibold text-white">Walk-Forward Analysis</h3>
            <p className="text-xs text-[#7C8DB0]">
              Detect overfitting with out-of-sample validation.{" "}
              <span className="text-[#F59E0B]">Pro or Elite plan required.</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-white mb-1">Walk-Forward Analysis</h3>
            <p className="text-xs text-[#7C8DB0]">
              Test your strategy with out-of-sample validation to detect overfitting.
            </p>
          </div>
          <button
            onClick={handleRun}
            disabled={loading}
            className="px-5 py-2.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Analyzing...
              </>
            ) : (
              "Run Walk-Forward Analysis"
            )}
          </button>
        </div>
        {error && (
          <div className="mt-3 px-3 py-2 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/20">
            <p className="text-xs text-[#EF4444]">{error}</p>
          </div>
        )}
      </div>
    );
  }

  const verdictColor = getVerdictColor(result.verdict);

  return (
    <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-[rgba(79,70,229,0.1)]">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Walk-Forward Analysis</h3>
          <span
            className="text-xs font-bold px-3 py-1 rounded-full"
            style={{ color: verdictColor, background: `${verdictColor}20` }}
          >
            {result.verdict}
          </span>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="px-6 py-5">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <p className="text-3xl font-bold" style={{ color: verdictColor }}>
              {result.consistencyScore}
            </p>
            <p className="text-xs text-[#7C8DB0] mt-1">Consistency Score</p>
          </div>
          <div className="text-center">
            <p
              className="text-3xl font-bold"
              style={{
                color:
                  result.overfitProbability > 0.5
                    ? "#EF4444"
                    : result.overfitProbability > 0.3
                      ? "#F59E0B"
                      : "#22C55E",
              }}
            >
              {(result.overfitProbability * 100).toFixed(0)}%
            </p>
            <p className="text-xs text-[#7C8DB0] mt-1">Overfit Probability</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-[#CBD5E1]">{result.numWindows}</p>
            <p className="text-xs text-[#7C8DB0] mt-1">Windows</p>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="mb-6">
          <p className="text-xs text-[#7C8DB0] mb-3 uppercase tracking-wider">
            Profit Factor: In-Sample vs Out-of-Sample
          </p>
          <div className="space-y-2">
            {result.windows.map((w) => {
              const maxPF = Math.max(
                ...result.windows.flatMap((w) => [
                  w.inSample.profitFactor,
                  w.outOfSample.profitFactor,
                ]),
                1
              );
              return (
                <div key={w.windowIndex} className="flex items-center gap-2">
                  <span className="text-[10px] text-[#7C8DB0] w-8">W{w.windowIndex + 1}</span>
                  <div className="flex-1 flex gap-1">
                    <div className="flex-1 h-4 bg-[rgba(79,70,229,0.1)] rounded overflow-hidden">
                      <div
                        className="h-full bg-[#4F46E5] rounded"
                        style={{ width: `${(w.inSample.profitFactor / maxPF) * 100}%` }}
                      />
                    </div>
                    <div className="flex-1 h-4 bg-[rgba(34,211,238,0.1)] rounded overflow-hidden">
                      <div
                        className="h-full bg-[#22D3EE] rounded"
                        style={{ width: `${(w.outOfSample.profitFactor / maxPF) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-[10px] text-[#7C8DB0] w-24 text-right">
                    {w.inSample.profitFactor.toFixed(2)} / {w.outOfSample.profitFactor.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-[#4F46E5]" />
              <span className="text-[10px] text-[#7C8DB0]">In-Sample</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-[#22D3EE]" />
              <span className="text-[10px] text-[#7C8DB0]">Out-of-Sample</span>
            </div>
          </div>
        </div>

        {/* Window Details Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-[#7C8DB0] border-b border-[rgba(79,70,229,0.1)]">
                <th className="text-left py-2 pr-2">Window</th>
                <th className="text-right py-2 pr-2">IS PF</th>
                <th className="text-right py-2 pr-2">OOS PF</th>
                <th className="text-right py-2 pr-2">IS WR</th>
                <th className="text-right py-2 pr-2">OOS WR</th>
                <th className="text-right py-2 pr-2">Trades</th>
                <th className="text-right py-2">Degradation</th>
              </tr>
            </thead>
            <tbody>
              {result.windows.map((w) => (
                <tr key={w.windowIndex} className="border-b border-[rgba(79,70,229,0.05)]">
                  <td className="py-2 pr-2 text-[#CBD5E1]">Window {w.windowIndex + 1}</td>
                  <td className="py-2 pr-2 text-right text-[#CBD5E1]">
                    {w.inSample.profitFactor.toFixed(2)}
                  </td>
                  <td className="py-2 pr-2 text-right text-[#CBD5E1]">
                    {w.outOfSample.profitFactor.toFixed(2)}
                  </td>
                  <td className="py-2 pr-2 text-right text-[#CBD5E1]">
                    {w.inSample.winRate.toFixed(1)}%
                  </td>
                  <td className="py-2 pr-2 text-right text-[#CBD5E1]">
                    {w.outOfSample.winRate.toFixed(1)}%
                  </td>
                  <td className="py-2 pr-2 text-right text-[#CBD5E1]">
                    {w.outOfSample.totalTrades}
                  </td>
                  <td
                    className={`py-2 text-right font-medium ${w.degradation.profitFactor > 30 ? "text-[#EF4444]" : w.degradation.profitFactor > 15 ? "text-[#F59E0B]" : "text-[#22C55E]"}`}
                  >
                    {w.degradation.profitFactor > 0 ? "+" : ""}
                    {w.degradation.profitFactor.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
