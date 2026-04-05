"use client";

import { useState } from "react";
import { EquityChart } from "./equity-chart";
import { StatisticsTable } from "./statistics-table";
import { TradesTable } from "./trades-table";
import { InstrumentsTable } from "./instruments-table";

interface ClosedTrade {
  closeTime: string;
  openTime: string;
  symbol: string;
  type: string;
  lots: number;
  openPrice: number;
  closePrice: number | null;
  profit: number;
}

interface TrackRecordClientProps {
  closedTrades: ClosedTrade[];
  durationDays: number | null;
  equityCurve: Array<{ equity: number; balance: number; createdAt: string }>;
  monthlyReturns: Array<{ month: string; returnPct: number }>;
}

type TabId = "statistics" | "history" | "instruments";

export function TrackRecordClient({
  closedTrades,
  durationDays,
  equityCurve,
  monthlyReturns,
}: TrackRecordClientProps) {
  const [activeTab, setActiveTab] = useState<TabId>("statistics");

  const tabs: Array<{ id: TabId; label: string; count?: number }> = [
    { id: "statistics", label: "Statistics" },
    { id: "history", label: "History", count: closedTrades.length },
    { id: "instruments", label: "Instruments" },
  ];

  // Monthly returns grid data
  const monthlyByYear = (() => {
    const map = new Map<number, Map<number, number>>();
    for (const mr of monthlyReturns) {
      const [y, m] = mr.month.split("-").map(Number);
      if (!map.has(y)) map.set(y, new Map());
      map.get(y)!.set(m, mr.returnPct);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a - b)
      .map(([year, months]) => {
        const ytd = [...months.values()].reduce((s, v) => s + v, 0);
        return { year, months, ytd };
      });
  })();

  const MONTH_LABELS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  return (
    <div className="space-y-4">
      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 border-b border-[#1E293B]/50">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? "border-[#10B981] text-[#10B981]"
                : "border-transparent text-[#64748B] hover:text-[#94A3B8]"
            }`}
          >
            {tab.label}
            {tab.count != null && (
              <span className="ml-1.5 text-[10px] text-[#475569]">({tab.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className="rounded-lg bg-[#131722] border border-[#1E293B]/50 overflow-hidden">
        {activeTab === "statistics" && (
          <StatisticsTable trades={closedTrades} durationDays={durationDays} />
        )}
        {activeTab === "history" && <TradesTable trades={closedTrades} />}
        {activeTab === "instruments" && <InstrumentsTable trades={closedTrades} />}
      </div>

      {/* ── Monthly Returns ── */}
      {monthlyByYear.length > 0 && (
        <div className="rounded-lg bg-[#131722] border border-[#1E293B]/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#1E293B]/60">
                  <th className="px-3 py-2.5 text-left text-[10px] uppercase tracking-wider text-[#64748B] font-medium sticky left-0 bg-[#131722]">
                    Year
                  </th>
                  {MONTH_LABELS.map((m) => (
                    <th
                      key={m}
                      className="px-2 py-2.5 text-center text-[10px] uppercase tracking-wider text-[#64748B] font-medium min-w-[52px]"
                    >
                      {m}
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-center text-[10px] uppercase tracking-wider text-[#F59E0B] font-bold">
                    YTD
                  </th>
                </tr>
              </thead>
              <tbody>
                {monthlyByYear.map(({ year, months, ytd }) => (
                  <tr key={year} className="border-b border-[#1E293B]/30">
                    <td className="px-3 py-2 text-white font-semibold sticky left-0 bg-[#131722]">
                      {year}
                    </td>
                    {Array.from({ length: 12 }, (_, i) => {
                      const val = months.get(i + 1);
                      return (
                        <td key={i} className="px-2 py-2 text-center tabular-nums">
                          {val != null ? (
                            <span
                              className={`font-medium ${val > 0 ? "text-[#10B981]" : val < 0 ? "text-[#EF4444]" : "text-[#64748B]"}`}
                            >
                              {val > 0 ? "+" : ""}
                              {val.toFixed(2)}%
                            </span>
                          ) : (
                            <span className="text-[#334155]">-</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-center tabular-nums">
                      <span
                        className={`font-bold ${ytd > 0 ? "text-[#10B981]" : ytd < 0 ? "text-[#EF4444]" : "text-[#64748B]"}`}
                      >
                        {ytd > 0 ? "+" : ""}
                        {ytd.toFixed(2)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Chart ── */}
      {equityCurve.length >= 2 && (
        <div className="rounded-lg bg-[#131722] border border-[#1E293B]/50 p-4">
          <EquityChart data={equityCurve} />
        </div>
      )}
    </div>
  );
}
