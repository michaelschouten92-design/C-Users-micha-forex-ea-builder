"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface HubResult {
  strategyId: string;
  slug: string;
  name: string;
  description: string | null;
  ownerHandle: string | null;
  ladderLevel: string;
  ladderMeta: { label: string; color: string };
  healthScore: number | null;
  maxDrawdownPct: number | null;
  totalTrades: number;
  symbol: string | null;
  timeframe: string | null;
  winRate: number | null;
  profitFactor: number | null;
}

interface HubData {
  type: string;
  results: HubResult[];
  pagination: { page: number; pageSize: number; total: number };
}

const HUB_TABS = [
  { type: "verified", label: "Newest Verified", href: "/verified" },
  { type: "top-robust", label: "Top Robust", href: "/top-robust" },
  { type: "rising", label: "Rising", href: "/rising" },
  { type: "low-drawdown", label: "Low Drawdown", href: "/low-drawdown" },
] as const;

export function HubView({
  type,
  title,
  description,
}: {
  type: string;
  title: string;
  description: string;
}) {
  const [data, setData] = useState<HubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [level, setLevel] = useState("");
  const [minTrades, setMinTrades] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const params = new URLSearchParams({ type, page: String(page) });
      if (level) params.set("level", level);
      if (minTrades) params.set("minTrades", minTrades);
      try {
        const res = await fetch(`/api/hub?${params}`);
        if (res.ok && !cancelled) setData(await res.json());
      } catch {
        /* ignore */
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [type, page, level, minTrades]);

  useEffect(() => {
    fetch("/api/proof/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "leaderboard_view", meta: { hubType: type } }),
    }).catch(() => {});
  }, [type]);

  return (
    <div className="min-h-screen bg-[#0A0118]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">{title}</h1>
        <p className="text-sm text-[#94A3B8] mb-6">{description}</p>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {HUB_TABS.map((tab) => (
            <Link
              key={tab.type}
              href={tab.href}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                tab.type === type
                  ? "bg-[#4F46E5] text-white"
                  : "bg-[#1A0626] text-[#94A3B8] border border-[rgba(79,70,229,0.2)] hover:border-[rgba(79,70,229,0.4)]"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <select
            value={level}
            onChange={(e) => {
              setLevel(e.target.value);
              setPage(1);
            }}
            className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4F46E5]"
          >
            <option value="">All Levels</option>
            <option value="VALIDATED">Validated</option>
            <option value="VERIFIED">Verified</option>
            <option value="PROVEN">Proven</option>
          </select>
          <input
            type="number"
            placeholder="Min trades"
            value={minTrades}
            onChange={(e) => {
              setMinTrades(e.target.value);
              setPage(1);
            }}
            className="w-32 bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-lg px-3 py-2 text-sm text-white placeholder-[#7C8DB0] focus:outline-none focus:border-[#4F46E5]"
          />
        </div>

        {/* Results */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-[#1A0626] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : !data || data.results.length === 0 ? (
          <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-xl p-12 text-center">
            <p className="text-[#7C8DB0]">No strategies found matching your filters.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.results.map((r, idx) => (
              <Link
                key={r.strategyId}
                href={`/proof/${r.strategyId}`}
                className="flex items-center gap-4 bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-xl p-4 hover:border-[rgba(79,70,229,0.4)] transition-colors"
              >
                <span className="text-lg font-bold text-[#7C8DB0] w-8 text-center">
                  {(page - 1) * 20 + idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-white font-semibold truncate">{r.name}</h3>
                    <span
                      className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                      style={{
                        borderColor: `${r.ladderMeta.color}40`,
                        backgroundColor: `${r.ladderMeta.color}15`,
                        color: r.ladderMeta.color,
                      }}
                    >
                      {r.ladderMeta.label}
                    </span>
                  </div>
                  <div className="flex gap-3 text-xs text-[#94A3B8]">
                    {r.ownerHandle && <span>@{r.ownerHandle}</span>}
                    {r.symbol && <span>{r.symbol}</span>}
                    {r.timeframe && <span>{r.timeframe}</span>}
                    <span>{r.totalTrades.toLocaleString()} trades</span>
                  </div>
                </div>
                <div className="flex gap-4 shrink-0 text-right">
                  {r.healthScore !== null && (
                    <div>
                      <p className="text-xl font-bold text-white">{r.healthScore}</p>
                      <p className="text-[10px] text-[#7C8DB0]">Health</p>
                    </div>
                  )}
                  {r.maxDrawdownPct !== null && (
                    <div>
                      <p className="text-sm font-medium text-white">
                        {r.maxDrawdownPct.toFixed(1)}%
                      </p>
                      <p className="text-[10px] text-[#7C8DB0]">Max DD</p>
                    </div>
                  )}
                  {r.profitFactor !== null && (
                    <div className="hidden sm:block">
                      <p className="text-sm font-medium text-white">{r.profitFactor.toFixed(2)}</p>
                      <p className="text-[10px] text-[#7C8DB0]">PF</p>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {data && data.pagination.total > data.pagination.pageSize && (
          <div className="flex justify-center gap-2 mt-6">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-lg text-sm text-[#94A3B8] disabled:opacity-40"
            >
              Prev
            </button>
            <span className="px-4 py-2 text-sm text-white">Page {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={data.results.length < data.pagination.pageSize}
              className="px-4 py-2 bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-lg text-sm text-[#94A3B8] disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}

        {/* Anti-gaming note */}
        <div className="mt-8 text-center">
          <p className="text-[10px] text-[#7C8DB0]">
            Strategies require a minimum of 50 trades and 14 days of history to appear. Rankings are
            based on validated metrics only.
          </p>
        </div>
      </div>
    </div>
  );
}
