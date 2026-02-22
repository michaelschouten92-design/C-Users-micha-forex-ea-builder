"use client";

import { useState } from "react";

export interface ParameterOptimization {
  parameter: string;
  currentValue: string;
  suggestedValue: string;
  expectedImpact: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  reasoning: string;
}

interface OptimizationResultsProps {
  backtestId: string;
  existingOptimizations: ParameterOptimization[] | null;
  hasAiAnalysis: boolean;
  tier: string;
}

function getConfidenceColor(confidence: string): string {
  switch (confidence) {
    case "HIGH":
      return "#22C55E";
    case "MEDIUM":
      return "#F59E0B";
    case "LOW":
      return "#7C8DB0";
    default:
      return "#7C8DB0";
  }
}

export function OptimizationResults({
  backtestId,
  existingOptimizations,
  hasAiAnalysis,
  tier,
}: OptimizationResultsProps) {
  const [optimizations, setOptimizations] = useState<ParameterOptimization[] | null>(
    existingOptimizations
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const isElite = tier === "ELITE";

  async function handleOptimize() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/backtest/${backtestId}/optimize`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Optimization failed");
        return;
      }
      const data = await res.json();
      setOptimizations(Array.isArray(data) ? data : []);
    } catch {
      setError("Failed to run optimization");
    } finally {
      setLoading(false);
    }
  }

  // Upsell for non-Elite users
  if (!isElite && !optimizations) {
    return (
      <div className="bg-gradient-to-r from-[rgba(167,139,250,0.1)] to-[rgba(79,70,229,0.1)] border border-[rgba(167,139,250,0.25)] rounded-xl p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#A78BFA]/10 flex items-center justify-center flex-shrink-0">
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
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">AI Strategy Optimizer</h3>
            <p className="text-xs text-[#7C8DB0]">
              Get AI-powered parameter optimization suggestions.{" "}
              <span className="text-[#A78BFA]">Elite plan required.</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Run button (no existing optimizations)
  if (!optimizations) {
    return (
      <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-white mb-1">AI Strategy Optimizer</h3>
            <p className="text-xs text-[#7C8DB0]">
              {hasAiAnalysis
                ? "Get concrete parameter optimization suggestions based on your strategy analysis."
                : "Run an AI analysis first, then optimize parameters."}
            </p>
          </div>
          <button
            onClick={handleOptimize}
            disabled={loading || !hasAiAnalysis}
            className="px-5 py-2.5 bg-[#A78BFA] hover:bg-[#8B5CF6] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Optimizing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                Optimize Strategy
              </>
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

  // Results table
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
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          <h3 className="text-sm font-semibold text-white">AI Optimization Suggestions</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#A78BFA]/20 text-[#A78BFA] ml-auto">
            {optimizations.length} suggestions
          </span>
        </div>
      </div>

      <div className="px-6 py-5">
        {optimizations.length === 0 ? (
          <p className="text-xs text-[#7C8DB0]">No optimization suggestions generated.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-[#7C8DB0] border-b border-[rgba(79,70,229,0.1)]">
                  <th className="text-left py-2 pr-3">Parameter</th>
                  <th className="text-left py-2 pr-3">Current</th>
                  <th className="text-left py-2 pr-3">Suggested</th>
                  <th className="text-left py-2 pr-3">Expected Impact</th>
                  <th className="text-center py-2">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {optimizations.map((opt, i) => (
                  <>
                    <tr
                      key={i}
                      className="border-b border-[rgba(79,70,229,0.05)] cursor-pointer hover:bg-[rgba(79,70,229,0.03)]"
                      onClick={() => setExpandedRow(expandedRow === i ? null : i)}
                    >
                      <td className="py-2.5 pr-3 text-[#CBD5E1] font-medium">{opt.parameter}</td>
                      <td className="py-2.5 pr-3 text-[#7C8DB0] font-mono">{opt.currentValue}</td>
                      <td className="py-2.5 pr-3 text-[#22D3EE] font-mono font-medium">
                        {opt.suggestedValue}
                      </td>
                      <td className="py-2.5 pr-3 text-[#CBD5E1]">{opt.expectedImpact}</td>
                      <td className="py-2.5 text-center">
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{
                            color: getConfidenceColor(opt.confidence),
                            background: `${getConfidenceColor(opt.confidence)}15`,
                          }}
                        >
                          {opt.confidence}
                        </span>
                      </td>
                    </tr>
                    {expandedRow === i && (
                      <tr key={`${i}-detail`}>
                        <td colSpan={5} className="py-3 px-4 bg-[rgba(0,0,0,0.15)]">
                          <p className="text-xs text-[#94A3B8] leading-relaxed">{opt.reasoning}</p>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
