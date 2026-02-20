import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "Live EA Leaderboard | AlgoStudio",
  description:
    "See the top-performing Expert Advisors built with AlgoStudio. Real performance data from live trading accounts.",
  alternates: { canonical: "/leaderboard" },
};

const SAMPLE_DATA = [
  {
    rank: 1,
    eaName: "Alpha-EMA-7x",
    strategyType: "EMA Crossover",
    winRate: 62.4,
    profitFactor: 2.1,
    maxDrawdown: 8.3,
    totalTrades: 284,
    runningSince: "Oct 2025",
  },
  {
    rank: 2,
    eaName: "PB-Trend-M15",
    strategyType: "Trend Pullback",
    winRate: 55.8,
    profitFactor: 1.87,
    maxDrawdown: 11.2,
    totalTrades: 412,
    runningSince: "Sep 2025",
  },
  {
    rank: 3,
    eaName: "RSI-Rev-EU",
    strategyType: "RSI Reversal",
    winRate: 58.1,
    profitFactor: 1.74,
    maxDrawdown: 9.7,
    totalTrades: 196,
    runningSince: "Nov 2025",
  },
  {
    rank: 4,
    eaName: "BO-London-4H",
    strategyType: "Range Breakout",
    winRate: 48.9,
    profitFactor: 1.65,
    maxDrawdown: 14.1,
    totalTrades: 167,
    runningSince: "Oct 2025",
  },
  {
    rank: 5,
    eaName: "MACD-Cross-GU",
    strategyType: "MACD Crossover",
    winRate: 53.2,
    profitFactor: 1.52,
    maxDrawdown: 12.8,
    totalTrades: 321,
    runningSince: "Aug 2025",
  },
];

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

export default function LeaderboardPage() {
  return (
    <div className="min-h-screen bg-[#0D0117]">
      <SiteNav />

      <main className="pt-24 pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-[rgba(234,179,8,0.1)] border border-[rgba(234,179,8,0.3)] rounded-full px-4 py-1.5 mb-6">
              <span className="text-xs text-[#EAB308] font-medium">Coming Q2 2026</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Live EA Leaderboard</h1>
            <p className="text-lg text-[#94A3B8] max-w-2xl mx-auto">
              Track the top-performing Expert Advisors built with AlgoStudio. Real performance data
              from live trading accounts with 50+ trades for statistical significance.
            </p>
          </div>

          {/* Preview table with sample data */}
          <div className="relative">
            {/* Blur overlay */}
            <div className="absolute inset-0 z-10 bg-gradient-to-b from-transparent via-transparent to-[#0D0117] pointer-events-none" />

            <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl overflow-hidden opacity-60">
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
                    {SAMPLE_DATA.map((entry) => (
                      <tr key={entry.rank} className="border-t border-[rgba(79,70,229,0.08)]">
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
                          <span
                            className={`text-sm font-medium ${entry.winRate >= 50 ? "text-[#10B981]" : "text-[#EF4444]"}`}
                          >
                            {entry.winRate}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`text-sm font-medium ${entry.profitFactor >= 1.5 ? "text-[#10B981]" : "text-[#EF4444]"}`}
                          >
                            {entry.profitFactor}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right hidden md:table-cell">
                          <span
                            className={`text-sm font-medium ${entry.maxDrawdown < 20 ? "text-[#10B981]" : "text-[#EF4444]"}`}
                          >
                            {entry.maxDrawdown}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right hidden lg:table-cell">
                          <span className="text-sm text-[#CBD5E1]">{entry.totalTrades}</span>
                        </td>
                        <td className="px-4 py-3 text-right hidden lg:table-cell">
                          <span className="text-xs text-[#7C8DB0]">{entry.runningSince}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Waitlist CTA */}
          <div className="mt-12 bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-8 text-center relative z-20">
            <h2 className="text-xl font-bold text-white mb-3">The Leaderboard Is Coming Soon</h2>
            <p className="text-[#94A3B8] text-sm mb-2 max-w-lg mx-auto">
              We are building a live leaderboard that tracks anonymized EA performance from opt-in
              users. Only EAs with 50+ trades will qualify for statistical significance.
            </p>
            <p className="text-[#64748B] text-xs mb-6 max-w-lg mx-auto">
              Expected launch: Q2 2026. The preview above shows sample data to illustrate the
              format.
            </p>
            <Link
              href="/login?mode=register"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#4F46E5] text-white text-sm font-medium rounded-lg hover:bg-[#6366F1] transition-colors"
            >
              Join the Waitlist
            </Link>
            <p className="text-xs text-[#64748B] mt-3">
              Sign up for free and you will be notified when the leaderboard launches.
            </p>
          </div>

          {/* Disclaimer */}
          <div className="mt-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <p className="text-xs text-amber-300/90 leading-relaxed">
              <strong>Disclaimer:</strong> Leaderboard rankings are based on historical performance
              data and are not indicative of future results. Past performance does not guarantee
              future profits. All trading involves risk.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
