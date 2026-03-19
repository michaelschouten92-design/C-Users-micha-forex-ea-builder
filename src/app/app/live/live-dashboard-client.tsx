"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { showInfo, showSuccess, showError } from "@/lib/toast";
import { getCsrfHeaders } from "@/lib/api-client";
import { HealthDetailPanel } from "@/components/app/health-detail-panel";
import { ProofPanel } from "@/components/app/proof-panel";
import { StrategyStatusBadge } from "@/components/app/strategy-status-badge";
import type { StrategyStatus } from "@/lib/strategy-status/resolver";
import { ShareTrackRecordButton } from "@/components/app/share-track-record-button";
import { useLiveStream, type ConnectionStatus } from "./use-live-stream";
import { RegisterEADialog } from "./register-ea-dialog";
import {
  LinkBaselineDialog,
  type BaselineData,
  type DeploymentContext,
} from "./link-baseline-dialog";
import { resolveInstanceBaselineTrust } from "@/lib/live/baseline-trust-state";
import { formatMonitoringReasons } from "@/lib/live/monitoring-reason-copy";
import { updateOperatorHold } from "./actions";

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
  mode: "LIVE" | "PAPER";
  tradingState: "TRADING" | "PAUSED";
  lastHeartbeat: string | null;
  lastError: string | null;
  balance: number | null;
  equity: number | null;
  openTrades: number;
  totalTrades: number;
  totalProfit: number;
  trades: {
    profit: number;
    closeTime: string | null;
    symbol?: string | null;
    magicNumber?: number | null;
  }[];
  heartbeats: { equity: number; createdAt: string }[];
  healthSnapshots?: { driftDetected: boolean; driftSeverity: number; status: string }[];
  healthStatus?: "HEALTHY" | "WARNING" | "DEGRADED" | "INSUFFICIENT_DATA" | null;
  healthScore?: number | null;
  lifecycleState?: string | null;
  parentInstanceId?: string | null;
  apiKeySuffix?: string | null;
  trackRecordToken?: string | null;
  isAutoDiscovered?: boolean;
  strategyStatus?: string | null;
  operatorHold?: string;
  isExternal?: boolean;
  baseline?: BaselineData | null;
  relinkRequired?: boolean;
  monitoringReasons?: string[];
  deployments?: {
    id: string;
    symbol: string;
    magicNumber: number;
    eaName: string;
    timeframe: string;
    baselineStatus: string;
    strategyVersionId: string | null;
  }[];
}

interface TradeRecord {
  id: string;
  ticket: string;
  symbol: string;
  type: string;
  openPrice: number;
  closePrice: number | null;
  lots: number;
  profit: number;
  openTime: string;
  closeTime: string | null;
  mode: string | null;
}

interface AlertConfig {
  id: string;
  instanceId: string | null;
  instanceName: string | null;
  alertType: string;
  threshold: number | null;
  channel: string;
  webhookUrl: string | null;
  alertState: "ACTIVE" | "DISABLED";
  lastTriggered: string | null;
  createdAt: string;
}

interface LiveDashboardClientProps {
  initialData: EAInstanceData[];
  tier?: string;
  initialRelinkInstanceId?: string | null;
}

