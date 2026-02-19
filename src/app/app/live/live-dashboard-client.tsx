"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { showInfo } from "@/lib/toast";

// ============================================
// TYPES
// ============================================

interface EAInstanceData {
  id: string;
  eaName: string;
  symbol: string | null;
  timeframe: string | null;
  broker: string | null;
  accountNumber: string | null;
  status: "ONLINE" | "OFFLINE" | "ERROR";
  lastHeartbeat: string | null;
  lastError: string | null;
  balance: number | null;
  equity: number | null;
  openTrades: number;
  totalTrades: number;
  totalProfit: number;
  trades: { profit: number; closeTime: string | null }[];
  heartbeats: { equity: number; createdAt: string }[];
}

interface LiveDashboardClientProps {
  initialData: EAInstanceData[];
}

type RefreshInterval = 5000 | 10000 | 30000 | 60000;

const INTERVAL_LABELS: Record<RefreshInterval, string> = {
  5000: "5s",
  10000: "10s",
  30000: "30s",
  60000: "60s",
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) {
    const mins = Math.floor(diffSec / 60);
    return `${mins} min ago`;
  }
  if (diffSec < 86400) {
    const hours = Math.floor(diffSec / 3600);
    return `${hours}h ago`;
  }
  const days = Math.floor(diffSec / 86400);
  return `${days}d ago`;
}

function calculateWinRate(trades: { profit: number; closeTime: string | null }[]): number {
  const closed = trades.filter((t) => t.closeTime !== null);
  if (closed.length === 0) return 0;
  const winners = closed.filter((t) => t.profit > 0).length;
  return (winners / closed.length) * 100;
}

function calculateProfitFactor(trades: { profit: number; closeTime: string | null }[]): number {
  const closed = trades.filter((t) => t.closeTime !== null);
  const grossProfit = closed.filter((t) => t.profit > 0).reduce((sum, t) => sum + t.profit, 0);
  const grossLoss = Math.abs(
    closed.filter((t) => t.profit < 0).reduce((sum, t) => sum + t.profit, 0)
  );
  if (grossLoss === 0) return grossProfit > 0 ? Infinity : 0;
  return grossProfit / grossLoss;
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

// ============================================
// MINI EQUITY CHART
// ============================================

function MiniEquityChart({ heartbeats }: { heartbeats: { equity: number; createdAt: string }[] }) {
  if (heartbeats.length < 2) {
    return (
      <div className="h-16 flex items-center justify-center text-xs text-[#7C8DB0]">No data</div>
    );
  }

  const sorted = [...heartbeats].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const width = 200;
  const height = 60;
  const padding = 4;

  const equities = sorted.map((h) => h.equity);
  const minEq = Math.min(...equities);
  const maxEq = Math.max(...equities);
  const range = maxEq - minEq || 1;

  const points = sorted.map((h, i) => {
    const x = padding + (i / (sorted.length - 1)) * (width - padding * 2);
    const y = padding + (1 - (h.equity - minEq) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const isPositive = sorted[sorted.length - 1].equity >= sorted[0].equity;
  const lineColor = isPositive ? "#10B981" : "#EF4444";
  const fillColor = isPositive ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)";

  const areaPoints = [
    `${padding},${height - padding}`,
    ...points,
    `${width - padding},${height - padding}`,
  ].join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-16">
      <polygon points={areaPoints} fill={fillColor} />
      <polyline points={points.join(" ")} fill="none" stroke={lineColor} strokeWidth="1.5" />
    </svg>
  );
}

// ============================================
// STATUS BADGE
// ============================================

function StatusBadge({
  status,
  animate,
}: {
  status: "ONLINE" | "OFFLINE" | "ERROR";
  animate?: boolean;
}) {
  if (status === "ONLINE") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-medium text-[#10B981] ${animate ? "animate-pulse" : ""}`}
      >
        <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
        Online
      </span>
    );
  }
  if (status === "ERROR") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#EF4444]">
        <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
        Error
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#64748B]">
      <span className="w-2 h-2 rounded-full bg-[#64748B]" />
      Offline
    </span>
  );
}

// ============================================
// EA CARD
// ============================================

