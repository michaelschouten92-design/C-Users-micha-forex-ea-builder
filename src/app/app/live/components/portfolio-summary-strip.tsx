"use client";

import { isAccountContainer } from "@/lib/live/live-instance-dto";
import type { EAInstanceData } from "./types";
import { formatCurrency, calculateWinRate, calculateProfitFactor } from "./utils";
import { Sparkline } from "./sparkline";
import { WinRateDonut } from "./win-rate-donut";
import { AvgWinLossBar } from "./avg-win-loss-bar";

// ── Helpers ─────────────────────────────────────────────

function resolveMetricsSource(instances: EAInstanceData[]): EAInstanceData[] {
  const containers = instances.filter(isAccountContainer);
  return containers.length > 0 ? containers : instances.filter((ea) => ea.mode === "LIVE");
}

function aggregateHeartbeatEquity(source: EAInstanceData[]): number[] {
  return source
    .flatMap((ea) => ea.heartbeats ?? [])
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((h) => h.equity);
}

function buildCumulativePnlSpark(dailyPnl: { date: string; pnl: number }[]): number[] {
  const result: number[] = [];
  let cum = 0;
  for (const d of dailyPnl) {
    cum += d.pnl;
    result.push(cum);
  }
  return result;
}

// ── Card wrapper ────────────────────────────────────────

function MetricCard({
  label,
  accentColor,
  children,
}: {
  label: string;
  accentColor: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="bg-[#0F0A1A] border border-[#1E293B]/60 rounded-lg p-4 relative overflow-hidden"
      style={{ boxShadow: `0 1px 16px ${accentColor}06` }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ backgroundColor: accentColor, opacity: 0.3 }}
      />
      <p className="text-[9px] uppercase tracking-[0.15em] text-[#475569] font-medium mb-2">
        {label}
      </p>
      {children}
    </div>
  );
}

// ── Main component ──────────────────────────────────────

export function PortfolioSummaryStrip({
  instances,
  dailyPnl,
}: {
  instances: EAInstanceData[];
  dailyPnl: { date: string; pnl: number }[];
}) {
  const metricsSource = resolveMetricsSource(instances);
  const equitySpark = aggregateHeartbeatEquity(metricsSource);
  const cumPnlSpark = buildCumulativePnlSpark(dailyPnl);

  // ── Aggregated values ───────────────────────────────

  const totalBalance = metricsSource.reduce((sum, ea) => sum + (ea.balance ?? 0), 0);

  const floatingPnl = metricsSource
    .filter((ea) => ea.equity != null && ea.balance != null)
    .reduce((sum, ea) => sum + (ea.equity! - ea.balance!), 0);

  const totalProfit = metricsSource.reduce((sum, ea) => sum + ea.totalProfit, 0);

  const openTrades = metricsSource.reduce((sum, ea) => sum + ea.openTrades, 0);

  // Win rate & profit factor from all closed trades across all instances
  const allTrades = metricsSource.flatMap((ea) => ea.trades ?? []);
  const closedTrades = allTrades.filter((t) => t.closeTime !== null);
  const winRate = calculateWinRate(allTrades);
  const wins = closedTrades.filter((t) => t.profit > 0).length;
  const losses = closedTrades.filter((t) => t.profit <= 0).length;

  const profitFactor = calculateProfitFactor(allTrades);
  const pfDisplay =
    profitFactor === Infinity ? "\u221E" : profitFactor === 0 ? "0.00" : profitFactor.toFixed(2);

  // Average win / average loss for the bar
  const winningTrades = closedTrades.filter((t) => t.profit > 0);
  const losingTrades = closedTrades.filter((t) => t.profit < 0);
  const avgWin =
    winningTrades.length > 0
      ? winningTrades.reduce((s, t) => s + t.profit, 0) / winningTrades.length
      : 0;
  const avgLoss =
    losingTrades.length > 0
      ? losingTrades.reduce((s, t) => s + t.profit, 0) / losingTrades.length
      : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* 1. Total Balance */}
      <MetricCard label="Total Balance" accentColor="#10B981">
        <div className="flex items-end justify-between gap-2">
          <p className="text-2xl font-bold tabular-nums text-[#10B981] leading-none">
            {formatCurrency(totalBalance)}
          </p>
          {equitySpark.length >= 2 && <Sparkline data={equitySpark} color="#10B981" />}
        </div>
      </MetricCard>

      {/* 2. Floating P&L */}
      <MetricCard label="Floating P&L" accentColor={floatingPnl >= 0 ? "#10B981" : "#EF4444"}>
        <div className="flex items-end justify-between gap-2">
          <p
            className={`text-2xl font-bold tabular-nums leading-none ${
              floatingPnl >= 0 ? "text-[#10B981]" : "text-[#EF4444]"
            }`}
          >
            {formatCurrency(floatingPnl)}
          </p>
          {equitySpark.length >= 2 && <Sparkline data={equitySpark} />}
        </div>
      </MetricCard>

      {/* 3. Total Profit */}
      <MetricCard label="Total Profit" accentColor={totalProfit >= 0 ? "#10B981" : "#EF4444"}>
        <div className="flex items-end justify-between gap-2">
          <p
            className={`text-2xl font-bold tabular-nums leading-none ${
              totalProfit >= 0 ? "text-[#10B981]" : "text-[#EF4444]"
            }`}
          >
            {formatCurrency(totalProfit)}
          </p>
          {cumPnlSpark.length >= 2 && <Sparkline data={cumPnlSpark} />}
        </div>
      </MetricCard>

      {/* 4. Win Rate */}
      <MetricCard label="Win Rate" accentColor="#10B981">
        <div className="flex items-center justify-between gap-2">
          <p className="text-2xl font-bold tabular-nums text-white leading-none">
            {winRate.toFixed(1)}%
          </p>
          <WinRateDonut winRate={winRate} wins={wins} losses={losses} size={56} />
        </div>
      </MetricCard>

      {/* 5. Open Trades */}
      <MetricCard label="Open Trades" accentColor="#818CF8">
        <p className="text-2xl font-bold tabular-nums text-white leading-none">{openTrades}</p>
      </MetricCard>

      {/* 6. Profit Factor */}
      <MetricCard label="Profit Factor" accentColor="#818CF8">
        <p className="text-2xl font-bold tabular-nums text-white leading-none mb-2">{pfDisplay}</p>
        <AvgWinLossBar avgWin={avgWin} avgLoss={avgLoss} />
      </MetricCard>
    </div>
  );
}
