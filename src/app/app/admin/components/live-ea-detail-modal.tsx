"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";

interface Heartbeat {
  id: string;
  balance: number;
  equity: number;
  openTrades: number;
  totalTrades: number;
  totalProfit: number;
  drawdown: number;
  spread: number;
  createdAt: string;
}

interface Trade {
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
  createdAt: string;
}

interface EAError {
  id: string;
  errorCode: number;
  message: string;
  context: string | null;
  createdAt: string;
}

interface DetailData {
  id: string;
  eaName: string;
  status: "ONLINE" | "OFFLINE" | "ERROR";
  symbol: string | null;
  timeframe: string | null;
  broker: string | null;
  accountNumber: string | null;
  balance: number | null;
  equity: number | null;
  openTrades: number;
  totalTrades: number;
  totalProfit: number;
  lastHeartbeat: string | null;
  lastError: string | null;
  createdAt: string;
  userEmail: string;
  exportType: string;
  exportDate: string;
  projectId: string;
  heartbeats: Heartbeat[];
  trades: Trade[];
  errors: EAError[];
}

const STATUS_COLOR: Record<string, string> = {
  ONLINE: "text-emerald-400",
  OFFLINE: "text-gray-400",
  ERROR: "text-red-400",
};

function EquityCurve({ heartbeats }: { heartbeats: Heartbeat[] }) {
  if (heartbeats.length < 2) {
    return (
      <div className="h-40 flex items-center justify-center text-[#94A3B8] text-sm">
        Not enough data for chart
      </div>
    );
  }

  // Reverse so oldest is first
  const data = [...heartbeats].reverse();
  const equities = data.map((h) => h.equity);
  const minEq = Math.min(...equities);
  const maxEq = Math.max(...equities);
  const range = maxEq - minEq || 1;

  const width = 600;
  const height = 140;
  const padding = 4;

  const points = data.map((h, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((h.equity - minEq) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const isPositive = equities[equities.length - 1] >= equities[0];

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40" preserveAspectRatio="none">
        <defs>
          <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isPositive ? "#10B981" : "#EF4444"} stopOpacity="0.3" />
            <stop offset="100%" stopColor={isPositive ? "#10B981" : "#EF4444"} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon
          points={`${padding},${height - padding} ${points.join(" ")} ${width - padding},${height - padding}`}
          fill="url(#eqGrad)"
        />
        <polyline
          points={points.join(" ")}
          fill="none"
          stroke={isPositive ? "#10B981" : "#EF4444"}
          strokeWidth="2"
        />
      </svg>
      <div className="flex justify-between text-xs text-[#94A3B8] mt-1 px-1">
        <span>
          ${minEq.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </span>
        <span>
          ${maxEq.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </span>
      </div>
    </div>
  );
}

interface LiveEADetailModalProps {
  instanceId: string;
  onClose: () => void;
}

export function LiveEADetailModal({ instanceId, onClose }: LiveEADetailModalProps) {
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<"trades" | "errors">("trades");

  useEffect(() => {
    async function fetch() {
      try {
        const res = await apiClient.get<DetailData>(`/api/admin/live-eas/${instanceId}`);
        setData(res);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [instanceId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0F0518] border border-[rgba(79,70,229,0.3)] rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[rgba(79,70,229,0.15)]">
          <div>
            <h2 className="text-xl font-bold text-white">{data?.eaName ?? "Loading..."}</h2>
            {data && (
              <div className="flex items-center gap-3 mt-1 text-sm text-[#94A3B8]">
                <span className={STATUS_COLOR[data.status]}>{data.status}</span>
                <span>{data.userEmail}</span>
                <span>
                  {data.symbol ?? ""} {data.timeframe ? `/ ${data.timeframe}` : ""}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-[#94A3B8] hover:text-white text-2xl leading-none px-2"
          >
            &times;
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-[#94A3B8]">Loading...</div>
        ) : !data ? (
          <div className="p-8 text-center text-red-400">Failed to load data</div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Equity Curve */}
            <div>
              <h3 className="text-sm font-medium text-[#94A3B8] mb-2">Equity Curve</h3>
              <div className="rounded-lg border border-[rgba(79,70,229,0.15)] bg-[#1A0626]/40 p-3">
                <EquityCurve heartbeats={data.heartbeats} />
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard
                label="Balance"
                value={
                  data.balance != null
                    ? `$${data.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : "-"
                }
              />
              <MetricCard
                label="Equity"
                value={
                  data.equity != null
                    ? `$${data.equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : "-"
                }
              />
              <MetricCard
                label="Drawdown"
                value={
                  data.heartbeats.length > 0 ? `${data.heartbeats[0].drawdown.toFixed(1)}%` : "-"
                }
              />
              <MetricCard label="Total Trades" value={String(data.totalTrades)} />
              <MetricCard
                label="Total P/L"
                value={`${data.totalProfit >= 0 ? "+" : ""}$${data.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                color={data.totalProfit >= 0 ? "text-emerald-400" : "text-red-400"}
              />
              <MetricCard label="Open Trades" value={String(data.openTrades)} />
              <MetricCard label="Broker" value={data.broker ?? "-"} />
              <MetricCard
                label="Export Date"
                value={new Date(data.exportDate).toLocaleDateString()}
              />
            </div>

            {/* Section tabs */}
            <div className="flex gap-2 border-b border-[rgba(79,70,229,0.15)] pb-2">
              <button
                onClick={() => setActiveSection("trades")}
                className={`px-3 py-1.5 rounded-t text-sm font-medium transition-colors ${
                  activeSection === "trades"
                    ? "text-white border-b-2 border-[#4F46E5]"
                    : "text-[#94A3B8] hover:text-white"
                }`}
              >
                Trade History ({data.trades.length})
              </button>
              <button
                onClick={() => setActiveSection("errors")}
                className={`px-3 py-1.5 rounded-t text-sm font-medium transition-colors ${
                  activeSection === "errors"
                    ? "text-white border-b-2 border-[#4F46E5]"
                    : "text-[#94A3B8] hover:text-white"
                }`}
              >
                Error Log ({data.errors.length})
              </button>
            </div>

            {/* Trade History */}
            {activeSection === "trades" && (
              <div className="overflow-x-auto rounded-lg border border-[rgba(79,70,229,0.15)]">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#1A0626]/80 text-[#94A3B8] text-left">
                      <th className="px-3 py-2 font-medium">Ticket</th>
                      <th className="px-3 py-2 font-medium">Type</th>
                      <th className="px-3 py-2 font-medium">Symbol</th>
                      <th className="px-3 py-2 font-medium text-right">Lots</th>
                      <th className="px-3 py-2 font-medium text-right">Open</th>
                      <th className="px-3 py-2 font-medium text-right">Close</th>
                      <th className="px-3 py-2 font-medium text-right">P/L</th>
                      <th className="px-3 py-2 font-medium">Open Time</th>
                      <th className="px-3 py-2 font-medium">Close Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.trades.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-3 py-6 text-center text-[#94A3B8]">
                          No trades recorded
                        </td>
                      </tr>
                    ) : (
                      data.trades.map((trade) => (
                        <tr key={trade.id} className="border-t border-[rgba(79,70,229,0.1)]">
                          <td className="px-3 py-2 text-white font-mono">{trade.ticket}</td>
                          <td className="px-3 py-2">
                            <span
                              className={trade.type === "BUY" ? "text-emerald-400" : "text-red-400"}
                            >
                              {trade.type}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-[#94A3B8]">{trade.symbol}</td>
                          <td className="px-3 py-2 text-right text-white font-mono">
                            {trade.lots.toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-right text-white font-mono">
                            {trade.openPrice.toFixed(5)}
                          </td>
                          <td className="px-3 py-2 text-right text-white font-mono">
                            {trade.closePrice?.toFixed(5) ?? "-"}
                          </td>
                          <td
                            className={`px-3 py-2 text-right font-mono ${
                              trade.profit >= 0 ? "text-emerald-400" : "text-red-400"
                            }`}
                          >
                            {trade.profit >= 0 ? "+" : ""}
                            {trade.profit.toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-[#94A3B8]">
                            {new Date(trade.openTime).toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-[#94A3B8]">
                            {trade.closeTime ? new Date(trade.closeTime).toLocaleString() : "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Error Log */}
            {activeSection === "errors" && (
              <div className="space-y-2">
                {data.errors.length === 0 ? (
                  <div className="text-center text-[#94A3B8] py-6 text-sm">No errors recorded</div>
                ) : (
                  data.errors.map((error) => (
                    <div
                      key={error.id}
                      className="rounded-lg border border-red-500/20 bg-red-500/5 p-3"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-red-400 text-xs font-mono">
                          Error {error.errorCode}
                          {error.context && (
                            <span className="text-[#94A3B8] ml-2">[{error.context}]</span>
                          )}
                        </span>
                        <span className="text-[#94A3B8] text-xs">
                          {new Date(error.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-white text-sm">{error.message}</div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg border border-[rgba(79,70,229,0.15)] bg-[#1A0626]/40 p-3">
      <div className="text-xs text-[#94A3B8]">{label}</div>
      <div className={`text-sm font-bold mt-0.5 ${color ?? "text-white"}`}>{value}</div>
    </div>
  );
}