function EACard({ ea, statusChanged }: { ea: EAInstanceData; statusChanged: boolean }) {
  const winRate = calculateWinRate(ea.trades);
  const profitFactor = calculateProfitFactor(ea.trades);
  const maxDrawdown = calculateMaxDrawdown(ea.heartbeats);
  const closedCount = ea.trades.filter((t) => t.closeTime !== null).length;

  return (
    <div
      className={`bg-[#1A0626] border rounded-xl p-6 transition-all duration-500 hover:shadow-[0_4px_24px_rgba(79,70,229,0.15)] ${
        statusChanged
          ? "border-[#A78BFA] shadow-[0_0_20px_rgba(167,139,250,0.2)]"
          : "border-[rgba(79,70,229,0.2)] hover:border-[rgba(79,70,229,0.4)]"
      }`}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-white truncate" title={ea.eaName}>
            {ea.eaName}
          </h3>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-[#7C8DB0]">
            {ea.symbol && <span>{ea.symbol}</span>}
            {ea.timeframe && <span>{ea.timeframe}</span>}
            {ea.broker && (
              <>
                <span className="text-[rgba(79,70,229,0.4)]">|</span>
                <span>{ea.broker}</span>
              </>
            )}
            {ea.accountNumber && (
              <>
                <span className="text-[rgba(79,70,229,0.4)]">|</span>
                <span>#{ea.accountNumber}</span>
              </>
            )}
          </div>
        </div>
        <StatusBadge status={ea.status} animate={statusChanged} />
      </div>

      {/* Financial Metrics */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">Balance</p>
          <p className="text-sm font-medium text-white">{formatCurrency(ea.balance)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">Equity</p>
          <p className="text-sm font-medium text-white">{formatCurrency(ea.equity)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">Profit</p>
          <p
            className={`text-sm font-medium ${ea.totalProfit >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}
          >
            {formatCurrency(ea.totalProfit)}
          </p>
        </div>
      </div>

      {/* Mini equity chart */}
      <div className="mb-4 rounded-lg bg-[#0A0118]/50 p-2">
        <MiniEquityChart heartbeats={ea.heartbeats} />
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-[rgba(79,70,229,0.15)]">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">Trades</p>
          <p className="text-sm font-medium text-[#CBD5E1]">{closedCount}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">Win Rate</p>
          <p className="text-sm font-medium text-[#CBD5E1]">{winRate.toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">
            Profit Factor
          </p>
          <p className="text-sm font-medium text-[#CBD5E1]">
            {profitFactor === Infinity ? "---" : profitFactor.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">Max Drawdown</p>
          <p className="text-sm font-medium text-[#CBD5E1]">{maxDrawdown.toFixed(1)}%</p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-[rgba(79,70,229,0.1)]">
        <span className="text-xs text-[#7C8DB0]">
          Last heartbeat: {formatRelativeTime(ea.lastHeartbeat)}
        </span>
        {ea.lastError && ea.status === "ERROR" && (
          <span className="text-xs text-[#EF4444] truncate max-w-[200px]" title={ea.lastError}>
            {ea.lastError}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================
// CONNECTION INDICATOR
// ============================================

function computeTimeLabel(lastUpdated: Date | null): string {
  if (!lastUpdated) return "Never";
  const seconds = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
  if (seconds < 5) return "Just now";
  return `${seconds}s ago`;
}

function ConnectionIndicator({
  autoRefresh,
  lastUpdated,
}: {
  autoRefresh: boolean;
  lastUpdated: Date | null;
}) {
  // Initialize label to a static value; the interval subscription will keep it updated
  const [timeSinceUpdate, setTimeSinceUpdate] = useState(() => computeTimeLabel(lastUpdated));

  // Subscribe to a 1-second timer to keep the label current
  useEffect(() => {
    if (!autoRefresh || !lastUpdated) return;

    const interval = setInterval(() => {
      setTimeSinceUpdate(computeTimeLabel(lastUpdated));
    }, 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, lastUpdated]);

  return (
    <div className="flex items-center gap-2 text-xs text-[#7C8DB0]">
      {autoRefresh ? (
        <>
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#10B981]" />
          </span>
          <span>Live - Updated {timeSinceUpdate}</span>
        </>
      ) : (
        <>
          <span className="h-2.5 w-2.5 rounded-full bg-[#64748B]" />
          <span>Auto-refresh paused</span>
        </>
      )}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function LiveDashboardClient({ initialData }: LiveDashboardClientProps) {
  const [eaInstances, setEaInstances] = useState<EAInstanceData[]>(initialData);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [interval, setInterval_] = useState<RefreshInterval>(10000);
  const [soundAlerts, setSoundAlerts] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [changedIds, setChangedIds] = useState<Set<string>>(new Set());
  const previousDataRef = useRef<Map<string, EAInstanceData>>(new Map());

  // Initialize previous data
  useEffect(() => {
    const map = new Map<string, EAInstanceData>();
    initialData.forEach((ea) => map.set(ea.id, ea));
    previousDataRef.current = map;
  }, [initialData]);

  const fetchUpdate = useCallback(async () => {
    try {
      const res = await fetch("/api/live/status");
      if (!res.ok) return;

      const data = await res.json();
      const newInstances: EAInstanceData[] = data.data;

      // Detect changes
      const changed = new Set<string>();
      const previousMap = previousDataRef.current;

      for (const ea of newInstances) {
        const prev = previousMap.get(ea.id);
        if (!prev) {
          changed.add(ea.id);
          continue;
        }

        // Check for status change
        if (prev.status !== ea.status) {
          changed.add(ea.id);

          if (soundAlerts) {
            showInfo(
              `${ea.eaName} is now ${ea.status}`,
              `Status changed from ${prev.status} to ${ea.status}`
            );
          }
        }

        // Check for new trades
        if (ea.totalTrades > prev.totalTrades && soundAlerts) {
          showInfo(`New trade on ${ea.eaName}`, `Total trades: ${ea.totalTrades}`);
        }
      }

      // Update refs
      const newMap = new Map<string, EAInstanceData>();
      newInstances.forEach((ea) => newMap.set(ea.id, ea));
      previousDataRef.current = newMap;

      setEaInstances(newInstances);
      setLastUpdated(new Date());
      setChangedIds(changed);

      // Clear highlights after animation
      if (changed.size > 0) {
        setTimeout(() => setChangedIds(new Set()), 2000);
      }
    } catch {
      // Silent fail for polling
    }
  }, [soundAlerts]);

  // Polling effect
  useEffect(() => {
    if (!autoRefresh) return;

    const id = window.setInterval(fetchUpdate, interval);
    return () => window.clearInterval(id);
  }, [autoRefresh, interval, fetchUpdate]);

  return (
    <div className="space-y-6">
      {/* Controls bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-white">Live EAs</h2>
          <span className="text-sm text-[#7C8DB0]">
            {eaInstances.length} instance{eaInstances.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Connection indicator */}
          <ConnectionIndicator autoRefresh={autoRefresh} lastUpdated={lastUpdated} />

          {/* Auto-refresh toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
              autoRefresh
                ? "bg-[#10B981]/20 text-[#10B981] border-[#10B981]/30 hover:bg-[#10B981]/30"
                : "bg-[#0A0118] text-[#7C8DB0] border-[rgba(79,70,229,0.2)] hover:text-white"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {autoRefresh ? "Auto" : "Paused"}
          </button>

          {/* Interval selector */}
          {autoRefresh && (
            <select
              value={interval}
              onChange={(e) => setInterval_(Number(e.target.value) as RefreshInterval)}
              className="rounded-lg bg-[#0A0118] border border-[rgba(79,70,229,0.2)] text-[#CBD5E1] px-2 py-1.5 text-xs focus:outline-none focus:border-[#4F46E5] transition-colors"
            >
              {Object.entries(INTERVAL_LABELS).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          )}

          {/* Sound toggle */}
          <button
            onClick={() => setSoundAlerts(!soundAlerts)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
              soundAlerts
                ? "bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/30 hover:bg-[#F59E0B]/30"
                : "bg-[#0A0118] text-[#7C8DB0] border-[rgba(79,70,229,0.2)] hover:text-white"
            }`}
            title={soundAlerts ? "Notifications on" : "Notifications off"}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {soundAlerts ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M12 18.75a.75.75 0 01-.75-.75V6a.75.75 0 011.5 0v12a.75.75 0 01-.75.75zM8 15H5a1 1 0 01-1-1v-4a1 1 0 011-1h3l4-4v14l-4-4z"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                />
              )}
            </svg>
            Alerts
          </button>

          {/* Manual refresh */}
          <button
            onClick={fetchUpdate}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#94A3B8] border border-[rgba(79,70,229,0.2)] hover:text-white hover:border-[rgba(79,70,229,0.4)] transition-all duration-200"
          >
            Refresh Now
          </button>
        </div>
      </div>

      {/* EA Cards Grid */}
      {eaInstances.length === 0 ? (
        <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#4F46E5] to-[#22D3EE] flex items-center justify-center opacity-60">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No live EAs running</h3>
          <p className="text-sm text-[#94A3B8] max-w-md mx-auto mb-6">
            Export an EA and connect it to MT5 to get started. Your live EAs will appear here with
            real-time performance tracking.
          </p>
          <Link
            href="/app"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#4F46E5] rounded-lg hover:bg-[#6366F1] transition-all duration-200 hover:shadow-[0_0_20px_rgba(79,70,229,0.4)]"
          >
            Go to Dashboard
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {eaInstances.map((ea) => (
            <EACard key={ea.id} ea={ea} statusChanged={changedIds.has(ea.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
