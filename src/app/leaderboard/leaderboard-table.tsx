"use client";

import { useState, useEffect } from "react";

interface LeaderboardEntry {
  rank: number;
  eaName: string;
  strategyType: string;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  runningSince: string;
  totalTrades: number;
}

const TIMEFRAMES = [
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
  { value: "all", label: "All Time" },
] as const;

const STRATEGY_TYPES = [
  { value: "", label: "All Strategies" },
  { value: "ema", label: "EMA Crossover" },
  { value: "rsi", label: "RSI" },
  { value: "breakout", label: "Breakout" },
  { value: "macd", label: "MACD" },
  { value: "scalp", label: "Scalping" },
  { value: "trend", label: "Trend Following" },
] as const;

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[rgba(245,158,11,0.2)] text-[#F59E0B] font-bold text-sm">
        1
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[rgba(148,163,184,0.2)] text-[#94A3B8] font-bold text-sm">
        2
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[rgba(180,83,9,0.2)] text-[#D97706] font-bold text-sm">
        3
      </span>
    );
  }
  return <span className="text-sm text-[#7C8DB0] font-medium pl-2">{rank}</span>;
}

function MetricCell({ value, suffix, good }: { value: number; suffix?: string; good?: boolean }) {
  const colorClass =
    good === undefined ? "text-[#CBD5E1]" : good ? "text-[#10B981]" : "text-[#EF4444]";

  return (
    <span className={`text-sm font-medium ${colorClass}`}>
      {value}
      {suffix}
    </span>
  );
}

export function LeaderboardTable() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState("30d");
  const [strategy, setStrategy] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ timeframe });
    if (strategy) params.set("strategy", strategy);

    fetch(`/api/leaderboard?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) {
          setEntries(json.data ?? []);
          setUpdatedAt(json.updatedAt ?? null);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEntries([]);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [timeframe, strategy]);

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex rounded-lg overflow-hidden border border-[rgba(79,70,229,0.3)]">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.value}
              onClick={() => setTimeframe(tf.value)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                timeframe === tf.value
                  ? "bg-[#4F46E5] text-white"
                  : "bg-[#1A0626] text-[#94A3B8] hover:text-white hover:bg-[rgba(79,70,229,0.15)]"
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        <select
          value={strategy}
          onChange={(e) => setStrategy(e.target.value)}
          className="px-4 py-2 bg-[#1A0626] border border-[rgba(79,70,229,0.3)] rounded-lg text-sm text-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
        >
          {STRATEGY_TYPES.map((st) => (
            <option key={st.value} value={st.value}>
              {st.label}
            </option>
          ))}
        </select>

        {updatedAt && (
          <span className="text-xs text-[#7C8DB0] ml-auto">
            Updated {new Date(updatedAt).toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[rgba(79,70,229,0.15)]">
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#A78BFA] uppercase tracking-wider">
                  Rank
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#A78BFA] uppercase tracking-wider">
                  EA Name
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#A78BFA] uppercase tracking-wider hidden sm:table-cell">
                  Strategy
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-[#A78BFA] uppercase tracking-wider">
                  Win Rate
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-[#A78BFA] uppercase tracking-wider">
                  Profit Factor
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-[#A78BFA] uppercase tracking-wider hidden md:table-cell">
                  Max DD
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-[#A78BFA] uppercase tracking-wider hidden lg:table-cell">
                  Trades
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-[#A78BFA] uppercase tracking-wider hidden lg:table-cell">
                  Running Since
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <div className="flex items-center justify-center gap-2 text-[#94A3B8]">
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
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
                      Loading leaderboard...
                    </div>
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <p className="text-[#7C8DB0] text-sm">
                      No EAs meet the minimum 50-trade threshold for this timeframe.
                    </p>
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr
                    key={`${entry.rank}-${entry.eaName}`}
                    className="border-t border-[rgba(79,70,229,0.08)] hover:bg-[rgba(79,70,229,0.05)] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <RankBadge rank={entry.rank} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-white">{entry.eaName}</span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs bg-[rgba(79,70,229,0.15)] text-[#A78BFA] px-2 py-1 rounded">
                        {entry.strategyType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <MetricCell value={entry.winRate} suffix="%" good={entry.winRate >= 50} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <MetricCell value={entry.profitFactor} good={entry.profitFactor >= 1.5} />
                    </td>
                    <td className="px-4 py-3 text-right hidden md:table-cell">
                      <MetricCell
                        value={entry.maxDrawdown}
                        suffix="%"
                        good={entry.maxDrawdown < 20}
                      />
                    </td>
                    <td className="px-4 py-3 text-right hidden lg:table-cell">
                      <span className="text-sm text-[#CBD5E1]">{entry.totalTrades}</span>
                    </td>
                    <td className="px-4 py-3 text-right hidden lg:table-cell">
                      <span className="text-xs text-[#7C8DB0]">
                        {new Date(entry.runningSince).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
