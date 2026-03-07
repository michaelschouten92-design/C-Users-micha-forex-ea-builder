"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface StrategyItem {
  strategyId: string;
  name: string;
  slug: string;
  lifecycle: string;
  ladderLevel: string;
  profitFactor: number;
  maxDrawdownPct: number;
  tradeCount: number;
  monteCarloSurvivalPct: number;
  winRate: number;
  updatedAt: string;
}

type SortKey = "profitFactor" | "maxDrawdownPct" | "tradeCount" | "updatedAt";

const SORT_OPTIONS: Array<{ key: SortKey; label: string; dir: "asc" | "desc" }> = [
  { key: "profitFactor", label: "Profit Factor", dir: "desc" },
  { key: "maxDrawdownPct", label: "Lowest Drawdown", dir: "asc" },
  { key: "tradeCount", label: "Most Trades", dir: "desc" },
  { key: "updatedAt", label: "Newest", dir: "desc" },
];

const LADDER_COLORS: Record<string, string> = {
  SUBMITTED: "#71717A",
  VALIDATED: "#F59E0B",
  VERIFIED: "#10B981",
  PROVEN: "#6366F1",
  INSTITUTIONAL: "#818CF8",
};

const LIFECYCLE_BADGE: Record<string, { color: string; label: string }> = {
  RUN: { color: "#10B981", label: "Running" },
  PAUSE: { color: "#F59E0B", label: "Paused" },
};

function sortItems(items: StrategyItem[], key: SortKey, dir: "asc" | "desc"): StrategyItem[] {
  return [...items].sort((a, b) => {
    const av = key === "updatedAt" ? new Date(a[key]).getTime() : a[key];
    const bv = key === "updatedAt" ? new Date(b[key]).getTime() : b[key];
    return dir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });
}

export function StrategiesView() {
  const [items, setItems] = useState<StrategyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortIdx, setSortIdx] = useState(0);

  useEffect(() => {
    fetch("/api/strategies/public")
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const { key, dir } = SORT_OPTIONS[sortIdx];
  const sorted = sortItems(items, key, dir);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-5xl px-6">
          <div className="h-10 bg-[#111114] rounded-xl w-64" />
          <div className="h-64 bg-[#111114] rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090B]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#FAFAFA] mb-2">Verified Strategies</h1>
        <p className="text-sm text-[#71717A] mb-6">
          Curated algorithmic trading strategies with independently verified performance.
        </p>

        {/* Sort controls */}
        <div className="flex flex-wrap gap-2 mb-6">
          {SORT_OPTIONS.map((opt, i) => (
            <button
              key={opt.key}
              onClick={() => setSortIdx(i)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                i === sortIdx
                  ? "bg-[#6366F1] text-white"
                  : "bg-[#111114] text-[#71717A] hover:text-[#FAFAFA] border border-[rgba(255,255,255,0.06)]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {sorted.length === 0 ? (
          <div className="bg-[#111114] border border-[rgba(255,255,255,0.06)] rounded-xl px-5 py-12 text-center">
            <p className="text-[#71717A]">No verified strategies match the criteria yet.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[#71717A] border-b border-[rgba(255,255,255,0.06)]">
                    <th className="text-left py-3 px-3 font-medium">Name</th>
                    <th className="text-left py-3 px-3 font-medium">Ladder</th>
                    <th className="text-right py-3 px-3 font-medium">Profit Factor</th>
                    <th className="text-right py-3 px-3 font-medium">Max DD</th>
                    <th className="text-right py-3 px-3 font-medium">Trades</th>
                    <th className="text-right py-3 px-3 font-medium">Monte Carlo</th>
                    <th className="text-center py-3 px-3 font-medium">Lifecycle</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((s) => {
                    const href = s.slug ? `/p/${s.slug}` : `/proof/${s.strategyId}`;
                    const ladderColor = LADDER_COLORS[s.ladderLevel] ?? "#71717A";
                    const lc = LIFECYCLE_BADGE[s.lifecycle] ?? LIFECYCLE_BADGE.RUN;
                    return (
                      <tr
                        key={s.strategyId}
                        className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[#111114]/60 transition-colors"
                      >
                        <td className="py-3 px-3">
                          <Link
                            href={href}
                            className="text-[#FAFAFA] hover:text-[#818CF8] transition-colors font-medium"
                          >
                            {s.name}
                          </Link>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold"
                            style={{
                              backgroundColor: `${ladderColor}15`,
                              color: ladderColor,
                              border: `1px solid ${ladderColor}40`,
                            }}
                          >
                            {s.ladderLevel}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right text-[#FAFAFA] font-mono">
                          {s.profitFactor.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right text-[#FAFAFA] font-mono">
                          {s.maxDrawdownPct.toFixed(1)}%
                        </td>
                        <td className="py-3 px-3 text-right text-[#FAFAFA] font-mono">
                          {s.tradeCount.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right text-[#FAFAFA] font-mono">
                          {s.monteCarloSurvivalPct}%
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                            style={{ backgroundColor: `${lc.color}15`, color: lc.color }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: lc.color }}
                            />
                            {lc.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden space-y-3">
              {sorted.map((s) => {
                const href = s.slug ? `/p/${s.slug}` : `/proof/${s.strategyId}`;
                const ladderColor = LADDER_COLORS[s.ladderLevel] ?? "#71717A";
                const lc = LIFECYCLE_BADGE[s.lifecycle] ?? LIFECYCLE_BADGE.RUN;
                return (
                  <Link
                    key={s.strategyId}
                    href={href}
                    className="block bg-[#111114] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 hover:border-[rgba(255,255,255,0.10)] transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-[#FAFAFA] truncate mr-2">
                        {s.name}
                      </h3>
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0"
                        style={{ backgroundColor: `${lc.color}15`, color: lc.color }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: lc.color }}
                        />
                        {lc.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <span
                        className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{
                          backgroundColor: `${ladderColor}15`,
                          color: ladderColor,
                          border: `1px solid ${ladderColor}40`,
                        }}
                      >
                        {s.ladderLevel}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-[#71717A]">Profit Factor</p>
                        <p className="text-[#FAFAFA] font-mono">{s.profitFactor.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-[#71717A]">Max Drawdown</p>
                        <p className="text-[#FAFAFA] font-mono">{s.maxDrawdownPct.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-[#71717A]">Trades</p>
                        <p className="text-[#FAFAFA] font-mono">{s.tradeCount.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[#71717A]">Monte Carlo</p>
                        <p className="text-[#FAFAFA] font-mono">{s.monteCarloSurvivalPct}%</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