const ALERT_TYPE_LABELS: Record<string, string> = {
  DRAWDOWN: "Floating Drawdown",
  OFFLINE: "EA Offline",
  NEW_TRADE: "New Trade",
  ERROR: "EA Error",
  DAILY_LOSS: "Daily Loss Limit",
  WEEKLY_LOSS: "Weekly Loss Limit",
  EQUITY_TARGET: "Equity Target",
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

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
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

const STATUS_TOOLTIPS: Record<string, string> = {
  ONLINE: "EA is connected and actively trading. Heartbeat received within the last 2 minutes.",
  OFFLINE: "EA has not sent a heartbeat recently. Check your MT5 terminal and internet connection.",
  ERROR: "EA reported an error. Check the error message below for details.",
};

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
        title={STATUS_TOOLTIPS.ONLINE}
      >
        <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
        Online
      </span>
    );
  }
  if (status === "ERROR") {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-xs font-medium text-[#EF4444]"
        title={STATUS_TOOLTIPS.ERROR}
      >
        <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
        Error
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-medium text-[#64748B]"
      title={STATUS_TOOLTIPS.OFFLINE}
    >
      <span className="w-2 h-2 rounded-full bg-[#64748B]" />
      Offline
    </span>
  );
}

// ============================================
// TRADE LOG PANEL
// ============================================

function TradeLogPanel({ instanceId, eaName }: { instanceId: string; eaName: string }) {
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/live/${instanceId}/trades?page=${page}&pageSize=20`);
      if (!cancelled && res.ok) {
        const json = await res.json();
        setTrades(json.data);
        setTotalPages(json.pagination.totalPages);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [page, instanceId]);

  function handleExportCSV() {
    if (trades.length === 0) return;
    const headers = [
      "Type",
      "Symbol",
      "Lots",
      "Open Price",
      "Close Price",
      "P/L",
      "Open Time",
      "Close Time",
    ];
    const rows = trades.map((t) => [
      t.type,
      t.symbol,
      t.lots.toFixed(2),
      t.openPrice.toFixed(5),
      t.closePrice !== null ? t.closePrice.toFixed(5) : "",
      t.profit.toFixed(2),
      t.openTime,
      t.closeTime ?? "",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${eaName.replace(/[^a-zA-Z0-9]/g, "_")}_trades.csv`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 150);
  }

  return (
    <div className="mt-4 pt-4 border-t border-[rgba(79,70,229,0.15)]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0]">
            Trade Log - {eaName}
          </p>
          {trades.length > 0 && (
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded border border-[rgba(79,70,229,0.2)] text-[#22D3EE] hover:bg-[rgba(34,211,238,0.1)] transition-colors"
              title="Export trades as CSV"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Export CSV
            </button>
          )}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-2 py-0.5 text-[10px] rounded border border-[rgba(79,70,229,0.2)] text-[#7C8DB0] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <span className="text-[10px] text-[#7C8DB0]">
              {page}/{totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-2 py-0.5 text-[10px] rounded border border-[rgba(79,70,229,0.2)] text-[#7C8DB0] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-xs text-[#7C8DB0] py-4 text-center">Loading trades...</div>
      ) : trades.length === 0 ? (
        <div className="text-xs text-[#7C8DB0] py-4 text-center">No trades recorded yet</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-[#7C8DB0] border-b border-[rgba(79,70,229,0.1)]">
                <th className="text-left py-1.5 pr-2">Type</th>
                <th className="text-left py-1.5 pr-2">Symbol</th>
                <th className="text-right py-1.5 pr-2">Lots</th>
                <th className="text-right py-1.5 pr-2">Open</th>
                <th className="text-right py-1.5 pr-2">Close</th>
                <th className="text-right py-1.5 pr-2">P/L</th>
                <th className="text-right py-1.5 pr-2">Opened</th>
                <th className="text-right py-1.5">Closed</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => (
                <tr
                  key={trade.id}
                  className="border-b border-[rgba(79,70,229,0.05)] hover:bg-[rgba(79,70,229,0.03)]"
                >
                  <td className="py-1.5 pr-2">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        trade.type.toUpperCase().includes("BUY")
                          ? "bg-[#10B981]/15 text-[#10B981]"
                          : "bg-[#EF4444]/15 text-[#EF4444]"
                      }`}
                    >
                      {trade.type}
                    </span>
                  </td>
                  <td className="py-1.5 pr-2 text-[#CBD5E1]">{trade.symbol}</td>
                  <td className="py-1.5 pr-2 text-right text-[#CBD5E1]">{trade.lots.toFixed(2)}</td>
                  <td className="py-1.5 pr-2 text-right text-[#CBD5E1]">
                    {trade.openPrice.toFixed(5)}
                  </td>
                  <td className="py-1.5 pr-2 text-right text-[#CBD5E1]">
                    {trade.closePrice !== null ? trade.closePrice.toFixed(5) : "---"}
                  </td>
                  <td
                    className={`py-1.5 pr-2 text-right font-medium ${
                      trade.profit >= 0 ? "text-[#10B981]" : "text-[#EF4444]"
                    }`}
                  >
                    {formatCurrency(trade.profit)}
                  </td>
                  <td className="py-1.5 pr-2 text-right text-[#7C8DB0]">
                    {formatDateTime(trade.openTime)}
                  </td>
                  <td className="py-1.5 text-right text-[#7C8DB0]">
                    {trade.closeTime ? formatDateTime(trade.closeTime) : "Open"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================
// TRACK RECORD PANEL
// ============================================

interface TrackRecordVerification {
  instanceId: string;
  eaName: string;
  mode: string;
  chain: {
    valid: boolean;
    length: number;
    firstEventHash: string | null;
    lastEventHash: string | null;
    error?: string;
  };
  checkpoints: {
    count: number;
    lastHmac: string | null;
    verified: boolean;
  };
  verified: boolean;
}

interface TrackRecordMetricsData {
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  profitFactor: number;
  drawdownDuration: number;
}

function formatMetricsDuration(seconds: number): string {
  if (seconds <= 0) return "---";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function TrackRecordPanel({ instanceId, eaName }: { instanceId: string; eaName: string }) {
  const [data, setData] = useState<TrackRecordVerification | null>(null);
  const [metrics, setMetrics] = useState<TrackRecordMetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [verifyRes, metricsRes] = await Promise.all([
          fetch(`/api/track-record/verify?instanceId=${instanceId}`),
          fetch(`/api/track-record/metrics/${instanceId}`),
        ]);
        if (!cancelled && verifyRes.ok) {
          setData(await verifyRes.json());
        }
        if (!cancelled && metricsRes.ok) {
          setMetrics(await metricsRes.json());
        }
      } catch {
        // Silently fail
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [instanceId]);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch(`/api/track-record/export/${instanceId}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `track-record-${eaName.replace(/[^a-zA-Z0-9]/g, "_")}.json`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 150);
        showSuccess("Track record exported");
      } else {
        showError("Export failed", "Could not generate track record export.");
      }
    } catch {
      showError("Export failed");
    }
    setExporting(false);
  }

  if (loading) {
    return (
      <div className="mt-4 pt-4 border-t border-[rgba(79,70,229,0.15)]">
        <div className="flex items-center gap-2 text-xs text-[#7C8DB0]">
          <div className="w-3 h-3 border-2 border-[#7C8DB0] border-t-transparent rounded-full animate-spin" />
          Loading track record...
        </div>
      </div>
    );
  }

  if (!data || data.chain.length === 0) {
    return (
      <div className="mt-4 pt-4 border-t border-[rgba(79,70,229,0.15)]">
        <p className="text-xs text-[#7C8DB0]">
          No track record events yet. Events will appear once the EA starts sending data.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 pt-4 border-t border-[rgba(79,70,229,0.15)]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
            Verified Track Record
          </h4>
          {data.verified ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30">
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Chain Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30">
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Chain Broken
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ShareTrackRecordButton instanceId={instanceId} />
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#22D3EE]/20 text-[#22D3EE] border border-[#22D3EE]/30 hover:bg-[#22D3EE]/30 transition-all duration-200 disabled:opacity-50"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            {exporting ? "Exporting..." : "Export Record"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#0A0118]/50 rounded-lg p-2.5">
          <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">Chain Length</p>
          <p className="text-sm font-medium text-[#CBD5E1]">{data.chain.length.toLocaleString()}</p>
        </div>
        <div className="bg-[#0A0118]/50 rounded-lg p-2.5">
          <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">Checkpoints</p>
          <p className="text-sm font-medium text-[#CBD5E1]">{data.checkpoints.count}</p>
        </div>
        <div className="bg-[#0A0118]/50 rounded-lg p-2.5">
          <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">HMAC Status</p>
          <p
            className={`text-sm font-medium ${data.checkpoints.verified ? "text-[#10B981]" : data.checkpoints.count === 0 ? "text-[#7C8DB0]" : "text-[#EF4444]"}`}
          >
            {data.checkpoints.count === 0 ? "N/A" : data.checkpoints.verified ? "Valid" : "Invalid"}
          </p>
        </div>
        <div className="bg-[#0A0118]/50 rounded-lg p-2.5">
          <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">Integrity</p>
          <p
            className={`text-sm font-medium ${data.verified ? "text-[#10B981]" : "text-[#EF4444]"}`}
          >
            {data.verified ? "Self-Reported, Verified" : "Unverified"}
          </p>
        </div>
      </div>

      {/* Risk Metrics */}
      {metrics && (metrics.sharpeRatio !== 0 || metrics.sortinoRatio !== 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-3">
          <div className="bg-[#0A0118]/50 rounded-lg p-2.5">
            <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">Sharpe</p>
            <p className="text-sm font-medium text-[#CBD5E1]">{metrics.sharpeRatio.toFixed(2)}</p>
          </div>
          <div className="bg-[#0A0118]/50 rounded-lg p-2.5">
            <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">Sortino</p>
            <p className="text-sm font-medium text-[#CBD5E1]">{metrics.sortinoRatio.toFixed(2)}</p>
          </div>
          <div className="bg-[#0A0118]/50 rounded-lg p-2.5">
            <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">Calmar</p>
            <p className="text-sm font-medium text-[#CBD5E1]">{metrics.calmarRatio.toFixed(2)}</p>
          </div>
          <div className="bg-[#0A0118]/50 rounded-lg p-2.5">
            <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">
              Profit Factor
            </p>
            <p className="text-sm font-medium text-[#CBD5E1]">
              {metrics.profitFactor === Infinity ? "∞" : metrics.profitFactor.toFixed(2)}
            </p>
          </div>
          <div className="bg-[#0A0118]/50 rounded-lg p-2.5">
            <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">
              Max DD Duration
            </p>
            <p className="text-sm font-medium text-[#CBD5E1]">
              {formatMetricsDuration(metrics.drawdownDuration)}
            </p>
          </div>
        </div>
      )}

      {data.chain.error && (
        <div className="mt-2 px-3 py-2 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/20">
          <p className="text-xs text-[#EF4444]">{data.chain.error}</p>
        </div>
      )}

      {data.chain.lastEventHash && (
        <div
          className="mt-2 text-[10px] text-[#7C8DB0] font-mono truncate"
          title={data.chain.lastEventHash}
        >
          Last hash: {data.chain.lastEventHash}
        </div>
      )}
    </div>
  );
}

// ============================================
// INSTANCE ATTENTION RESOLVER (shared by Action Required panel + card detail box)
// ============================================

interface InstanceAttention {
  statusLabel: string;
  reason: string;
  actionLabel: string;
  color: string;
}

function resolveInstanceAttention(
  ea: EAInstanceData,
  monitoringReasonFormatter: (reasons: string[]) => string[]
): InstanceAttention | null {
  const trust = resolveInstanceBaselineTrust({
    hasBaseline: !!ea.baseline,
    relinkRequired: !!ea.relinkRequired,
  });

  if (trust.state === "SUSPENDED") {
    return {
      statusLabel: "Baseline suspended",
      reason: "Material change invalidated baseline trust",
      actionLabel: trust.actionLabel!,
      color: "#F59E0B",
    };
  }
  if (trust.state === "MISSING") {
    return {
      statusLabel: "No baseline linked",
      reason: "No baseline is linked to this deployment",
      actionLabel: trust.actionLabel!,
      color: "#71717A",
    };
  }
  if (ea.strategyStatus === "EDGE_DEGRADED") {
    return {
      statusLabel: "Edge at risk",
      reason: ea.monitoringReasons?.length
        ? monitoringReasonFormatter(ea.monitoringReasons)[0]
        : "Live performance has materially diverged from baseline",
      actionLabel: "Inspect drift",
      color: "#EF4444",
    };
  }
  if (ea.strategyStatus === "UNSTABLE") {
    return {
      statusLabel: "Unstable",
      reason: ea.monitoringReasons?.length
        ? monitoringReasonFormatter(ea.monitoringReasons)[0]
        : "Health metrics show early signs of deviation",
      actionLabel: "Inspect performance",
      color: "#F59E0B",
    };
  }
  if (ea.healthStatus === "INSUFFICIENT_DATA" || ea.strategyStatus === "TESTING") {
    return {
      statusLabel: "Waiting for data",
      reason: "More live samples are needed before evaluation",
      actionLabel: "Collect more data",
      color: "#A78BFA",
    };
  }
  if (ea.status === "ERROR") {
    return {
      statusLabel: "Connection error",
      reason: ea.lastError ?? "EA reported an error state",
      actionLabel: "Check connection",
      color: "#EF4444",
    };
  }
  return null;
}

// ============================================
// ACCOUNT GROUPING
// ============================================

interface AccountGroup {
  key: string;
  broker: string | null;
  accountNumber: string | null;
  instances: EAInstanceData[];
  /** Account-wide instance (symbol === null) if present, otherwise first instance */
  primary: EAInstanceData;
}

function groupByAccount(instances: EAInstanceData[]): AccountGroup[] {
  const map = new Map<string, EAInstanceData[]>();

  // Identify known parent ids: instances that at least one child points to
  const knownParentIds = new Set(
    instances.map((ea) => ea.parentInstanceId).filter((id): id is string => id != null)
  );

  for (const ea of instances) {
    let key: string;
    if (ea.parentInstanceId) {
      // Child with explicit parent link — group under parent
      key = ea.parentInstanceId;
    } else if (knownParentIds.has(ea.id)) {
      // This instance is a known parent (children point to it) — group by own id
      key = ea.id;
    } else {
      // Standalone or legacy instance without parent relation — group by broker|accountNumber
      key = `${ea.broker ?? "Unknown"}|${ea.accountNumber ?? ea.id}`;
    }

    const group = map.get(key) ?? [];
    group.push(ea);
    map.set(key, group);
  }
  return Array.from(map.entries()).map(([key, group]) => {
    // Use account-wide instance as primary if available, otherwise first
    const accountWide = group.find((ea) => ea.symbol === null);
    const primary = accountWide ?? group[0];
    return {
      key,
      broker: primary.broker,
      accountNumber: primary.accountNumber,
      instances: group,
      primary,
    };
  });
}

// ============================================
// PRIORITY SORTING
// ============================================

/**
 * Compute a numeric priority for an instance. Lower = more urgent.
 *
 * Priority buckets:
 *   0 — EDGE_AT_RISK lifecycle
 *   1 — DEGRADED health (product label: "Edge at Risk")
 *   2 — WARNING health
 *   3 — Discovered / Draft / needs activation
 *   4 — Active healthy strategies (LIVE_MONITORING + HEALTHY)
 *   5 — Inactive / paused / no signal
 */
function instancePriority(ea: EAInstanceData): number {
  // Bucket 0: lifecycle EDGE_AT_RISK
  if (ea.lifecycleState === "EDGE_AT_RISK") return 0;

  // Bucket 1: health DEGRADED
  const healthStatus = ea.healthSnapshots?.[0]?.status ?? ea.healthStatus ?? null;
  if (healthStatus === "DEGRADED") return 1;

  // Bucket 2: health WARNING
  if (healthStatus === "WARNING") return 2;

  // Bucket 3: discovered / draft / needs baseline
  if (ea.isAutoDiscovered || ea.lifecycleState === "DRAFT") return 3;

  // Bucket 4: active healthy
  if (
    ea.status === "ONLINE" &&
    (healthStatus === "HEALTHY" || healthStatus === "INSUFFICIENT_DATA" || healthStatus === null)
  ) {
    return 4;
  }

  // Bucket 5: everything else (offline, inactive, etc.)
  return 5;
}

/**
 * Tie-breaker comparator within the same priority bucket.
 * Negative = a before b.
 */
function instanceTieBreaker(a: EAInstanceData, b: EAInstanceData): number {
  // 1. Drift detected first
  const aDrift = a.healthSnapshots?.[0]?.driftDetected === true ? 0 : 1;
  const bDrift = b.healthSnapshots?.[0]?.driftDetected === true ? 0 : 1;
  if (aDrift !== bDrift) return aDrift - bDrift;

  // 2. Worse health score first (lower score = worse)
  const aScore = a.healthSnapshots?.[0] ? 1 - (a.healthSnapshots[0].driftSeverity ?? 0) : 1;
  const bScore = b.healthSnapshots?.[0] ? 1 - (b.healthSnapshots[0].driftSeverity ?? 0) : 1;
  if (aScore !== bScore) return aScore - bScore;

  // 3. More recent heartbeat first
  const aTime = a.lastHeartbeat ? new Date(a.lastHeartbeat).getTime() : 0;
  const bTime = b.lastHeartbeat ? new Date(b.lastHeartbeat).getTime() : 0;
  if (aTime !== bTime) return bTime - aTime;

  // 4. Stable fallback: id
  return a.id.localeCompare(b.id);
}

function compareInstances(a: EAInstanceData, b: EAInstanceData): number {
  const pa = instancePriority(a);
  const pb = instancePriority(b);
  if (pa !== pb) return pa - pb;
  return instanceTieBreaker(a, b);
}

/**
 * Sort account groups by the highest-priority instance within each group.
 * Also sorts instances within each group by priority.
 */
function sortByPriority(groups: AccountGroup[]): AccountGroup[] {
  // Sort instances within each group
  for (const group of groups) {
    group.instances.sort(compareInstances);
  }

  // Sort groups by their highest-priority (first) instance
  return groups.sort((a, b) => {
    const bestA = a.instances[0];
    const bestB = b.instances[0];
    if (!bestA || !bestB) return 0;
    return compareInstances(bestA, bestB);
  });
}

// ============================================
// STRATEGY HEALTH DISPLAY
// ============================================

type StrategyHealthLabel = "Healthy" | "Elevated" | "Edge at Risk" | "Pending";

function deriveStrategyHealth(instance: EAInstanceData | undefined): StrategyHealthLabel {
  if (!instance) return "Pending";

  // Lifecycle state is the strongest signal
  if (instance.lifecycleState === "EDGE_AT_RISK" || instance.lifecycleState === "INVALIDATED") {
    return "Edge at Risk";
  }

  // Latest health snapshot
  const snap = instance.healthSnapshots?.[0];
  if (snap) {
    if (snap.status === "AT_RISK" || snap.status === "DEGRADED") return "Edge at Risk";
    if (snap.status === "WARNING" || snap.driftDetected) return "Elevated";
    if (snap.status === "HEALTHY") return "Healthy";
  }

  // Fallback: strategy status
  if (instance.strategyStatus === "EDGE_DEGRADED") return "Edge at Risk";
  if (instance.strategyStatus === "UNSTABLE") return "Elevated";

  // No explicit health confirmation — treat as pending
  return "Pending";
}

const HEALTH_STYLES: Record<StrategyHealthLabel, { bg: string; text: string; dot: string }> = {
  Healthy: { bg: "bg-[#10B981]/10", text: "text-[#10B981]", dot: "bg-[#10B981]" },
  Elevated: { bg: "bg-[#F59E0B]/10", text: "text-[#F59E0B]", dot: "bg-[#F59E0B]" },
  "Edge at Risk": { bg: "bg-[#EF4444]/10", text: "text-[#EF4444]", dot: "bg-[#EF4444]" },
  Pending: { bg: "bg-[#64748B]/10", text: "text-[#64748B]", dot: "bg-[#64748B]" },
};

// ============================================
// INVESTIGATION PANEL
// ============================================

function deriveSignalSummary(
  health: StrategyHealthLabel,
  snap: (EAInstanceData["healthSnapshots"] extends (infer U)[] | undefined ? U : never) | undefined,
  isLinked: boolean
): string {
  if (!isLinked) return "Baseline not linked — health monitoring inactive";
  if (!snap) return "Awaiting first monitoring evaluation";
  switch (health) {
    case "Healthy":
      return "Snapshot status: HEALTHY";
    case "Elevated":
      return snap.driftDetected
        ? "Drift detected by CUSUM monitoring"
        : `Snapshot status: ${snap.status}`;
    case "Edge at Risk":
      return `Snapshot status: ${snap.status} — drift detected: ${snap.driftDetected ? "yes" : "no"}`;
    case "Pending":
      return "No health snapshot available";
  }
}

function InvestigationPanel({
  instance,
  trades,
  health,
  isLinked,
}: {
  instance: EAInstanceData;
  trades: { profit: number; closeTime: string | null }[];
  health: StrategyHealthLabel;
  isLinked: boolean;
}) {
  const snap = instance.healthSnapshots?.[0];
  const recentTrades = trades
    .filter((t) => t.closeTime)
    .sort((a, b) => (b.closeTime! > a.closeTime! ? 1 : b.closeTime! < a.closeTime! ? -1 : 0))
    .slice(0, 10);
  const wins = recentTrades.filter((t) => t.profit > 0).length;
  const losses = recentTrades.filter((t) => t.profit < 0).length;
  const hs = HEALTH_STYLES[health];

  return (
    <div className="ml-3 mr-3 mb-1 px-4 py-3 rounded-b-lg bg-[#0A0118]/60 border border-t-0 border-[rgba(79,70,229,0.15)] space-y-3">
      {/* Status Header */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
        <span className={`inline-flex items-center gap-1 font-medium ${hs.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${hs.dot}`} />
          {health}
        </span>
        <span className="text-[#7C8DB0]">
          Lifecycle: <span className="text-[#CBD5E1]">{instance.lifecycleState ?? "—"}</span>
        </span>
        {snap && (
          <span className="text-[#7C8DB0]">
            Snapshot: <span className="text-[#CBD5E1]">{snap.status}</span>
          </span>
        )}
        <span className="text-[#7C8DB0]">
          Baseline: <span className="text-[#CBD5E1]">{isLinked ? "Linked" : "Not linked"}</span>
        </span>
      </div>

      {/* Signal Summary */}
      <p className="text-[11px] text-[#94A3B8] leading-relaxed">
        {deriveSignalSummary(health, snap, isLinked)}
      </p>

      {/* Drift Context */}
      {snap && (
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-[10px]">
          <span className="text-[#7C8DB0]">
            CUSUM severity: <span className="text-[#CBD5E1]">{snap.driftSeverity.toFixed(3)}</span>
          </span>
          <span className="text-[#7C8DB0]">
            Drift detected:{" "}
            <span className="text-[#CBD5E1]">{snap.driftDetected ? "Yes" : "No"}</span>
          </span>
        </div>
      )}

      {/* Recent Evidence */}
      {recentTrades.length > 0 && (
        <div className="text-[10px]">
          <span className="text-[#7C8DB0]">Last {recentTrades.length} trades: </span>
          <span className="text-[#10B981]">{wins}W</span>
          <span className="text-[#64748B]"> / </span>
          <span className="text-[#EF4444]">{losses}L</span>
          <span className="text-[#64748B]"> · Net: </span>
          <span
            className={
              recentTrades.reduce((s, t) => s + t.profit, 0) >= 0
                ? "text-[#10B981]"
                : "text-[#EF4444]"
            }
          >
            {formatCurrency(recentTrades.reduce((s, t) => s + t.profit, 0))}
          </span>
        </div>
      )}

      {/* Monitoring Integrity */}
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-[10px] text-[#7C8DB0] border-t border-[rgba(79,70,229,0.08)] pt-2">
        <span>
          Status:{" "}
          <span className={instance.status === "ONLINE" ? "text-[#10B981]" : "text-[#EF4444]"}>
            {instance.status}
          </span>
        </span>
        <span>
          Heartbeat:{" "}
          <span className="text-[#CBD5E1]">
            {instance.lastHeartbeat ? formatRelativeTime(instance.lastHeartbeat) : "Never"}
          </span>
        </span>
        {instance.operatorHold && instance.operatorHold !== "NONE" && (
          <span>
            Hold: <span className="text-[#F59E0B]">{instance.operatorHold}</span>
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================
// ACCOUNT CARD
// ============================================

function AccountCard({
  account,
  changedIds,
  onTogglePause,
  onDelete,
  onLinkBaseline,
}: {
  account: AccountGroup;
  changedIds: Set<string>;
  onTogglePause: (instanceId: string, tradingState: "TRADING" | "PAUSED") => void;
  onDelete: (instanceId: string) => void;
  onLinkBaseline: (instanceId: string) => void;
}) {
  const { primary, instances } = account;
  const [expanded, setExpanded] = useState(false);
  const [expandedStrategyKey, setExpandedStrategyKey] = useState<string | null>(null);
  const [rotatedKey, setRotatedKey] = useState<string | null>(null);
  const [rotateLoading, setRotateLoading] = useState(false);
  const [showRotateConfirm, setShowRotateConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [trackRecordToken, setTrackRecordToken] = useState<string | null>(
    primary.trackRecordToken ?? null
  );
  const [trackRecordLoading, setTrackRecordLoading] = useState(false);
  const [trackRecordCopied, setTrackRecordCopied] = useState(false);

  // Account-level metrics: use primary (account-wide if available), else aggregate
  const isAccountWide = primary.symbol === null;
  const balance = isAccountWide
    ? primary.balance
    : instances.reduce((sum, ea) => sum + (ea.balance ?? 0), 0) || null;
  const equity = isAccountWide
    ? primary.equity
    : instances.reduce((sum, ea) => sum + (ea.equity ?? 0), 0) || null;
  const totalProfit = isAccountWide
    ? primary.totalProfit
    : instances.reduce((sum, ea) => sum + ea.totalProfit, 0);
  const totalTrades = isAccountWide
    ? primary.totalTrades
    : instances.reduce((sum, ea) => sum + ea.totalTrades, 0);
  const openTrades = isAccountWide
    ? primary.openTrades
    : instances.reduce((sum, ea) => sum + ea.openTrades, 0);

  const allHeartbeats = isAccountWide
    ? primary.heartbeats
    : instances.flatMap((ea) => ea.heartbeats ?? []);
  // Always aggregate trades from all instances so manifest context instance trades
  // (Milestone C) are included alongside account-wide trades.
  const allTrades = instances.flatMap((ea) => ea.trades ?? []);
  const winRate = calculateWinRate(allTrades);
  const profitFactor = calculateProfitFactor(allTrades);
  // Count strategies flagged as Edge at Risk (lifecycle or health DEGRADED).
  const edgeAtRiskCount = instances.filter(
    (ea) => ea.lifecycleState === "EDGE_AT_RISK" || ea.healthStatus === "DEGRADED"
  ).length;
  // Group trades by symbol + magicNumber to identify unique strategies.
  // Also includes manifest context instances as rows even before any trades exist.
  const strategyGroups = (() => {
    const map = new Map<
      string,
      {
        symbol: string;
        magicNumber: number | null;
        trades: typeof allTrades;
        instanceId: string | null;
      }
    >();
    for (const t of allTrades) {
      const key = `${t.symbol}|${t.magicNumber ?? "none"}`;
      const existing = map.get(key);
      if (existing) {
        existing.trades.push(t);
      } else {
        // Match trade to owning instance
        const inst = instances.find(
          (ea) =>
            ea.symbol?.toUpperCase() === (t.symbol ?? "").toUpperCase() ||
            ea.deployments?.some((d) => d.symbol.toUpperCase() === (t.symbol ?? "").toUpperCase())
        );
        map.set(key, {
          symbol: t.symbol ?? "UNKNOWN",
          magicNumber: t.magicNumber ?? null,
          trades: [t],
          instanceId: inst?.id ?? null,
        });
      }
    }
    // Manifest/auto-discovered mode: add context instances (non-primary, with symbol set)
    // as strategy rows so strategies appear immediately after the first heartbeat, before
    // any trades. Resolve magicNumber from the instance's deployment if available.
    for (const ctx of instances) {
      if (ctx.id === primary.id || !ctx.symbol) continue;
      const key = `ctx:${ctx.id}`;
      if (!map.has(key)) {
        const dep = ctx.deployments?.find(
          (d) => d.symbol.toUpperCase() === ctx.symbol!.toUpperCase()
        );
        map.set(key, {
          symbol: ctx.symbol,
          magicNumber: dep?.magicNumber ?? null,
          trades: [],
          instanceId: ctx.id,
        });
      }
    }
    return Array.from(map.entries())
      .sort(([keyA, a], [keyB, b]) => {
        // Match strategy group to its owning instance for priority sorting
        const matchInstance = (k: string): EAInstanceData | undefined => {
          if (k.startsWith("ctx:")) return instances.find((ea) => ea.id === k.slice(4));
          const [sym] = k.split("|");
          return instances.find(
            (ea) =>
              ea.symbol?.toUpperCase() === sym?.toUpperCase() ||
              ea.deployments?.some((d) => d.symbol.toUpperCase() === sym?.toUpperCase())
          );
        };
        const instA = matchInstance(keyA);
        const instB = matchInstance(keyB);
        if (instA && instB) {
          const cmp = compareInstances(instA, instB);
          if (cmp !== 0) return cmp;
        }
        // Fallback: PnL magnitude for rows without a matching instance
        const pnlA = a.trades.reduce((s, t) => s + t.profit, 0);
        const pnlB = b.trades.reduce((s, t) => s + t.profit, 0);
        return Math.abs(pnlB) - Math.abs(pnlA);
      })
      .map(([, v]) => v);
  })();

  const statusChanged = instances.some((ea) => changedIds.has(ea.id));
  const onlineCount = instances.filter((ea) => ea.status === "ONLINE").length;
  const accountStatus: "ONLINE" | "OFFLINE" | "ERROR" =
    onlineCount > 0
      ? "ONLINE"
      : instances.some((ea) => ea.status === "ERROR")
        ? "ERROR"
        : "OFFLINE";

  // Account-level pause/halt
  const allPaused = instances.every((ea) => ea.tradingState === "PAUSED");
  const anyHalted = instances.some((ea) => (ea.operatorHold ?? "NONE") !== "NONE");
  const [pauseLoading, setPauseLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  async function handleAccountPause() {
    setPauseLoading(true);
    const target = allPaused ? "TRADING" : "PAUSED";
    for (const ea of instances) {
      await onTogglePause(ea.id, target);
    }
    setPauseLoading(false);
  }

  async function handleAccountDelete() {
    setDeleteLoading(true);
    for (const ea of instances) {
      await onDelete(ea.id);
    }
  }

  async function handleUnlinkBaseline(instanceId: string, deploymentId: string) {
    try {
      const res = await fetch(`/api/live/${instanceId}/unlink-baseline`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({ deploymentId }),
      });
      if (res.ok) {
        showSuccess("Baseline unlinked", "You can link a new baseline at any time.");
        // Reload to reflect changes
        window.location.reload();
      } else {
        const data = await res.json().catch(() => ({}));
        showError("Failed to unlink", data.message ?? "Something went wrong");
      }
    } catch {
      showError("Failed to unlink", "Network error");
    }
  }

  async function handleRotateKey() {
    setRotateLoading(true);
    try {
      const res = await fetch(`/api/live/${primary.id}/rotate-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
      });
      if (res.ok) {
        const data = await res.json();
        setRotatedKey(data.apiKey);
        setShowRotateConfirm(false);
        showSuccess("API key regenerated", "Copy your new key now — it won't be shown again.");
      } else {
        const data = await res.json().catch(() => ({}));
        showError("Key rotation failed", data.message ?? "Something went wrong");
      }
    } catch {
      showError("Key rotation failed", "Network error");
    }
    setRotateLoading(false);
  }

  async function handleCopyKey() {
    if (!rotatedKey) return;
    try {
      await navigator.clipboard.writeText(rotatedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showError("Copy failed", "Could not copy to clipboard");
    }
  }

  async function handleTrackRecordAction(action: "publish" | "unpublish") {
    setTrackRecordLoading(true);
    try {
      const res = await fetch(`/api/live/${primary.id}/track-record-share`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        const data = await res.json();
        setTrackRecordToken(data.isPublic ? data.token : null);
      } else {
        showError("Failed", "Could not update track record share");
      }
    } catch {
      showError("Failed", "Network error");
    }
    setTrackRecordLoading(false);
  }

  async function handleCopyTrackRecordUrl() {
    if (!trackRecordToken) return;
    const url = `${window.location.origin}/track-record/${trackRecordToken}`;
    try {
      await navigator.clipboard.writeText(url);
      setTrackRecordCopied(true);
      setTimeout(() => setTrackRecordCopied(false), 2000);
    } catch {
      showError("Copy failed", "Could not copy to clipboard");
    }
  }

  // Aggregate health counts from child strategy instances
  const healthCounts = (() => {
    const counts: Record<StrategyHealthLabel, number> = {
      Healthy: 0,
      Elevated: 0,
      "Edge at Risk": 0,
      Pending: 0,
    };
    for (const ea of instances) {
      if (ea.id === primary.id && !ea.symbol) continue; // skip account-wide parent
      counts[deriveStrategyHealth(ea)]++;
    }
    return counts;
  })();
  const healthSummaryParts = (
    ["Edge at Risk", "Elevated", "Healthy", "Pending"] as StrategyHealthLabel[]
  ).filter((label) => healthCounts[label] > 0);

  const lastHeartbeat = instances
    .map((ea) => ea.lastHeartbeat)
    .filter(Boolean)
    .sort()
    .pop();

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
          <h3 className="font-semibold text-white truncate">{primary.eaName}</h3>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-[#7C8DB0]">
            {primary.symbol ? (
              <span>{primary.symbol}</span>
            ) : (
              <span className="text-[#7C8DB0]/70 italic">Account-wide (portfolio mode)</span>
            )}
            {account.broker && (
              <>
                <span className="text-[rgba(79,70,229,0.4)]">|</span>
                <span>{account.broker}</span>
              </>
            )}
            {account.accountNumber && (
              <>
                <span className="text-[rgba(79,70,229,0.4)]">|</span>
                <span>#{account.accountNumber}</span>
              </>
            )}
          </div>
          {healthSummaryParts.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              {healthSummaryParts.map((label) => {
                const hs = HEALTH_STYLES[label];
                return (
                  <span
                    key={label}
                    className={`inline-flex items-center gap-1 text-[10px] font-medium ${hs.text}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${hs.dot}`} />
                    {healthCounts[label]} {label}
                  </span>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={accountStatus} animate={statusChanged} />
          {(() => {
            const execState = anyHalted ? "HALTED" : allPaused ? "PAUSED" : "RUN";
            const execColor =
              execState === "HALTED" ? "#EF4444" : execState === "PAUSED" ? "#F59E0B" : "#10B981";
            return (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-medium rounded-full"
                style={{
                  backgroundColor: `${execColor}20`,
                  color: execColor,
                  border: `1px solid ${execColor}4D`,
                }}
              >
                {execState}
              </span>
            );
          })()}
          {instances.some((ea) => ea.mode === "PAPER") && (
            <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30">
              Paper
            </span>
          )}
          {/* Edge monitoring status badge */}
          {(() => {
            const latestSnapshot = instances
              .map((ea) => ea.healthSnapshots?.[0])
              .filter(Boolean)[0];
            if (!latestSnapshot) return null;
            const { driftDetected, driftSeverity, status } = latestSnapshot;
            if (driftDetected) {
              return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse" />
                  Drift detected
                </span>
              );
            }
            if (driftSeverity > 0.3 || status === "WARNING") {
              return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                  Monitoring: Warning
                </span>
              );
            }
            if (status === "DEGRADED") {
              return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
                  Monitoring: Edge at Risk
                </span>
              );
            }
            return (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                Monitoring: OK
              </span>
            );
          })()}
          {/* Auto-discovered strategy badge */}
          {instances.some((ea) => ea.isAutoDiscovered) && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-[#8B5CF6]/20 text-[#A78BFA] border border-[#8B5CF6]/30">
              Discovered
            </span>
          )}
        </div>
      </div>

      {/* Financial metrics */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0]">Balance</p>
          <p className="text-lg font-semibold text-white">{formatCurrency(balance)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0]">Equity</p>
          <p className="text-lg font-semibold text-white">{formatCurrency(equity)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0]">Profit</p>
          <p
            className={`text-lg font-semibold ${totalProfit >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}
          >
            {formatCurrency(totalProfit)}
          </p>
        </div>
      </div>

      {/* Mini equity chart */}
      <div className="mb-4 bg-[#0A0118] rounded-lg p-2">
        <MiniEquityChart heartbeats={allHeartbeats} />
      </div>

      {/* Performance metrics */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0]">Trades</p>
          <p className="text-sm font-semibold text-white">{totalTrades}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0]">Win Rate</p>
          <p className="text-sm font-semibold text-white">{winRate.toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0]">Profit Factor</p>
          <p className="text-sm font-semibold text-white">
            {profitFactor === Infinity ? "∞" : profitFactor.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0]">Edge at Risk</p>
          <p
            className={`text-sm font-semibold ${edgeAtRiskCount > 0 ? "text-[#EF4444]" : "text-white"}`}
          >
            {edgeAtRiskCount} {edgeAtRiskCount === 1 ? "strategy" : "strategies"}
          </p>
          <p className="text-[9px] text-[#64748B]">
            {edgeAtRiskCount > 0 ? "Investigation recommended" : "All strategies healthy"}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 mb-2">
        <button
          onClick={handleAccountPause}
          disabled={pauseLoading}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
            allPaused
              ? "bg-[#10B981]/20 text-[#10B981] border-[#10B981]/30 hover:bg-[#10B981]/30"
              : "bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/30 hover:bg-[#F59E0B]/30"
          }`}
        >
          {allPaused ? "▶ Resume All" : "⏸ Pause All"}
        </button>

        {showDeleteConfirm ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#EF4444]">Delete all instances?</span>
            <button
              onClick={handleAccountDelete}
              disabled={deleteLoading}
              className="px-2 py-1 text-xs font-medium text-white bg-[#EF4444] rounded-lg hover:bg-[#DC2626]"
            >
              Confirm
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-2 py-1 text-xs font-medium text-[#94A3B8] hover:text-white"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[rgba(79,70,229,0.2)] text-[#94A3B8] hover:text-[#EF4444] hover:border-[#EF4444]/30 transition-all duration-200"
          >
            🗑 Delete
          </button>
        )}

        <span className="ml-auto text-[10px] text-[#64748B]">
          Last heartbeat: {formatRelativeTime(lastHeartbeat ?? null)}
        </span>
      </div>

      {/* API Key management — only for root/parent instances (not child/discovered) */}
      {!primary.parentInstanceId && (
        <div className="mb-4 px-3 py-2.5 rounded-lg bg-[#0A0118]/50 border border-[rgba(79,70,229,0.1)]">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">API Key</p>
              {rotatedKey ? (
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono text-[#10B981] truncate max-w-[280px]">
                    {rotatedKey}
                  </code>
                  <button
                    onClick={handleCopyKey}
                    className="text-[10px] font-medium text-[#818CF8] hover:text-white transition-colors shrink-0"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                  <button
                    onClick={() => setRotatedKey(null)}
                    className="text-[10px] text-[#64748B] hover:text-white transition-colors shrink-0"
                  >
                    Dismiss
                  </button>
                </div>
              ) : (
                <p className="text-xs font-mono text-[#64748B]">
                  ••••••••••••{primary.apiKeySuffix ?? "••••"}
                </p>
              )}
            </div>
            {!rotatedKey && (
              <div className="shrink-0">
                {showRotateConfirm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#F59E0B]">Invalidate current key?</span>
                    <button
                      onClick={handleRotateKey}
                      disabled={rotateLoading}
                      className="px-2 py-1 text-[10px] font-medium text-white bg-[#F59E0B] rounded hover:bg-[#D97706] disabled:opacity-50"
                    >
                      {rotateLoading ? "..." : "Confirm"}
                    </button>
                    <button
                      onClick={() => setShowRotateConfirm(false)}
                      className="px-2 py-1 text-[10px] text-[#94A3B8] hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowRotateConfirm(true)}
                    className="text-[10px] font-medium text-[#818CF8] hover:text-white transition-colors"
                  >
                    Regenerate
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Public Track Record share — only for root instances */}
      {!primary.parentInstanceId && (
        <div className="mb-4 px-3 py-2.5 rounded-lg bg-[#0A0118]/50 border border-[rgba(79,70,229,0.1)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">
                Public Track Record
              </p>
              {trackRecordToken ? (
                <p className="text-[10px] text-[#10B981]">Published</p>
              ) : (
                <p className="text-[10px] text-[#64748B]">
                  Share a verified live account track record monitored by AlgoStudio.
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {trackRecordToken ? (
                <>
                  <a
                    href={`/track-record/${trackRecordToken}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-medium text-[#818CF8] hover:text-white transition-colors"
                  >
                    View Track Record ↗
                  </a>
                  <button
                    onClick={handleCopyTrackRecordUrl}
                    className="text-[10px] text-[#818CF8] hover:text-white transition-colors"
                  >
                    {trackRecordCopied ? "✓ Copied" : "Copy link"}
                  </button>
                  <a
                    href={`https://x.com/intent/tweet?text=${encodeURIComponent("Verified live account track record monitored by AlgoStudio.")}&url=${encodeURIComponent(`${typeof window !== "undefined" ? window.location.origin : ""}/track-record/${trackRecordToken}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-[#818CF8] hover:text-white transition-colors"
                  >
                    Share on X
                  </a>
                  <button
                    onClick={() => handleTrackRecordAction("unpublish")}
                    disabled={trackRecordLoading}
                    className="text-[10px] text-[#64748B] hover:text-[#EF4444] transition-colors disabled:opacity-50"
                  >
                    Unpublish
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleTrackRecordAction("publish")}
                  disabled={trackRecordLoading}
                  className="text-[10px] font-medium text-[#818CF8] hover:text-white transition-colors disabled:opacity-50"
                >
                  {trackRecordLoading ? "Sharing..." : "Share Track Record"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Expand strategies toggle */}
      <div className="mt-4 border-t border-[rgba(79,70,229,0.1)] pt-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-xs font-medium text-[#A78BFA] hover:text-white transition-colors"
        >
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Show strategies ({strategyGroups.length})
        </button>

        {expanded && (
          <div className="mt-3 space-y-1">
            {strategyGroups.length === 0 ? (
              <div className="px-3 py-3">
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 w-2 h-2 rounded-full bg-[#10B981] animate-pulse flex-shrink-0" />
                  <div>
                    <p className="text-xs text-[#CBD5E1] font-medium">Awaiting first trade...</p>
                    <p className="text-[11px] text-[#64748B] mt-0.5 leading-relaxed">
                      Your Monitor EA is connected and listening for trades. Once your EA opens and
                      closes a trade, the strategy will appear here automatically. You can then link
                      a baseline to activate edge monitoring.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Header row */}
                <div className="grid grid-cols-[1fr_90px_80px_70px_70px_70px_90px_100px] gap-2 px-3 py-1.5 text-[9px] uppercase tracking-wider text-[#64748B]">
                  <span>Strategy</span>
                  <span>Health</span>
                  <span className="text-right">P&L</span>
                  <span className="text-right">Trades</span>
                  <span className="text-right">Win Rate</span>
                  <span className="text-right">PF</span>
                  <span className="text-right">Last Trade</span>
                  <span className="text-right">Baseline</span>
                </div>
                {/* Strategy rows */}
                {strategyGroups.map((sg) => {
                  const pnl = sg.trades.reduce((s, t) => s + t.profit, 0);
                  const wr = calculateWinRate(sg.trades);
                  const pf = calculateProfitFactor(sg.trades);
                  const lastTrade = sg.trades
                    .map((t) => t.closeTime)
                    .filter(Boolean)
                    .sort()
                    .pop();
                  // Find matching deployment for baseline status
                  const allDeployments = instances.flatMap((ea) => ea.deployments ?? []);
                  const deployment = allDeployments.find(
                    (d) =>
                      d.symbol.toUpperCase() === sg.symbol.toUpperCase() &&
                      (sg.magicNumber === null || d.magicNumber === sg.magicNumber)
                  );
                  const isLinked = deployment?.baselineStatus === "LINKED";
                  // Resolve health badge from owning instance
                  const owningInstance = sg.instanceId
                    ? instances.find((ea) => ea.id === sg.instanceId)
                    : undefined;
                  const health = deriveStrategyHealth(owningInstance);
                  const hs = HEALTH_STYLES[health];
                  const rowKey = `${sg.symbol}|${sg.magicNumber ?? "none"}`;
                  const isExpanded = expandedStrategyKey === rowKey;
                  return (
                    <div key={rowKey}>
                      <div
                        onClick={() => setExpandedStrategyKey(isExpanded ? null : rowKey)}
                        className={`grid grid-cols-[1fr_90px_80px_70px_70px_70px_90px_100px] gap-2 px-3 py-2 rounded-lg bg-[#0A0118]/50 border cursor-pointer transition-colors ${
                          isExpanded
                            ? "border-[rgba(79,70,229,0.4)] bg-[#0A0118]/80"
                            : "border-[rgba(79,70,229,0.08)] hover:border-[rgba(79,70,229,0.2)]"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-[#CBD5E1] truncate">
                            {sg.symbol}
                            {sg.magicNumber != null && (
                              <span className="text-[#64748B] font-normal">
                                {" "}
                                · Magic {sg.magicNumber}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="self-center">
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${hs.bg} ${hs.text}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${hs.dot}`} />
                            {health}
                          </span>
                        </div>
                        <p
                          className={`text-xs font-medium text-right self-center ${
                            pnl >= 0 ? "text-[#10B981]" : "text-[#EF4444]"
                          }`}
                        >
                          {formatCurrency(pnl)}
                        </p>
                        <p className="text-xs text-[#CBD5E1] text-right self-center">
                          {sg.trades.length >= 1000 ? "1000+" : sg.trades.length}
                        </p>
                        <p className="text-xs text-[#CBD5E1] text-right self-center">
                          {wr.toFixed(1)}%
                        </p>
                        <p className="text-xs text-[#CBD5E1] text-right self-center">
                          {pf === Infinity ? "∞" : pf.toFixed(2)}
                        </p>
                        <p className="text-[10px] text-[#7C8DB0] text-right self-center">
                          {lastTrade ? formatRelativeTime(lastTrade) : "—"}
                        </p>
                        <div className="flex items-center justify-end self-center">
                          {isLinked ? (
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#10B981]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                                Linked
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUnlinkBaseline(primary.id, deployment!.id);
                                }}
                                className="text-[10px] text-[#64748B] hover:text-[#EF4444] transition-colors"
                                title="Unlink baseline"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onLinkBaseline(primary.id);
                              }}
                              className="text-[10px] font-medium text-[#818CF8] hover:text-white transition-colors"
                            >
                              Link
                            </button>
                          )}
                        </div>
                      </div>
                      {isExpanded && owningInstance && (
                        <InvestigationPanel
                          instance={owningInstance}
                          trades={sg.trades}
                          health={health}
                          isLinked={isLinked}
                        />
                      )}
                      {isExpanded && !owningInstance && (
                        <div className="ml-3 mr-3 mb-1 px-4 py-3 rounded-b-lg bg-[#0A0118]/60 border border-t-0 border-[rgba(79,70,229,0.15)] text-[11px] text-[#64748B]">
                          No instance data available for investigation.
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// EA CARD
// ============================================

function EACard({
  ea,
  statusChanged,
  onTogglePause,
  onDelete,
  onLinkBaseline,
}: {
  ea: EAInstanceData;
  statusChanged: boolean;
  onTogglePause: (instanceId: string, tradingState: "TRADING" | "PAUSED") => void;
  onDelete: (instanceId: string) => void;
  onLinkBaseline?: (instanceId: string) => void;
}) {
  const [showTradeLog, setShowTradeLog] = useState(false);
  const [showTrackRecord, setShowTrackRecord] = useState(false);
  const [showHealth, setShowHealth] = useState(false);
  const [showProof, setShowProof] = useState(false);
  const [pauseLoading, setPauseLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [haltState, setHaltState] = useState(ea.operatorHold ?? "NONE");
  const [haltLoading, setHaltLoading] = useState(false);
  const [showHaltConfirm, setShowHaltConfirm] = useState(false);
  const trades = ea.trades ?? [];
  const heartbeats = ea.heartbeats ?? [];
  const winRate = calculateWinRate(trades);
  const profitFactor = calculateProfitFactor(trades);
  const closedCount = ea.totalTrades;
  const isEdgeAtRisk = ea.lifecycleState === "EDGE_AT_RISK" || ea.healthStatus === "DEGRADED";

  async function handleTogglePause(): Promise<void> {
    setPauseLoading(true);
    onTogglePause(ea.id, ea.tradingState === "TRADING" ? "PAUSED" : "TRADING");
    setPauseLoading(false);
  }

  async function handleDelete(): Promise<void> {
    setDeleteLoading(true);
    onDelete(ea.id);
  }

  function handleToggleHalt(): void {
    if (haltState === "HALTED") {
      executeHalt("NONE");
    } else {
      setShowHaltConfirm(true);
    }
  }

  async function executeHalt(target: "HALTED" | "NONE"): Promise<void> {
    setShowHaltConfirm(false);
    setHaltLoading(true);
    const result = await updateOperatorHold(ea.id, target);
    if (result.ok) {
      setHaltState(target);
    }
    setHaltLoading(false);
  }

  return (
    <div
      id={`ea-card-${ea.id}`}
      className={`bg-[#1A0626] border rounded-xl p-6 transition-all duration-500 hover:shadow-[0_4px_24px_rgba(79,70,229,0.15)] ${
        statusChanged
          ? "border-[#A78BFA] shadow-[0_0_20px_rgba(167,139,250,0.2)]"
          : "border-[rgba(79,70,229,0.2)] hover:border-[rgba(79,70,229,0.4)]"
      } ${ea.mode === "PAPER" ? "border-l-2 border-l-[#F59E0B]" : ""}`}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-white truncate" title={ea.eaName}>
            {ea.eaName}
          </h3>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-[#7C8DB0]">
            {ea.symbol ? (
              <span>{ea.symbol}</span>
            ) : (
              <span className="text-[#7C8DB0]/70 italic">Account-wide (portfolio mode)</span>
            )}
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
        <div className="flex items-center gap-2">
          <StatusBadge status={ea.status} animate={statusChanged} />
          {ea.strategyStatus && (
            <StrategyStatusBadge status={ea.strategyStatus as StrategyStatus} variant="compact" />
          )}
          {(() => {
            const execState =
              haltState === "HALTED" ? "HALTED" : ea.tradingState === "PAUSED" ? "PAUSED" : "RUN";
            const execColor =
              execState === "HALTED" ? "#EF4444" : execState === "PAUSED" ? "#F59E0B" : "#10B981";
            const execBg =
              execState === "HALTED" ? "#EF4444" : execState === "PAUSED" ? "#F59E0B" : "#10B981";
            return (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-medium rounded-full"
                style={{
                  backgroundColor: `${execBg}20`,
                  color: execColor,
                  border: `1px solid ${execBg}4D`,
                }}
              >
                {execState}
              </span>
            );
          })()}
          {ea.mode === "PAPER" && (
            <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30">
              Paper
            </span>
          )}
          {(() => {
            const trust = resolveInstanceBaselineTrust({
              hasBaseline: !!ea.baseline,
              relinkRequired: !!ea.relinkRequired,
            });
            const bgMap = { VERIFIED: "#4F46E5", SUSPENDED: "#F59E0B", MISSING: "#64748B" };
            const bg = bgMap[trust.state];
            return (
              <span
                className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full"
                style={{
                  backgroundColor: `${bg}33`,
                  color: trust.color,
                  borderWidth: 1,
                  borderColor: `${bg}4D`,
                }}
                title={
                  trust.state === "VERIFIED" && ea.baseline
                    ? `Baseline: WR ${(ea.baseline.winRate ?? 0).toFixed(1)}% | PF ${(ea.baseline.profitFactor ?? 0).toFixed(2)} | ${ea.baseline.totalTrades} trades`
                    : undefined
                }
              >
                Baseline {trust.label.toLowerCase()}
              </span>
            );
          })()}
          {/* Auto-discovered strategy badge */}
          {ea.isAutoDiscovered && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-[#8B5CF6]/20 text-[#A78BFA] border border-[#8B5CF6]/30">
              Discovered
            </span>
          )}
        </div>
      </div>

      {/* Status Detail Box — compact interpretation aid for non-healthy instances */}
      {/* Skipped for SUSPENDED (the relink warning below already covers that case) */}
      {(() => {
        const attention = resolveInstanceAttention(ea, formatMonitoringReasons);
        if (!attention || attention.statusLabel === "Baseline suspended") return null;
        return (
          <div
            className="mb-4 rounded-lg p-3 flex items-start gap-3"
            style={{
              backgroundColor: `${attention.color}08`,
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: `${attention.color}20`,
            }}
          >
            <span
              className="mt-1 w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: attention.color }}
            />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium" style={{ color: attention.color }}>
                {attention.statusLabel}
              </p>
              <p className="text-[10px] text-[#94A3B8] mt-0.5 leading-relaxed">
                {attention.reason}
              </p>
              <p className="text-[10px] mt-1" style={{ color: `${attention.color}CC` }}>
                → {attention.actionLabel}
              </p>
            </div>
          </div>
        );
      })()}

      {/* Relink required warning */}
      {ea.relinkRequired && (
        <div className="mb-4 rounded-lg bg-[#F59E0B]/[0.06] border border-[#F59E0B]/20 p-4">
          <div className="flex items-start gap-3">
            <svg
              className="w-4 h-4 text-[#F59E0B] flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[#F59E0B] mb-1">
                Material configuration change detected — baseline trust suspended
              </p>
              <p className="text-[11px] text-[#94A3B8] leading-relaxed mb-3">
                Monitoring is running without a trusted baseline. Governance may emit NO_BASELINE
                until a replacement baseline is linked.
              </p>
              {onLinkBaseline && (
                <button
                  onClick={() => onLinkBaseline(ea.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30 hover:bg-[#F59E0B]/30 transition-colors"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                    />
                  </svg>
                  Restore baseline trust
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Baseline Snapshot — only when trusted */}
      {!ea.relinkRequired && ea.baseline && (
        <div className="mb-4 rounded-lg bg-[#0A0118]/50 border border-[rgba(79,70,229,0.12)] p-3">
          <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">
            Baseline Snapshot
          </p>
          <p className="text-[10px] text-[#64748B] mb-2">
            Reference metrics for trusted live monitoring.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <p className="text-[10px] text-[#64748B]">Trades</p>
              <p className="text-xs font-medium text-[#CBD5E1]">{ea.baseline.totalTrades}</p>
            </div>
            <div>
              <p className="text-[10px] text-[#64748B]">Profit Factor</p>
              <p className="text-xs font-medium text-[#CBD5E1]">
                {(ea.baseline.profitFactor ?? 0).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-[#64748B]">Max Drawdown</p>
              <p className="text-xs font-medium text-[#CBD5E1]">
                {(ea.baseline.maxDrawdownPct ?? 0).toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-[10px] text-[#64748B]">Sharpe</p>
              <p className="text-xs font-medium text-[#CBD5E1]">
                {(ea.baseline.sharpeRatio ?? 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Why At Risk — only when degraded/unstable with active reasons */}
      {(ea.strategyStatus === "EDGE_DEGRADED" || ea.strategyStatus === "UNSTABLE") &&
        ea.monitoringReasons &&
        ea.monitoringReasons.length > 0 && (
          <div className="mb-4 rounded-lg bg-[#EF4444]/[0.04] border border-[#EF4444]/15 p-3">
            <p className="text-[10px] uppercase tracking-wider text-[#EF4444] mb-1.5">
              Why At Risk
            </p>
            <ul className="space-y-1">
              {formatMonitoringReasons(ea.monitoringReasons).map((reason) => (
                <li key={reason} className="flex items-start gap-1.5 text-[11px] text-[#CBD5E1]">
                  <span className="mt-1 w-1 h-1 rounded-full bg-[#EF4444] shrink-0" />
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        )}

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
        <MiniEquityChart heartbeats={ea.heartbeats ?? []} />
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
          <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">Edge Status</p>
          <p
            className={`text-sm font-medium ${isEdgeAtRisk ? "text-[#EF4444]" : "text-[#10B981]"}`}
          >
            {isEdgeAtRisk ? "At Risk" : "Healthy"}
          </p>
        </div>
      </div>

      {/* Slippage info (estimated from trade data) */}
      {(() => {
        const closedTrades = (ea.trades ?? []).filter((t) => t.closeTime !== null);
        if (closedTrades.length < 5) return null;
        // Estimate average absolute profit deviation as a proxy for slippage awareness
        const avgProfit =
          closedTrades.reduce((s, t) => s + Math.abs(t.profit), 0) / closedTrades.length;
        const variance =
          closedTrades.reduce((s, t) => s + Math.pow(Math.abs(t.profit) - avgProfit, 2), 0) /
          closedTrades.length;
        const stdDev = Math.sqrt(variance);
        return (
          <div
            className="flex items-center gap-2 mt-2 text-[10px] text-[#7C8DB0]"
            title="Estimated from trade profit variance. High variance may indicate significant slippage."
          >
            <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>P/L Std Dev: {formatCurrency(stdDev)} (higher values may indicate slippage)</span>
          </div>
        );
      })()}

      {/* Controls Row */}
      <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-[rgba(79,70,229,0.1)]">
        {/* Suppress pause/halt for DRAFT strategies — governance already returns PAUSE */}
        {ea.lifecycleState !== "DRAFT" && (
          <>
            <button
              onClick={handleTogglePause}
              disabled={pauseLoading}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
                ea.tradingState === "PAUSED"
                  ? "bg-[#10B981]/20 text-[#10B981] border-[#10B981]/30 hover:bg-[#10B981]/30"
                  : "bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/30 hover:bg-[#F59E0B]/30"
              } disabled:opacity-50`}
            >
              {ea.tradingState === "PAUSED" ? (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              )}
              {ea.tradingState === "PAUSED" ? "Resume Strategy" : "Pause Strategy"}
            </button>

            <button
              onClick={handleToggleHalt}
              disabled={haltLoading || haltState === "OVERRIDE_PENDING"}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 disabled:opacity-50 ${
                haltState === "HALTED"
                  ? "bg-[#10B981]/20 text-[#10B981] border-[#10B981]/30 hover:bg-[#10B981]/30"
                  : "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/25 hover:bg-[#EF4444]/20"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={
                    haltState === "HALTED"
                      ? "M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                      : "M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                  }
                />
              </svg>
              {haltLoading ? "…" : haltState === "HALTED" ? "Resume Trading" : "Emergency Halt"}
            </button>
          </>
        )}

        <button
          onClick={() => setShowTradeLog(!showTradeLog)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[rgba(79,70,229,0.2)] text-[#7C8DB0] hover:text-white hover:border-[rgba(79,70,229,0.4)] transition-all duration-200"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          {showTradeLog ? "Hide Trades" : "Trade Log"}
        </button>

        <button
          onClick={() => setShowTrackRecord(!showTrackRecord)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
            showTrackRecord
              ? "bg-[#22D3EE]/20 text-[#22D3EE] border-[#22D3EE]/30"
              : "border-[rgba(79,70,229,0.2)] text-[#7C8DB0] hover:text-white hover:border-[rgba(79,70,229,0.4)]"
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          {showTrackRecord ? "Hide Record" : "Track Record"}
        </button>

        <button
          onClick={() => setShowHealth(!showHealth)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
            showHealth
              ? "bg-[#10B981]/20 text-[#10B981] border-[#10B981]/30"
              : "border-[rgba(79,70,229,0.2)] text-[#7C8DB0] hover:text-white hover:border-[rgba(79,70,229,0.4)]"
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          {showHealth ? "Hide Health" : "Health"}
        </button>

        <button
          onClick={() => setShowProof(!showProof)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
            showProof
              ? "bg-[#A78BFA]/20 text-[#A78BFA] border-[#A78BFA]/30"
              : "border-[rgba(79,70,229,0.2)] text-[#7C8DB0] hover:text-white hover:border-[rgba(79,70,229,0.4)]"
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          {showProof ? "Hide Proof" : "Proof"}
        </button>

        {ea.isAutoDiscovered && onLinkBaseline ? (
          <button
            onClick={() => onLinkBaseline(ea.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#8B5CF6]/40 text-[#A78BFA] hover:bg-[#8B5CF6]/20 hover:border-[#8B5CF6]/60 transition-all duration-200"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
            Link &amp; Activate
          </button>
        ) : ea.isExternal && !ea.baseline && !ea.relinkRequired && onLinkBaseline ? (
          <button
            onClick={() => onLinkBaseline(ea.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[rgba(79,70,229,0.3)] text-[#818CF8] hover:bg-[#4F46E5]/20 hover:border-[#4F46E5]/50 transition-all duration-200"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
            Link baseline
          </button>
        ) : null}

        <div className="flex-1 min-w-0" />

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-[#7C8DB0] whitespace-nowrap">
            Last heartbeat: {formatRelativeTime(ea.lastHeartbeat)}
          </span>

          {/* Delete button */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[rgba(239,68,68,0.2)] text-[#7C8DB0] hover:text-[#EF4444] hover:border-[#EF4444]/40 transition-all duration-200"
            title="Delete this EA instance"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Delete
          </button>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="mt-3 p-4 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/20">
          <p className="text-sm text-[#EF4444] font-medium mb-1">
            Delete &ldquo;{ea.eaName}&rdquo;?
          </p>
          <p className="text-xs text-[#7C8DB0] mb-3">
            This will remove the EA instance and all its data from your dashboard. This action
            cannot be undone.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              disabled={deleteLoading}
              className="px-4 py-1.5 rounded-lg text-xs font-medium text-white bg-[#EF4444] hover:bg-[#DC2626] transition-all duration-200 disabled:opacity-50"
            >
              {deleteLoading ? "Deleting..." : "Yes, delete"}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-4 py-1.5 rounded-lg text-xs font-medium text-[#7C8DB0] border border-[rgba(79,70,229,0.2)] hover:text-white transition-all duration-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showHaltConfirm && (
        <div className="mt-3 p-4 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/20">
          <p className="text-sm text-[#EF4444] font-medium mb-1">Emergency Halt</p>
          <p className="text-xs text-[#CBD5E1] mb-1">
            This will block AlgoStudio from approving trades for this strategy.
          </p>
          <p className="text-xs text-[#7C8DB0] mb-3">
            Trading on the terminal will not be automatically stopped.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => executeHalt("HALTED")}
              className="px-4 py-1.5 rounded-lg text-xs font-medium text-white bg-[#EF4444] hover:bg-[#DC2626] transition-all duration-200"
            >
              Emergency Halt
            </button>
            <button
              onClick={() => setShowHaltConfirm(false)}
              className="px-4 py-1.5 rounded-lg text-xs font-medium text-[#7C8DB0] border border-[rgba(79,70,229,0.2)] hover:text-white transition-all duration-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Error display */}
      {ea.lastError && ea.status === "ERROR" && (
        <div className="mt-2">
          <span className="text-xs text-[#EF4444] truncate block max-w-full" title={ea.lastError}>
            {ea.lastError}
          </span>
        </div>
      )}

      {/* Trade Log (expandable) */}
      {showTradeLog && <TradeLogPanel instanceId={ea.id} eaName={ea.eaName} />}

      {/* Track Record (expandable) */}
      {showTrackRecord && <TrackRecordPanel instanceId={ea.id} eaName={ea.eaName} />}

      {/* Health Detail (expandable) */}
      {showHealth && (
        <HealthDetailPanel
          instanceId={ea.id}
          strategyStatus={(ea.strategyStatus as StrategyStatus) ?? null}
        />
      )}

      {/* Proof Panel (expandable) */}
      {showProof && <ProofPanel instanceId={ea.id} />}
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

const CONNECTION_STATUS_CONFIG: Record<
  ConnectionStatus,
  { color: string; label: string; ping: boolean }
> = {
  connecting: { color: "#F59E0B", label: "Connecting", ping: false },
  connected: { color: "#10B981", label: "Receiving", ping: true },
  "fallback-polling": { color: "#3B82F6", label: "Last update", ping: false },
  disconnected: { color: "#EF4444", label: "Disconnected", ping: false },
};

function ConnectionIndicator({
  connectionStatus,
  lastUpdated,
}: {
  connectionStatus: ConnectionStatus;
  lastUpdated: Date | null;
}) {
  const [timeSinceUpdate, setTimeSinceUpdate] = useState(() => computeTimeLabel(lastUpdated));

  useEffect(() => {
    if (!lastUpdated) return;

    const interval = setInterval(() => {
      setTimeSinceUpdate(computeTimeLabel(lastUpdated));
    }, 1000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  const config = CONNECTION_STATUS_CONFIG[connectionStatus];

  return (
    <div className="flex items-center gap-2 text-xs text-[#7C8DB0]">
      <span className="relative flex h-2.5 w-2.5">
        {config.ping && (
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ backgroundColor: config.color }}
          />
        )}
        <span
          className="relative inline-flex rounded-full h-2.5 w-2.5"
          style={{ backgroundColor: config.color }}
        />
      </span>
      <span>
        {config.label}
        {lastUpdated ? ` · ${timeSinceUpdate}` : ""}
      </span>
    </div>
  );
}

// ============================================
// SUMMARY CARD
// ============================================

function SummaryCard({
  label,
  subtitle,
  value,
  isCurrency = true,
}: {
  label: string;
  subtitle?: string;
  value: number;
  isCurrency?: boolean;
}) {
  return (
    <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-4">
      <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-1">{label}</p>
      <p
        className={`text-lg font-semibold ${isCurrency ? (value >= 0 ? "text-[#10B981]" : "text-[#EF4444]") : "text-white"}`}
      >
        {isCurrency ? formatCurrency(value) : value}
      </p>
      {subtitle && <p className="text-[9px] text-[#64748B] mt-0.5">{subtitle}</p>}
    </div>
  );
}

// ============================================
// ALERTS MODAL
// ============================================

function AlertsModal({ instances, onClose }: { instances: EAInstanceData[]; onClose: () => void }) {
  const [alerts, setAlerts] = useState<AlertConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New alert form state
  const [newAlertType, setNewAlertType] = useState("DRAWDOWN");
  const [newThreshold, setNewThreshold] = useState("5");
  const [newChannel, setNewChannel] = useState("EMAIL");
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [newInstanceId, setNewInstanceId] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await fetch("/api/live/alerts");
      if (!cancelled && res.ok) {
        const json = await res.json();
        setAlerts(json.data);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreateAlert(): Promise<void> {
    setSaving(true);
    const body: Record<string, unknown> = {
      alertType: newAlertType,
      channel: newChannel,
      alertState: "ACTIVE" as const,
    };

    if (newInstanceId) {
      body.instanceId = newInstanceId;
    }

    if (["DRAWDOWN", "DAILY_LOSS", "WEEKLY_LOSS", "EQUITY_TARGET"].includes(newAlertType)) {
      const threshold = parseFloat(newThreshold);
      if (isNaN(threshold) || threshold <= 0) {
        showError("Invalid threshold", "Please enter a valid threshold value.");
        setSaving(false);
        return;
      }
      body.threshold = threshold;
    }

    if (newChannel === "WEBHOOK") {
      if (!newWebhookUrl) {
        showError("Missing webhook URL", "Please enter a webhook URL.");
        setSaving(false);
        return;
      }
      body.webhookUrl = newWebhookUrl;
    }

    const res = await fetch("/api/live/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      showSuccess("Alert created");
      // Refresh alerts list
      const refreshRes = await fetch("/api/live/alerts");
      if (refreshRes.ok) {
        const refreshJson = await refreshRes.json();
        setAlerts(refreshJson.data);
      }
      // Reset form
      setNewAlertType("DRAWDOWN");
      setNewThreshold("5");
      setNewChannel("EMAIL");
      setNewWebhookUrl("");
      setNewInstanceId("");
    } else {
      const json = await res.json().catch(() => ({ error: "Failed to create alert" }));
      showError("Failed to create alert", json.error);
    }
    setSaving(false);
  }

  async function handleToggleAlert(
    alertId: string,
    alertState: "ACTIVE" | "DISABLED"
  ): Promise<void> {
    const res = await fetch("/api/live/alerts", {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
      body: JSON.stringify({ id: alertId, alertState }),
    });
    if (res.ok) {
      setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, alertState } : a)));
    }
  }

  async function handleDeleteAlert(alertId: string): Promise<void> {
    const res = await fetch("/api/live/alerts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
      body: JSON.stringify({ id: alertId }),
    });
    if (res.ok) {
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      showSuccess("Alert deleted");
    }
  }

  const needsThreshold = ["DRAWDOWN", "DAILY_LOSS", "WEEKLY_LOSS", "EQUITY_TARGET"].includes(
    newAlertType
  );
  const needsWebhook = newChannel === "WEBHOOK";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.3)] rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[rgba(79,70,229,0.15)]">
          <h2 className="text-lg font-semibold text-white">Alert Configuration</h2>
          <button onClick={onClose} className="text-[#7C8DB0] hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Create New Alert */}
        <div className="p-6 border-b border-[rgba(79,70,229,0.15)]">
          <h3 className="text-sm font-medium text-[#CBD5E1] mb-4">Create New Alert</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Alert Type */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-1">
                Alert Type
              </label>
              <select
                value={newAlertType}
                onChange={(e) => setNewAlertType(e.target.value)}
                className="w-full rounded-lg bg-[#0A0118] border border-[rgba(79,70,229,0.2)] text-[#CBD5E1] px-3 py-2 text-xs focus:outline-none focus:border-[#4F46E5]"
              >
                <option value="DRAWDOWN">Floating Drawdown</option>
                <option value="OFFLINE">EA Offline</option>
                <option value="NEW_TRADE">New Trade</option>
                <option value="ERROR">EA Error</option>
                <option value="DAILY_LOSS">Daily Loss Limit</option>
                <option value="WEEKLY_LOSS">Weekly Loss Limit</option>
                <option value="EQUITY_TARGET">Equity Target</option>
              </select>
            </div>

            {/* Instance Scope */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-1">
                Applies To
              </label>
              <select
                value={newInstanceId}
                onChange={(e) => setNewInstanceId(e.target.value)}
                className="w-full rounded-lg bg-[#0A0118] border border-[rgba(79,70,229,0.2)] text-[#CBD5E1] px-3 py-2 text-xs focus:outline-none focus:border-[#4F46E5]"
              >
                <option value="">All Instances</option>
                {instances.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.eaName}
                  </option>
                ))}
              </select>
            </div>

            {/* Threshold (conditional) */}
            {needsThreshold && (
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-1">
                  Threshold (%)
                </label>
                <input
                  type="number"
                  value={newThreshold}
                  onChange={(e) => setNewThreshold(e.target.value)}
                  min="0.1"
                  max="100"
                  step="0.1"
                  className="w-full rounded-lg bg-[#0A0118] border border-[rgba(79,70,229,0.2)] text-[#CBD5E1] px-3 py-2 text-xs focus:outline-none focus:border-[#4F46E5]"
                  placeholder="5.0"
                />
              </div>
            )}

            {/* Channel */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-1">
                Channel
              </label>
              <select
                value={newChannel}
                onChange={(e) => setNewChannel(e.target.value)}
                className="w-full rounded-lg bg-[#0A0118] border border-[rgba(79,70,229,0.2)] text-[#CBD5E1] px-3 py-2 text-xs focus:outline-none focus:border-[#4F46E5]"
              >
                <option value="EMAIL">Email</option>
                <option value="WEBHOOK">Webhook</option>
                <option value="BROWSER_PUSH">Browser Push</option>
              </select>
            </div>

            {/* Webhook URL (conditional) */}
            {needsWebhook && (
              <div className="sm:col-span-2">
                <label className="block text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-1">
                  Webhook URL
                </label>
                <input
                  type="url"
                  value={newWebhookUrl}
                  onChange={(e) => setNewWebhookUrl(e.target.value)}
                  className="w-full rounded-lg bg-[#0A0118] border border-[rgba(79,70,229,0.2)] text-[#CBD5E1] px-3 py-2 text-xs focus:outline-none focus:border-[#4F46E5]"
                  placeholder="https://hooks.example.com/alert"
                />
              </div>
            )}
          </div>

          <button
            onClick={handleCreateAlert}
            disabled={saving}
            className="mt-4 px-4 py-2 rounded-lg text-xs font-medium text-white bg-[#4F46E5] hover:bg-[#6366F1] transition-all duration-200 disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Alert"}
          </button>
        </div>

        {/* Existing Alerts */}
        <div className="p-6">
          <h3 className="text-sm font-medium text-[#CBD5E1] mb-4">Active Alerts</h3>

          {loading ? (
            <div className="text-xs text-[#7C8DB0] py-4 text-center">Loading alerts...</div>
          ) : alerts.length === 0 ? (
            <div className="text-xs text-[#7C8DB0] py-4 text-center">
              No alerts configured yet. Create one above to get started.
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-200 ${
                    alert.alertState === "ACTIVE"
                      ? "bg-[rgba(79,70,229,0.05)] border-[rgba(79,70,229,0.15)]"
                      : "bg-[#0A0118]/50 border-[rgba(79,70,229,0.08)] opacity-60"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-[#CBD5E1]">
                        {ALERT_TYPE_LABELS[alert.alertType] ?? alert.alertType}
                      </span>
                      {alert.threshold !== null && (
                        <span className="text-[10px] text-[#A78BFA]">at {alert.threshold}%</span>
                      )}
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(79,70,229,0.1)] text-[#7C8DB0]">
                        {alert.channel}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-[#7C8DB0]">
                        {alert.instanceName ?? "All instances"}
                      </span>
                      {alert.lastTriggered && (
                        <span className="text-[10px] text-[#7C8DB0]">
                          Last triggered: {formatRelativeTime(alert.lastTriggered)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <button
                      onClick={() =>
                        handleToggleAlert(
                          alert.id,
                          alert.alertState === "ACTIVE" ? "DISABLED" : "ACTIVE"
                        )
                      }
                      className={`relative w-8 h-4 rounded-full transition-colors duration-200 ${
                        alert.alertState === "ACTIVE" ? "bg-[#10B981]" : "bg-[#374151]"
                      }`}
                      title={alert.alertState === "ACTIVE" ? "Disable" : "Enable"}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform duration-200 ${
                          alert.alertState === "ACTIVE" ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                    <button
                      onClick={() => handleDeleteAlert(alert.id)}
                      className="text-[#7C8DB0] hover:text-[#EF4444] transition-colors"
                      title="Delete alert"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function LiveDashboardClient({
  initialData,
  tier,
  initialRelinkInstanceId,
}: LiveDashboardClientProps) {
  const [eaInstances, setEaInstances] = useState<EAInstanceData[]>(initialData);
  const [soundAlerts, setSoundAlerts] = useState(false);
  const [changedIds, setChangedIds] = useState<Set<string>>(new Set());
  const [modeFilter, setModeFilter] = useState<"ALL" | "LIVE" | "PAPER">("ALL");
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [linkBaselineInstanceId, setLinkBaselineInstanceId] = useState<string | null>(() => {
    // Auto-open LinkBaselineDialog from ?relink= query param
    if (initialRelinkInstanceId && initialData.some((ea) => ea.id === initialRelinkInstanceId)) {
      return initialRelinkInstanceId;
    }
    return null;
  });

  // Clean up ?relink= from URL after initial render
  const relinkCleanedRef = useRef(false);
  useEffect(() => {
    if (initialRelinkInstanceId && !relinkCleanedRef.current) {
      relinkCleanedRef.current = true;
      const url = new URL(window.location.href);
      if (url.searchParams.has("relink")) {
        url.searchParams.delete("relink");
        window.history.replaceState({}, "", url.pathname + url.search);
      }
    }
  }, [initialRelinkInstanceId]);
  const [globalDrawdownThreshold, setGlobalDrawdownThreshold] = useState("10");
  const previousDataRef = useRef<Map<string, EAInstanceData>>(new Map());
  const changedTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const soundAlertsRef = useRef(soundAlerts);
  useEffect(() => {
    soundAlertsRef.current = soundAlerts;
  }, [soundAlerts]);

  // Clean up changed-ids highlight timeout on unmount
  useEffect(() => {
    return () => {
      if (changedTimeoutRef.current) clearTimeout(changedTimeoutRef.current);
    };
  }, []);

  // Initialize previous data
  useEffect(() => {
    const map = new Map<string, EAInstanceData>();
    initialData.forEach((ea) => map.set(ea.id, ea));
    previousDataRef.current = map;
  }, [initialData]);

  // Process incoming data (shared by SSE and polling)
  const processUpdate = useCallback((newInstances: EAInstanceData[]) => {
    const changed = new Set<string>();
    const previousMap = previousDataRef.current;

    for (const ea of newInstances) {
      const prev = previousMap.get(ea.id);
      if (!prev) {
        changed.add(ea.id);
        continue;
      }

      if (prev.status !== ea.status) {
        changed.add(ea.id);
        if (soundAlertsRef.current) {
          showInfo(
            `${ea.eaName} is now ${ea.status}`,
            `Status changed from ${prev.status} to ${ea.status}`
          );
        }
      }

      if (ea.totalTrades > prev.totalTrades && soundAlertsRef.current) {
        showInfo(`New trade on ${ea.eaName}`, `Total trades: ${ea.totalTrades}`);
      }
    }

    const newMap = new Map<string, EAInstanceData>();
    newInstances.forEach((ea) => newMap.set(ea.id, ea));
    previousDataRef.current = newMap;

    setEaInstances(newInstances);
    setChangedIds(changed);

    if (changed.size > 0) {
      if (changedTimeoutRef.current) clearTimeout(changedTimeoutRef.current);
      changedTimeoutRef.current = setTimeout(() => setChangedIds(new Set()), 2000);
    }
  }, []);

  // SSE live stream with polling fallback
  const { status: connectionStatus, lastUpdated } = useLiveStream({
    onInit: (data) => {
      processUpdate(data as EAInstanceData[]);
    },
    onHeartbeat: (data) => {
      const hb = data as { instanceId: string; equity: number; balance: number; status: string };
      setEaInstances((prev) =>
        prev.map((ea) =>
          ea.id === hb.instanceId
            ? {
                ...ea,
                equity: hb.equity,
                balance: hb.balance,
                status: hb.status as EAInstanceData["status"],
              }
            : ea
        )
      );
    },
    onTrade: (data) => {
      const trade = data as { instanceId: string; profit: number };
      if (soundAlertsRef.current) {
        const ea = previousDataRef.current.get(trade.instanceId);
        showInfo(`New trade on ${ea?.eaName ?? "EA"}`, `P/L: $${trade.profit.toFixed(2)}`);
      }
    },
    onError: () => {
      // SSE error events handled internally
    },
    pollingInterval: 10000,
    pollingUrl: "/api/live/status",
    onPollingData: (data) => {
      processUpdate(data as EAInstanceData[]);
    },
  });

  const fetchUpdate = useCallback(async () => {
    try {
      const res = await fetch("/api/live/status");
      if (!res.ok) return;
      const data = await res.json();
      processUpdate(data.data as EAInstanceData[]);
    } catch {
      // Silent fail
    }
  }, [processUpdate]);

  async function handleTogglePause(
    instanceId: string,
    tradingState: "TRADING" | "PAUSED"
  ): Promise<void> {
    const res = await fetch(`/api/live/${instanceId}/pause`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
      body: JSON.stringify({ tradingState }),
    });

    if (res.ok) {
      setEaInstances((prev) =>
        prev.map((ea) => (ea.id === instanceId ? { ...ea, tradingState } : ea))
      );
      const ea = eaInstances.find((e) => e.id === instanceId);
      const action = tradingState === "PAUSED" ? "paused" : "resumed";
      showSuccess(`${ea?.eaName ?? "EA"} ${action}`);
    } else {
      showError("Failed to update EA", "Please try again.");
    }
  }

  async function handleDelete(instanceId: string): Promise<void> {
    const ea = eaInstances.find((e) => e.id === instanceId);
    const res = await fetch(`/api/live/${instanceId}`, {
      method: "DELETE",
      headers: getCsrfHeaders(),
    });

    if (res.ok) {
      setEaInstances((prev) => prev.filter((e) => e.id !== instanceId));
      showSuccess(`${ea?.eaName ?? "EA"} deleted`);
    } else {
      showError("Failed to delete EA", "Please try again.");
    }
  }

  async function handleSaveGlobalDrawdown(): Promise<void> {
    const threshold = parseFloat(globalDrawdownThreshold);
    if (isNaN(threshold) || threshold <= 0 || threshold > 100) {
      showError("Invalid threshold", "Please enter a value between 0.1 and 100.");
      return;
    }

    // Create or update a global drawdown alert (no instanceId)
    const res = await fetch("/api/live/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
      body: JSON.stringify({
        alertType: "DRAWDOWN",
        threshold,
        channel: "EMAIL",
        alertState: "ACTIVE",
      }),
    });

    if (res.ok) {
      showSuccess("Floating drawdown alert saved", `Alert at ${threshold}% floating DD`);
    } else {
      showError("Failed to save alert");
    }
  }

  // Portfolio-level strategy health summary (excludes base/account containers)
  const portfolioHealthCounts = (() => {
    const counts: Record<StrategyHealthLabel, number> = {
      Healthy: 0,
      Elevated: 0,
      "Edge at Risk": 0,
      Pending: 0,
    };
    for (const ea of eaInstances) {
      if (!ea.symbol) continue; // skip account-wide parent containers
      counts[deriveStrategyHealth(ea)]++;
    }
    return counts;
  })();
  const portfolioHealthParts = (
    ["Edge at Risk", "Elevated", "Healthy", "Pending"] as StrategyHealthLabel[]
  ).filter((label) => portfolioHealthCounts[label] > 0);

  return (
    <div className="space-y-6">
      {/* Controls bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-white">Track Record</h2>
          <span className="text-sm text-[#7C8DB0]">
            {eaInstances.length} instance{eaInstances.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Mode filter */}
          <div className="flex items-center rounded-lg border border-[rgba(79,70,229,0.2)] overflow-hidden">
            {(["ALL", "LIVE", "PAPER"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setModeFilter(mode)}
                className={`px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                  modeFilter === mode
                    ? mode === "PAPER"
                      ? "bg-[#F59E0B]/20 text-[#F59E0B]"
                      : "bg-[#4F46E5]/20 text-[#A78BFA]"
                    : "text-[#7C8DB0] hover:text-white"
                }`}
              >
                {mode === "ALL" ? "All" : mode === "LIVE" ? "Live" : "Paper"}
              </button>
            ))}
          </div>

          {/* Connection status indicator */}
          <ConnectionIndicator connectionStatus={connectionStatus} lastUpdated={lastUpdated} />

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
            Notifications
          </button>

          {/* Alerts config button */}
          <button
            onClick={() => setShowAlertsModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[rgba(79,70,229,0.2)] text-[#7C8DB0] hover:text-[#A78BFA] hover:border-[rgba(79,70,229,0.4)] transition-all duration-200"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            Alerts
          </button>

          {/* Connect external EA */}
          <RegisterEADialog onSuccess={fetchUpdate} />

          {/* Manual refresh */}
          <button
            onClick={fetchUpdate}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#94A3B8] border border-[rgba(79,70,229,0.2)] hover:text-white hover:border-[rgba(79,70,229,0.4)] transition-all duration-200"
          >
            Refresh Now
          </button>
        </div>
      </div>

      {/* Portfolio Summary */}
      {eaInstances.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <SummaryCard
              label="Floating P&L"
              subtitle="unrealized"
              value={eaInstances
                .filter(
                  (ea) =>
                    ea.mode === "LIVE" &&
                    !ea.parentInstanceId &&
                    ea.equity != null &&
                    ea.balance != null
                )
                .reduce((sum, ea) => sum + (ea.equity! - ea.balance!), 0)}
            />
            <SummaryCard
              label="Paper P&L"
              subtitle="tracked total"
              value={eaInstances
                .filter((ea) => ea.mode === "PAPER")
                .reduce((sum, ea) => sum + ea.totalProfit, 0)}
            />
            <SummaryCard
              label="Total Trades"
              value={eaInstances.reduce((sum, ea) => sum + ea.totalTrades, 0)}
              isCurrency={false}
            />
            <SummaryCard
              label="Open Trades"
              value={eaInstances.reduce((sum, ea) => sum + ea.openTrades, 0)}
              isCurrency={false}
            />
            {/* Strategy Health Summary */}
            <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-4">
              <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-1">
                Strategy Health
              </p>
              {portfolioHealthParts.length > 0 ? (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {portfolioHealthParts.map((label) => {
                    const hs = HEALTH_STYLES[label];
                    return (
                      <span
                        key={label}
                        className={`inline-flex items-center gap-1 text-sm font-semibold ${hs.text}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${hs.dot}`} />
                        {portfolioHealthCounts[label]} {label}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm font-semibold text-[#64748B]">No strategies</p>
              )}
            </div>
          </div>

          {/* Global Floating Drawdown Alert */}
          <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2 flex-1">
                <svg
                  className="w-4 h-4 text-[#F59E0B] shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
                <p className="text-xs text-[#CBD5E1]">
                  Floating drawdown alert (current balance-equity gap, all EAs)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#7C8DB0]">Alert at</span>
                <input
                  type="number"
                  value={globalDrawdownThreshold}
                  onChange={(e) => setGlobalDrawdownThreshold(e.target.value)}
                  min="0.1"
                  max="100"
                  step="0.1"
                  className="w-20 rounded-lg bg-[#0A0118] border border-[rgba(79,70,229,0.2)] text-[#CBD5E1] px-2 py-1 text-xs text-center focus:outline-none focus:border-[#4F46E5]"
                />
                <span className="text-xs text-[#7C8DB0]">% floating DD</span>
                <button
                  onClick={handleSaveGlobalDrawdown}
                  className="px-3 py-1 rounded-lg text-xs font-medium text-white bg-[#4F46E5] hover:bg-[#6366F1] transition-all duration-200"
                >
                  Save
                </button>
              </div>
            </div>
          </div>

          {/* Per-Symbol Breakdown */}
          {(() => {
            const symbolMap = new Map<string, { pnl: number; count: number; openTrades: number }>();
            const filtered = eaInstances.filter(
              (ea) => ea.symbol && (modeFilter === "ALL" || ea.mode === modeFilter)
            );
            for (const ea of filtered) {
              const sym = ea.symbol!;
              const existing = symbolMap.get(sym) || { pnl: 0, count: 0, openTrades: 0 };
              existing.pnl += ea.totalProfit;
              existing.count += 1;
              existing.openTrades += ea.openTrades;
              symbolMap.set(sym, existing);
            }
            if (symbolMap.size <= 1) return null;
            const entries = Array.from(symbolMap.entries()).sort(
              (a, b) => Math.abs(b[1].pnl) - Math.abs(a[1].pnl)
            );
            return (
              <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-4">
                <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-3">
                  Per-Symbol Breakdown
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {entries.map(([sym, data]) => (
                    <div
                      key={sym}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-[rgba(79,70,229,0.05)] border border-[rgba(79,70,229,0.1)]"
                    >
                      <div>
                        <span className="text-xs font-medium text-[#CBD5E1]">{sym}</span>
                        <span className="text-[9px] text-[#7C8DB0] ml-1.5">
                          {data.count} EA{data.count > 1 ? "s" : ""}
                        </span>
                      </div>
                      <span
                        className={`text-xs font-semibold ${data.pnl >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}
                      >
                        {formatCurrency(data.pnl)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Edge Health Summary */}
      {eaInstances.length > 0 &&
        (() => {
          let healthy = 0;
          let attention = 0;
          let monitoring = 0;
          let paused = 0;

          for (const ea of eaInstances) {
            if (ea.tradingState === "PAUSED") {
              paused++;
              continue;
            }
            const att = resolveInstanceAttention(ea, formatMonitoringReasons);
            if (!att) {
              healthy++;
            } else if (att.statusLabel === "Waiting for data") {
              monitoring++;
            } else {
              attention++;
            }
          }

          const cats = [
            { label: "Healthy", count: healthy, color: "#10B981" },
            { label: "Attention", count: attention, color: "#F59E0B" },
            { label: "Collecting Data", count: monitoring, color: "#A78BFA" },
            { label: "Paused", count: paused, color: "#64748B" },
          ];

          return (
            <div className="grid grid-cols-4 gap-3 mb-4">
              {cats.map((c) => (
                <div
                  key={c.label}
                  className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-lg px-4 py-3"
                >
                  <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-1">
                    {c.label}
                  </p>
                  <p
                    className="text-lg font-semibold"
                    style={{ color: c.count > 0 ? c.color : "#3F3F46" }}
                  >
                    {c.count}
                  </p>
                </div>
              ))}
            </div>
          );
        })()}

      {/* Action Required / Edge Health Panel */}
      {(() => {
        const items = eaInstances
          .map((ea) => {
            const attention = resolveInstanceAttention(ea, formatMonitoringReasons);
            if (!attention) return null;
            const identity = [ea.symbol, ea.timeframe].filter(Boolean).join(" · ") || ea.eaName;
            const isBaselineAction =
              attention.statusLabel === "Baseline suspended" ||
              attention.statusLabel === "No baseline linked";
            return {
              id: ea.id,
              identity,
              ...attention,
              onClick: isBaselineAction
                ? () => setLinkBaselineInstanceId(ea.id)
                : () => {
                    document
                      .getElementById(`ea-card-${ea.id}`)
                      ?.scrollIntoView({ behavior: "smooth", block: "center" });
                  },
            };
          })
          .filter((item): item is NonNullable<typeof item> => item !== null);

        if (items.length === 0) return null;

        // Determine header accent: red if any critical, amber if warnings, else muted
        const hasRed = items.some((i) => i.color === "#EF4444");
        const headerColor = hasRed ? "#EF4444" : "#F59E0B";

        return (
          <div
            className="bg-[#1A0626] border rounded-xl p-4"
            style={{ borderColor: `${headerColor}33` }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: headerColor }} />
              <p className="text-xs font-semibold text-white">Action Required</p>
              <span className="text-[10px] text-[#7C8DB0]">
                {items.length} {items.length === 1 ? "instance requires" : "instances require"}{" "}
                attention
              </span>
            </div>
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-lg bg-[#0A0118]/50 border border-[rgba(79,70,229,0.1)] px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-[#CBD5E1] truncate">
                      {item.identity}
                    </p>
                    <p className="text-[10px] font-medium" style={{ color: item.color }}>
                      {item.statusLabel}
                    </p>
                    <p className="text-[10px] text-[#7C8DB0] truncate mt-0.5">{item.reason}</p>
                  </div>
                  <button
                    type="button"
                    onClick={item.onClick}
                    className="shrink-0 text-[10px] font-medium px-2.5 py-1 rounded-md border transition-colors"
                    style={{
                      color: item.color,
                      borderColor: `${item.color}4D`,
                      backgroundColor: `${item.color}15`,
                    }}
                  >
                    {item.actionLabel}
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

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
          {sortByPriority(
            groupByAccount(
              modeFilter === "ALL"
                ? eaInstances
                : eaInstances.filter((ea) => ea.mode === modeFilter)
            )
          ).map((account) => (
            <AccountCard
              key={account.key}
              account={account}
              changedIds={changedIds}
              onTogglePause={handleTogglePause}
              onDelete={handleDelete}
              onLinkBaseline={setLinkBaselineInstanceId}
            />
          ))}
        </div>
      )}

      {/* Alerts Modal */}
      {showAlertsModal && (
        <AlertsModal instances={eaInstances} onClose={() => setShowAlertsModal(false)} />
      )}

      {/* Link Baseline Dialog */}
      {linkBaselineInstanceId &&
        (() => {
          const inst = eaInstances.find((ea) => ea.id === linkBaselineInstanceId);
          const ctx: DeploymentContext | undefined = inst
            ? { symbol: inst.symbol, timeframe: inst.timeframe, eaName: inst.eaName }
            : undefined;
          return (
            <LinkBaselineDialog
              instanceId={linkBaselineInstanceId}
              instanceName={inst?.eaName ?? ""}
              isRelink={inst?.relinkRequired}
              deploymentContext={ctx}
              onClose={() => setLinkBaselineInstanceId(null)}
              onLinked={async (instanceId, baseline) => {
                // Check if this is an auto-discovered DRAFT instance — activate after linking
                const inst = eaInstances.find((ea) => ea.id === instanceId);
                if (inst?.isAutoDiscovered) {
                  try {
                    const res = await fetch(`/api/live/${instanceId}/lifecycle`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "activate" }),
                    });
                    if (res.ok) {
                      setEaInstances((prev) =>
                        prev.map((ea) =>
                          ea.id === instanceId
                            ? {
                                ...ea,
                                baseline,
                                relinkRequired: false,
                                lifecycleState: "LIVE_MONITORING",
                              }
                            : ea
                        )
                      );
                    } else {
                      // Activation failed — still update baseline state
                      setEaInstances((prev) =>
                        prev.map((ea) =>
                          ea.id === instanceId ? { ...ea, baseline, relinkRequired: false } : ea
                        )
                      );
                    }
                  } catch {
                    // Network error — still update baseline state
                    setEaInstances((prev) =>
                      prev.map((ea) =>
                        ea.id === instanceId ? { ...ea, baseline, relinkRequired: false } : ea
                      )
                    );
                  }
                } else {
                  setEaInstances((prev) =>
                    prev.map((ea) =>
                      ea.id === instanceId ? { ...ea, baseline, relinkRequired: false } : ea
                    )
                  );
                }
                setLinkBaselineInstanceId(null);
              }}
            />
          );
        })()}
    </div>
  );
}
