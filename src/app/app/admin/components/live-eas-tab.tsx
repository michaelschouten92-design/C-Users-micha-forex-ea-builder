"use client";

import { useEffect, useState, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { LiveEADetailModal } from "./live-ea-detail-modal";

interface LiveEAData {
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
}

interface LiveEAStats {
  totalInstances: number;
  onlineCount: number;
  offlineCount: number;
  errorCount: number;
  totalTradesAllTime: number;
  topSymbols: { symbol: string; count: number }[];
  topBrokers: { broker: string; count: number }[];
}

interface PerformanceData {
  totalClosedTrades: number;
  totalProfit: number;
  avgProfit: number;
  winRate: number;
  top5: EAPerf[];
  bottom5: EAPerf[];
}

interface EAPerf {
  id: string;
  eaName: string;
  symbol: string | null;
  userEmail: string;
  totalTrades: number;
  totalProfit: number;
  winRate: number;
  avgProfit: number;
  maxDrawdown: number;
}

const STATUS_BADGE: Record<string, string> = {
  ONLINE: "bg-emerald-500/20 text-emerald-400 border-emerald-500/50",
  OFFLINE: "bg-gray-500/20 text-gray-400 border-gray-500/50",
  ERROR: "bg-red-500/20 text-red-400 border-red-500/50",
};

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function LiveEAsTab() {
  const [instances, setInstances] = useState<LiveEAData[]>([]);
  const [stats, setStats] = useState<LiveEAStats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [performance, setPerformance] = useState<PerformanceData | null>(null);

  const pageSize = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (statusFilter) params.set("status", statusFilter);
      if (search) params.set("search", search);

      const [listRes, statsRes] = await Promise.all([
        apiClient.get<{ data: LiveEAData[]; pagination: { total: number } }>(
          `/api/admin/live-eas?${params}`
        ),
        apiClient.get<LiveEAStats>("/api/admin/live-eas/stats"),
      ]);

      setInstances(listRes.data);
      setTotal(listRes.pagination.total);
      setStats(statsRes);
    } catch {
      setInstances([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    apiClient
      .get<PerformanceData>("/api/admin/live-eas/performance")
      .then(setPerformance)
      .catch(() => {});
  }, []);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Live EAs</h2>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="rounded-lg border border-[rgba(79,70,229,0.2)] bg-[#1A0626]/60 p-4">
          <div className="text-sm text-[#94A3B8]">Total EAs</div>
          <div className="text-2xl font-bold text-white mt-1">{stats?.totalInstances ?? "..."}</div>
        </div>
        <div className="rounded-lg border border-emerald-500/20 bg-[#1A0626]/60 p-4">
          <div className="text-sm text-[#94A3B8]">Online</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {stats?.onlineCount ?? "..."}
          </div>
        </div>
        <div className="rounded-lg border border-gray-500/20 bg-[#1A0626]/60 p-4">
          <div className="text-sm text-[#94A3B8]">Offline</div>
          <div className="text-2xl font-bold text-gray-400 mt-1">
            {stats?.offlineCount ?? "..."}
          </div>
        </div>
        <div className="rounded-lg border border-red-500/20 bg-[#1A0626]/60 p-4">
          <div className="text-sm text-[#94A3B8]">Errors</div>
          <div className="text-2xl font-bold text-red-400 mt-1">{stats?.errorCount ?? "..."}</div>
        </div>
        <div className="rounded-lg border border-[rgba(79,70,229,0.2)] bg-[#1A0626]/60 p-4">
          <div className="text-sm text-[#94A3B8]">Total Trades</div>
          <div className="text-2xl font-bold text-cyan-400 mt-1">
            {stats?.totalTradesAllTime?.toLocaleString() ?? "..."}
          </div>
        </div>
      </div>

      {/* Top Symbols & Top Brokers */}
      {stats && (stats.topSymbols.length > 0 || stats.topBrokers.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {stats.topSymbols.length > 0 && (
            <div className="rounded-lg border border-[rgba(79,70,229,0.2)] bg-[#1A0626]/60 p-4">
              <h3 className="text-sm font-semibold text-[#A78BFA] uppercase tracking-wider mb-3">
                Top Symbols
              </h3>
              <div className="space-y-2">
                {stats.topSymbols.map((s) => (
                  <div key={s.symbol} className="flex justify-between text-sm">
                    <span className="text-white font-mono">{s.symbol}</span>
                    <span className="text-[#94A3B8]">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {stats.topBrokers.length > 0 && (
            <div className="rounded-lg border border-[rgba(79,70,229,0.2)] bg-[#1A0626]/60 p-4">
              <h3 className="text-sm font-semibold text-[#A78BFA] uppercase tracking-wider mb-3">
                Top Brokers
              </h3>
              <div className="space-y-2">
                {stats.topBrokers.map((b) => (
                  <div key={b.broker} className="flex justify-between text-sm">
                    <span className="text-white">{b.broker}</span>
                    <span className="text-[#94A3B8]">{b.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Performance Analytics */}
      {performance && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">Performance Analytics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="rounded-lg border border-[rgba(79,70,229,0.2)] bg-[#1A0626]/60 p-4">
              <div className="text-sm text-[#94A3B8]">Win Rate</div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">{performance.winRate}%</div>
            </div>
            <div className="rounded-lg border border-[rgba(79,70,229,0.2)] bg-[#1A0626]/60 p-4">
              <div className="text-sm text-[#94A3B8]">Avg Profit</div>
              <div
                className={`text-2xl font-bold mt-1 ${performance.avgProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}
              >
                ${performance.avgProfit.toFixed(2)}
              </div>
            </div>
            <div className="rounded-lg border border-[rgba(79,70,229,0.2)] bg-[#1A0626]/60 p-4">
              <div className="text-sm text-[#94A3B8]">Total Profit</div>
              <div
                className={`text-2xl font-bold mt-1 ${performance.totalProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}
              >
                ${performance.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="rounded-lg border border-[rgba(79,70,229,0.2)] bg-[#1A0626]/60 p-4">
              <div className="text-sm text-[#94A3B8]">Closed Trades</div>
              <div className="text-2xl font-bold text-white mt-1">
                {performance.totalClosedTrades.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top 5 EAs */}
            <div className="rounded-lg border border-emerald-500/20 bg-[#1A0626]/60 p-4">
              <h4 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-3">
                Top 5 EAs
              </h4>
              {performance.top5.length === 0 ? (
                <p className="text-[#64748B] text-sm">No data</p>
              ) : (
                <div className="space-y-2">
                  {performance.top5.map((ea) => (
                    <div key={ea.id} className="flex justify-between items-center text-sm">
                      <div>
                        <span className="text-white font-medium">{ea.eaName}</span>
                        <span className="text-[#64748B] ml-2 text-xs">{ea.userEmail}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-emerald-400 font-mono">
                          ${ea.totalProfit.toFixed(2)}
                        </span>
                        <span className="text-[#64748B] ml-2 text-xs">{ea.winRate}% WR</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Bottom 5 EAs */}
            <div className="rounded-lg border border-red-500/20 bg-[#1A0626]/60 p-4">
              <h4 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-3">
                Bottom 5 EAs
              </h4>
              {performance.bottom5.length === 0 ? (
                <p className="text-[#64748B] text-sm">No data</p>
              ) : (
                <div className="space-y-2">
                  {performance.bottom5.map((ea) => (
                    <div key={ea.id} className="flex justify-between items-center text-sm">
                      <div>
                        <span className="text-white font-medium">{ea.eaName}</span>
                        <span className="text-[#64748B] ml-2 text-xs">{ea.userEmail}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-red-400 font-mono">${ea.totalProfit.toFixed(2)}</span>
                        <span className="text-[#64748B] ml-2 text-xs">{ea.winRate}% WR</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex gap-2">
          {["", "ONLINE", "OFFLINE", "ERROR"].map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatusFilter(s);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                statusFilter === s
                  ? "bg-[#4F46E5] text-white"
                  : "bg-[#1A0626]/60 text-[#94A3B8] border border-[rgba(79,70,229,0.2)] hover:border-[rgba(79,70,229,0.4)]"
              }`}
            >
              {s || "All"}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(searchInput);
            setPage(1);
          }}
          className="flex gap-2 flex-1 min-w-[200px]"
        >
          <input
            type="text"
            placeholder="Search by user, EA name, symbol..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex-1 px-3 py-1.5 rounded-lg bg-[#1A0626]/60 border border-[rgba(79,70,229,0.2)] text-white text-sm placeholder-[#94A3B8]/50 focus:outline-none focus:border-[#4F46E5]"
          />
          <button
            type="submit"
            className="px-4 py-1.5 rounded-lg bg-[#4F46E5] text-white text-sm font-medium hover:bg-[#4338CA] transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-[rgba(79,70,229,0.2)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#1A0626]/80 text-[#94A3B8] text-left">
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">EA Name</th>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Symbol/TF</th>
              <th className="px-4 py-3 font-medium">Broker</th>
              <th className="px-4 py-3 font-medium text-right">Balance</th>
              <th className="px-4 py-3 font-medium text-right">Equity</th>
              <th className="px-4 py-3 font-medium text-center">Open</th>
              <th className="px-4 py-3 font-medium text-right">Total P/L</th>
              <th className="px-4 py-3 font-medium">Last Heartbeat</th>
            </tr>
          </thead>
          <tbody>
            {loading && instances.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-[#94A3B8]">
                  Loading...
                </td>
              </tr>
            ) : instances.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-[#94A3B8]">
                  No live EAs found
                </td>
              </tr>
            ) : (
              instances.map((inst) => (
                <tr
                  key={inst.id}
                  onClick={() => setSelectedId(inst.id)}
                  className="border-t border-[rgba(79,70,229,0.1)] hover:bg-[#1A0626]/40 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_BADGE[inst.status]}`}
                    >
                      {inst.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white font-medium">{inst.eaName}</td>
                  <td className="px-4 py-3 text-[#94A3B8]">{inst.userEmail}</td>
                  <td className="px-4 py-3 text-[#94A3B8]">
                    {inst.symbol ?? "-"} {inst.timeframe ? `/ ${inst.timeframe}` : ""}
                  </td>
                  <td className="px-4 py-3 text-[#94A3B8] max-w-[120px] truncate">
                    {inst.broker ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-right text-white font-mono">
                    {inst.balance != null
                      ? `$${inst.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-right text-white font-mono">
                    {inst.equity != null
                      ? `$${inst.equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-center text-white">{inst.openTrades}</td>
                  <td
                    className={`px-4 py-3 text-right font-mono ${
                      inst.totalProfit >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {inst.totalProfit >= 0 ? "+" : ""}$
                    {inst.totalProfit.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-4 py-3 text-[#94A3B8]">
                    {formatRelativeTime(inst.lastHeartbeat)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-[#94A3B8]">
            Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded bg-[#1A0626]/60 text-[#94A3B8] border border-[rgba(79,70,229,0.2)] disabled:opacity-40 hover:border-[rgba(79,70,229,0.4)] text-sm"
            >
              Prev
            </button>
            <span className="px-3 py-1 text-white text-sm">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 rounded bg-[#1A0626]/60 text-[#94A3B8] border border-[rgba(79,70,229,0.2)] disabled:opacity-40 hover:border-[rgba(79,70,229,0.4)] text-sm"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {selectedId && (
        <LiveEADetailModal instanceId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
