"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { showInfo, showSuccess, showError } from "@/lib/toast";
import { getCsrfHeaders } from "@/lib/api-client";
import { HealthBadge } from "@/components/app/health-detail-panel";
import { HealthDetailPanel } from "@/components/app/health-detail-panel";
import { ShareTrackRecordButton } from "@/components/app/share-track-record-button";
import { useLiveStream, type ConnectionStatus } from "./use-live-stream";
import { RegisterEADialog } from "./register-ea-dialog";

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
  paused: boolean;
  lastHeartbeat: string | null;
  lastError: string | null;
  balance: number | null;
  equity: number | null;
  openTrades: number;
  totalTrades: number;
  totalProfit: number;
  trades: { profit: number; closeTime: string | null }[];
  heartbeats: { equity: number; createdAt: string }[];
  healthStatus?: "HEALTHY" | "WARNING" | "DEGRADED" | "INSUFFICIENT_DATA" | null;
  healthScore?: number | null;
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
  enabled: boolean;
  lastTriggered: string | null;
  createdAt: string;
}

interface LiveDashboardClientProps {
  initialData: EAInstanceData[];
  tier?: "FREE" | "PRO" | "ELITE";
}

const ALERT_TYPE_LABELS: Record<string, string> = {
  DRAWDOWN: "Drawdown Threshold",
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
// EA CARD
// ============================================

function EACard({
  ea,
  statusChanged,
  onTogglePause,
  onDelete,
}: {
  ea: EAInstanceData;
  statusChanged: boolean;
  onTogglePause: (instanceId: string, paused: boolean) => void;
  onDelete: (instanceId: string) => void;
}) {
  const [showTradeLog, setShowTradeLog] = useState(false);
  const [showTrackRecord, setShowTrackRecord] = useState(false);
  const [showHealth, setShowHealth] = useState(false);
  const [pauseLoading, setPauseLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const winRate = calculateWinRate(ea.trades);
  const profitFactor = calculateProfitFactor(ea.trades);
  const maxDrawdown = calculateMaxDrawdown(ea.heartbeats);
  const closedCount = ea.trades.filter((t) => t.closeTime !== null).length;

  async function handleTogglePause(): Promise<void> {
    setPauseLoading(true);
    onTogglePause(ea.id, !ea.paused);
    setPauseLoading(false);
  }

  async function handleDelete(): Promise<void> {
    setDeleteLoading(true);
    onDelete(ea.id);
  }

  return (
    <div
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
        <div className="flex items-center gap-2">
          <StatusBadge status={ea.status} animate={statusChanged} />
          <HealthBadge status={ea.healthStatus ?? null} score={ea.healthScore ?? null} />
          {ea.paused && (
            <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30">
              Paused
            </span>
          )}
          {ea.mode === "PAPER" && (
            <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30">
              Paper
            </span>
          )}
        </div>
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

      {/* Slippage info (estimated from trade data) */}
      {(() => {
        const closedTrades = ea.trades.filter((t) => t.closeTime !== null);
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
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[rgba(79,70,229,0.1)]">
        <button
          onClick={handleTogglePause}
          disabled={pauseLoading}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
            ea.paused
              ? "bg-[#10B981]/20 text-[#10B981] border-[#10B981]/30 hover:bg-[#10B981]/30"
              : "bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/30 hover:bg-[#F59E0B]/30"
          } disabled:opacity-50`}
        >
          {ea.paused ? (
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
          {ea.paused ? "Resume" : "Pause"}
        </button>

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

        <div className="flex-1" />

        <span className="text-xs text-[#7C8DB0]">
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
      {showHealth && <HealthDetailPanel instanceId={ea.id} />}
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
  connected: { color: "#10B981", label: "Live", ping: true },
  "fallback-polling": { color: "#3B82F6", label: "Polling", ping: false },
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
  value,
  isCurrency = true,
}: {
  label: string;
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
      enabled: true,
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

  async function handleToggleAlert(alertId: string, enabled: boolean): Promise<void> {
    const res = await fetch("/api/live/alerts", {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
      body: JSON.stringify({ id: alertId, enabled }),
    });
    if (res.ok) {
      setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, enabled } : a)));
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
                <option value="DRAWDOWN">Drawdown Threshold</option>
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
                    alert.enabled
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
                      onClick={() => handleToggleAlert(alert.id, !alert.enabled)}
                      className={`relative w-8 h-4 rounded-full transition-colors duration-200 ${
                        alert.enabled ? "bg-[#10B981]" : "bg-[#374151]"
                      }`}
                      title={alert.enabled ? "Disable" : "Enable"}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform duration-200 ${
                          alert.enabled ? "translate-x-4" : "translate-x-0"
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

export function LiveDashboardClient({ initialData, tier }: LiveDashboardClientProps) {
  const [eaInstances, setEaInstances] = useState<EAInstanceData[]>(initialData);
  const [soundAlerts, setSoundAlerts] = useState(false);
  const [changedIds, setChangedIds] = useState<Set<string>>(new Set());
  const [modeFilter, setModeFilter] = useState<"ALL" | "LIVE" | "PAPER">("ALL");
  const [showAlertsModal, setShowAlertsModal] = useState(false);
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

  async function handleTogglePause(instanceId: string, paused: boolean): Promise<void> {
    const res = await fetch(`/api/live/${instanceId}/pause`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
      body: JSON.stringify({ paused }),
    });

    if (res.ok) {
      setEaInstances((prev) => prev.map((ea) => (ea.id === instanceId ? { ...ea, paused } : ea)));
      const ea = eaInstances.find((e) => e.id === instanceId);
      const action = paused ? "paused" : "resumed";
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
        enabled: true,
      }),
    });

    if (res.ok) {
      showSuccess("Global drawdown alert saved", `Alert at ${threshold}% drawdown`);
    } else {
      showError("Failed to save alert");
    }
  }

  // Calculate portfolio-level max drawdown for display
  const portfolioMaxDrawdown = (() => {
    const allHeartbeats = eaInstances.flatMap((ea) => ea.heartbeats);
    if (allHeartbeats.length === 0) return 0;
    return calculateMaxDrawdown(allHeartbeats);
  })();

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
          {tier && tier !== "FREE" && <RegisterEADialog onSuccess={fetchUpdate} />}

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
              label="Live P&L"
              value={eaInstances
                .filter((ea) => ea.mode === "LIVE")
                .reduce((sum, ea) => sum + ea.totalProfit, 0)}
            />
            <SummaryCard
              label="Paper P&L"
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
            {/* Portfolio Max Drawdown */}
            <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-4">
              <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-1">
                Max Drawdown
              </p>
              <p
                className={`text-lg font-semibold ${
                  portfolioMaxDrawdown > parseFloat(globalDrawdownThreshold) || 0
                    ? "text-[#EF4444]"
                    : "text-white"
                }`}
              >
                {portfolioMaxDrawdown.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Global Drawdown Alert Threshold */}
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
                  Global drawdown alert threshold (applies to all EAs)
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
                <span className="text-xs text-[#7C8DB0]">% drawdown</span>
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
            const filtered =
              modeFilter === "ALL"
                ? eaInstances
                : eaInstances.filter((ea) => ea.mode === modeFilter);
            for (const ea of filtered) {
              const sym = ea.symbol || "Unknown";
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

      {/* Workflow Navigation */}
      {eaInstances.length > 0 && (
        <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-1.5">
              <Link
                href="/app"
                className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-[#7C8DB0] hover:text-[#A78BFA] hover:bg-[#4F46E5]/10 transition-all"
              >
                <span className="w-4 h-4 rounded-full bg-[#4F46E5] text-white flex items-center justify-center text-[8px]">
                  <svg
                    className="w-2.5 h-2.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                Build
              </Link>
              <svg
                className="w-3 h-3 text-[#4F46E5]/40"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              <span className="flex items-center gap-1 px-2 py-1 rounded bg-[#4F46E5]/20 text-[10px] font-semibold text-[#A78BFA]">
                <span className="w-4 h-4 rounded-full bg-[#4F46E5] text-white flex items-center justify-center text-[8px]">
                  2
                </span>
                Deploy
              </span>
              <svg
                className="w-3 h-3 text-[#4F46E5]/40"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              <Link
                href="/app/journal"
                className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-[#7C8DB0] hover:text-[#A78BFA] hover:bg-[#4F46E5]/10 transition-all"
              >
                <span className="w-4 h-4 rounded-full border border-[#7C8DB0]/40 flex items-center justify-center text-[8px]">
                  3
                </span>
                Monitor
              </Link>
            </div>
            <Link
              href="/app/journal"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-[#22D3EE] border border-[#22D3EE]/30 rounded-lg hover:bg-[#22D3EE]/10 transition-all duration-200"
            >
              Trade Journal
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </Link>
          </div>
        </div>
      )}

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
          {(modeFilter === "ALL"
            ? eaInstances
            : eaInstances.filter((ea) => ea.mode === modeFilter)
          ).map((ea) => (
            <EACard
              key={ea.id}
              ea={ea}
              statusChanged={changedIds.has(ea.id)}
              onTogglePause={handleTogglePause}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Alerts Modal */}
      {showAlertsModal && (
        <AlertsModal instances={eaInstances} onClose={() => setShowAlertsModal(false)} />
      )}
    </div>
  );
}
