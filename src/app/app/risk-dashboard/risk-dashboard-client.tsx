"use client";

import { useState, useEffect } from "react";
import { DailyPnlCalendar } from "./daily-pnl-calendar";

interface CorrelationData {
  matrix: number[][];
  labels: string[];
}

interface DailyPnlEntry {
  date: string;
  pnl: number;
}

interface EAInstance {
  id: string;
  eaName: string;
  balance: number | null;
  equity: number | null;
  totalProfit: number;
  openTrades: number;
  status: string;
  heartbeats: { equity: number; createdAt: string }[];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function calculateMaxDrawdown(heartbeats: { equity: number; createdAt: string }[]): number {
  if (heartbeats.length === 0) return 0;
  const sorted = [...heartbeats].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  let peak = sorted[0].equity;
  let maxDD = 0;
  for (const hb of sorted) {
    if (hb.equity > peak) peak = hb.equity;
    if (peak > 0) {
      const dd = ((peak - hb.equity) / peak) * 100;
      if (dd > maxDD) maxDD = dd;
    }
  }
  return maxDD;
}

export function RiskDashboardClient() {
  const [instances, setInstances] = useState<EAInstance[]>([]);
  const [correlation, setCorrelation] = useState<CorrelationData | null>(null);
  const [dailyPnl, setDailyPnl] = useState<DailyPnlEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        const [statusRes, corrRes, pnlRes] = await Promise.all([
          fetch("/api/live/status"),
          fetch("/api/live/correlation"),
          fetch("/api/live/daily-pnl"),
        ]);

        if (!cancelled) {
          if (statusRes.ok) {
            const json = await statusRes.json();
            setInstances(json.data ?? []);
          }
          if (corrRes.ok) {
            setCorrelation(await corrRes.json());
          }
          if (pnlRes.ok) {
            const json = await pnlRes.json();
            setDailyPnl(json.dailyPnl ?? []);
          }
        }
      } catch {
        /* silent */
      }
      if (!cancelled) setLoading(false);
    }
    fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#4F46E5] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalEquity = instances.reduce((s, ea) => s + (ea.equity ?? 0), 0);
  const totalProfit = instances.reduce((s, ea) => s + ea.totalProfit, 0);
  const totalDrawdown = (() => {
    const allHb = instances.flatMap((ea) => ea.heartbeats ?? []);
    return calculateMaxDrawdown(allHb);
  })();

  return (
    <div className="space-y-6">
      {/* Portfolio Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-1">Total Equity</p>
          <p className="text-lg font-semibold text-white">{formatCurrency(totalEquity)}</p>
        </div>
        <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-1">Total P&L</p>
          <p
            className={`text-lg font-semibold ${totalProfit >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}
          >
            {formatCurrency(totalProfit)}
          </p>
        </div>
        <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-1">Max Drawdown</p>
          <p className="text-lg font-semibold text-[#EF4444]">{totalDrawdown.toFixed(1)}%</p>
        </div>
        <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-1">Active EAs</p>
          <p className="text-lg font-semibold text-white">
            {instances.filter((ea) => ea.status === "ONLINE").length}
          </p>
        </div>
      </div>

      {/* Per-EA Risk Contribution */}
      {instances.length > 0 && (
        <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6">
          <h3 className="text-sm font-medium text-white mb-4">Per-EA Risk Contribution</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-[#7C8DB0] border-b border-[rgba(79,70,229,0.1)]">
                  <th className="text-left py-2 pr-3">EA Name</th>
                  <th className="text-right py-2 pr-3">Equity</th>
                  <th className="text-right py-2 pr-3">P&L</th>
                  <th className="text-right py-2 pr-3">Max DD</th>
                  <th className="text-right py-2 pr-3">% of Portfolio</th>
                  <th className="text-right py-2">Open Trades</th>
                </tr>
              </thead>
              <tbody>
                {instances.map((ea) => {
                  const dd = calculateMaxDrawdown(ea.heartbeats ?? []);
                  const pctOfPortfolio =
                    totalEquity > 0 ? ((ea.equity ?? 0) / totalEquity) * 100 : 0;
                  return (
                    <tr key={ea.id} className="border-b border-[rgba(79,70,229,0.05)]">
                      <td className="py-2 pr-3 text-[#CBD5E1]">{ea.eaName}</td>
                      <td className="py-2 pr-3 text-right text-[#CBD5E1]">
                        {formatCurrency(ea.equity ?? 0)}
                      </td>
                      <td
                        className={`py-2 pr-3 text-right font-medium ${ea.totalProfit >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}
                      >
                        {formatCurrency(ea.totalProfit)}
                      </td>
                      <td className="py-2 pr-3 text-right text-[#CBD5E1]">{dd.toFixed(1)}%</td>
                      <td className="py-2 pr-3 text-right text-[#CBD5E1]">
                        {pctOfPortfolio.toFixed(1)}%
                      </td>
                      <td className="py-2 text-right text-[#CBD5E1]">{ea.openTrades}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Correlation Matrix */}
      {correlation && correlation.labels.length >= 2 && (
        <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6">
          <h3 className="text-sm font-medium text-white mb-4">Correlation Matrix</h3>
          <div className="overflow-x-auto">
            <table className="text-xs">
              <thead>
                <tr>
                  <th className="p-2" />
                  {correlation.labels.map((label, i) => (
                    <th
                      key={i}
                      className="p-2 text-[10px] text-[#7C8DB0] font-medium max-w-[80px] truncate"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {correlation.matrix.map((row, i) => (
                  <tr key={i}>
                    <td className="p-2 text-[10px] text-[#7C8DB0] font-medium max-w-[80px] truncate">
                      {correlation.labels[i]}
                    </td>
                    {row.map((val, j) => {
                      const absVal = Math.abs(val);
                      const color =
                        i === j
                          ? "rgba(79,70,229,0.3)"
                          : val > 0
                            ? `rgba(239,68,68,${absVal * 0.6})`
                            : `rgba(34,197,94,${absVal * 0.6})`;
                      return (
                        <td
                          key={j}
                          className="p-2 text-center text-[#CBD5E1] font-mono"
                          style={{ background: color }}
                        >
                          {val.toFixed(2)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-[#7C8DB0] mt-3">
            High positive correlation (red) = EAs move together. Negative correlation (green) = EAs
            diversify each other.
          </p>
        </div>
      )}

      {/* Daily P&L Calendar */}
      <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6">
        <h3 className="text-sm font-medium text-white mb-4">Daily P&L (Last 90 Days)</h3>
        {dailyPnl.length > 0 ? (
          <DailyPnlCalendar data={dailyPnl} />
        ) : (
          <p className="text-xs text-[#7C8DB0]">No trade data available for the last 90 days.</p>
        )}
      </div>
    </div>
  );
}
