"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { AppBreadcrumbs } from "@/components/app/app-breadcrumbs";
import { getCsrfHeaders } from "@/lib/api-client";
import { showSuccess, showError } from "@/lib/toast";

interface JournalMetadata {
  entryReason?: string;
  exitReason?: string;
  setupQuality?: number;
  symbol?: string;
  pnl?: number;
  tags?: string[];
}

interface JournalEntry {
  id: string;
  projectId: string;
  backtestProfit: number | null;
  backtestWinRate: number | null;
  backtestSharpe: number | null;
  instanceId: string | null;
  liveProfit: number | null;
  liveWinRate: number | null;
  liveSharpe: number | null;
  notes: string | null;
  metadata: JournalMetadata | null;
  status: string;
  startedAt: string;
  updatedAt: string;
  project: { id: string; name: string };
  instance: { id: string; eaName: string; status: string } | null;
}

const STATUS_OPTIONS = ["BACKTESTING", "DEMO", "LIVE", "STOPPED"] as const;

const ENTRY_REASONS = [
  { value: "trend-following", label: "Trend Following" },
  { value: "mean-reversion", label: "Mean Reversion" },
  { value: "breakout", label: "Breakout" },
  { value: "scalp", label: "Scalp" },
  { value: "other", label: "Other" },
] as const;

const EXIT_REASONS = [
  { value: "hit-tp", label: "Hit TP" },
  { value: "hit-sl", label: "Hit SL" },
  { value: "manual", label: "Manual Close" },
  { value: "trailing", label: "Trailing Stop" },
  { value: "time-based", label: "Time-Based" },
  { value: "other", label: "Other" },
] as const;

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case "BACKTESTING":
      return "bg-[#4F46E5]/20 text-[#A78BFA] border-[#4F46E5]/30";
    case "DEMO":
      return "bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/30";
    case "LIVE":
      return "bg-[#10B981]/20 text-[#10B981] border-[#10B981]/30";
    case "STOPPED":
      return "bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/30";
    default:
      return "bg-[#7C8DB0]/20 text-[#7C8DB0] border-[#7C8DB0]/30";
  }
}

function getMetricColor(backtest: number | null, live: number | null): string {
  if (backtest === null || live === null) return "text-[#CBD5E1]";
  if (live >= backtest) return "text-[#10B981]";
  if (live >= backtest * 0.8) return "text-[#F59E0B]";
  return "text-[#EF4444]";
}

function formatMetric(value: number | null, suffix: string = ""): string {
  if (value === null) return "--";
  return `${value.toFixed(2)}${suffix}`;
}

function formatCurrency(value: number | null): string {
  if (value === null) return "--";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

// Star rating component
function StarRating({
  value,
  onChange,
  readonly = false,
}: {
  value: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          className={`transition-colors ${readonly ? "cursor-default" : "cursor-pointer hover:text-[#F59E0B]"}`}
        >
          <svg
            className="w-4 h-4"
            fill={star <= value ? "#F59E0B" : "none"}
            stroke={star <= value ? "#F59E0B" : "#7C8DB0"}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
        </button>
      ))}
    </div>
  );
}

// Summary stats component
function SummaryStats({ entries }: { entries: JournalEntry[] }) {
  const stats = useMemo(() => {
    const total = entries.length;
    const withProfit = entries.filter((e) => e.liveProfit !== null || e.backtestProfit !== null);
    const profits = withProfit.map((e) => e.liveProfit ?? e.backtestProfit ?? 0);
    const wins = profits.filter((p) => p > 0).length;
    const winRate = withProfit.length > 0 ? (wins / withProfit.length) * 100 : 0;
    const avgPnL = profits.length > 0 ? profits.reduce((a, b) => a + b, 0) / profits.length : 0;
    const bestTrade = profits.length > 0 ? Math.max(...profits) : 0;
    const worstTrade = profits.length > 0 ? Math.min(...profits) : 0;
    const totalPnL = profits.reduce((a, b) => a + b, 0);

    return { total, winRate, avgPnL, bestTrade, worstTrade, totalPnL };
  }, [entries]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-lg p-3">
        <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">Total Trades</p>
        <p className="text-lg font-semibold text-white">{stats.total}</p>
      </div>
      <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-lg p-3">
        <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">Win Rate</p>
        <p
          className={`text-lg font-semibold ${stats.winRate >= 50 ? "text-[#10B981]" : "text-[#F59E0B]"}`}
        >
          {stats.winRate.toFixed(1)}%
        </p>
      </div>
      <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-lg p-3">
        <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">Total P&L</p>
        <p
          className={`text-lg font-semibold ${stats.totalPnL >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}
        >
          {formatCurrency(stats.totalPnL)}
        </p>
      </div>
      <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-lg p-3">
        <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">Avg P&L</p>
        <p
          className={`text-lg font-semibold ${stats.avgPnL >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}
        >
          {formatCurrency(stats.avgPnL)}
        </p>
      </div>
      <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-lg p-3">
        <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">Best Trade</p>
        <p className="text-lg font-semibold text-[#10B981]">{formatCurrency(stats.bestTrade)}</p>
      </div>
      <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-lg p-3">
        <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">Worst Trade</p>
        <p className="text-lg font-semibold text-[#EF4444]">{formatCurrency(stats.worstTrade)}</p>
      </div>
    </div>
  );
}

// Monthly/Weekly P&L breakdown
function PnLBreakdown({ entries }: { entries: JournalEntry[] }) {
  const [view, setView] = useState<"monthly" | "weekly">("monthly");

  const breakdown = useMemo(() => {
    const groups: Record<string, { pnl: number; count: number }> = {};

    for (const entry of entries) {
      const profit = entry.liveProfit ?? entry.backtestProfit ?? 0;
      const date = new Date(entry.startedAt);

      let key: string;
      if (view === "monthly") {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      } else {
        // ISO week
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
        const week = Math.ceil(
          ((d.getTime() - new Date(d.getFullYear(), 0, 4).getTime()) / 86400000 + 1) / 7
        );
        key = `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
      }

      if (!groups[key]) groups[key] = { pnl: 0, count: 0 };
      groups[key].pnl += profit;
      groups[key].count += 1;
    }

    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 12);
  }, [entries, view]);

  if (entries.length === 0) return null;

  return (
    <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">P&L Breakdown</h3>
        <div className="flex items-center rounded-lg border border-[rgba(79,70,229,0.2)] overflow-hidden">
          <button
            onClick={() => setView("monthly")}
            className={`px-3 py-1 text-xs font-medium transition-colors ${
              view === "monthly"
                ? "bg-[#4F46E5]/20 text-[#A78BFA]"
                : "text-[#7C8DB0] hover:text-white"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setView("weekly")}
            className={`px-3 py-1 text-xs font-medium transition-colors ${
              view === "weekly"
                ? "bg-[#4F46E5]/20 text-[#A78BFA]"
                : "text-[#7C8DB0] hover:text-white"
            }`}
          >
            Weekly
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-[#7C8DB0] border-b border-[rgba(79,70,229,0.1)]">
              <th className="text-left py-1.5 pr-4">Period</th>
              <th className="text-right py-1.5 pr-4">P&L</th>
              <th className="text-right py-1.5">Trades</th>
            </tr>
          </thead>
          <tbody>
            {breakdown.map(([period, data]) => (
              <tr key={period} className="border-b border-[rgba(79,70,229,0.05)]">
                <td className="py-1.5 pr-4 text-[#CBD5E1]">{period}</td>
                <td
                  className={`py-1.5 pr-4 text-right font-medium ${
                    data.pnl >= 0 ? "text-[#10B981]" : "text-[#EF4444]"
                  }`}
                >
                  {formatCurrency(data.pnl)}
                </td>
                <td className="py-1.5 text-right text-[#CBD5E1]">{data.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [symbolFilter, setSymbolFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotesValue, setEditNotesValue] = useState("");
  const [editMetadata, setEditMetadata] = useState<JournalMetadata>({});
  const [savingNotes, setSavingNotes] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (statusFilter) params.set("status", statusFilter);
      if (symbolFilter) params.set("symbol", symbolFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await fetch(`/api/journal?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.data);
        setTotalPages(data.pagination.totalPages);
      }
    } catch {
      showError("Failed to load journal entries");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, symbolFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Extract unique symbols from entries for filter dropdown
  const uniqueSymbols = useMemo(() => {
    const symbols = new Set<string>();
    entries.forEach((e) => {
      const sym = (e.metadata as JournalMetadata)?.symbol;
      if (sym) symbols.add(sym);
    });
    return Array.from(symbols).sort();
  }, [entries]);

  async function handleStatusChange(entryId: string, newStatus: string) {
    try {
      const res = await fetch(`/api/journal/${entryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setEntries((prev) => prev.map((e) => (e.id === entryId ? { ...e, status: newStatus } : e)));
        showSuccess("Status updated");
      } else {
        showError("Failed to update status");
      }
    } catch {
      showError("Something went wrong");
    }
  }

  async function handleSaveEntry(entryId: string) {
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/journal/${entryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({
          notes: editNotesValue || null,
          metadata: editMetadata,
        }),
      });

      if (res.ok) {
        setEntries((prev) =>
          prev.map((e) =>
            e.id === entryId ? { ...e, notes: editNotesValue || null, metadata: editMetadata } : e
          )
        );
        setEditingId(null);
        showSuccess("Entry saved");
      } else {
        showError("Failed to save entry");
      }
    } catch {
      showError("Something went wrong");
    } finally {
      setSavingNotes(false);
    }
  }

  async function handleDelete(entryId: string) {
    setDeletingId(entryId);
    try {
      const res = await fetch(`/api/journal/${entryId}`, {
        method: "DELETE",
        headers: getCsrfHeaders(),
      });

      if (res.ok) {
        setEntries((prev) => prev.filter((e) => e.id !== entryId));
        showSuccess("Entry deleted");
      } else {
        showError("Failed to delete entry");
      }
    } catch {
      showError("Something went wrong");
    } finally {
      setDeletingId(null);
    }
  }

  function startEditing(entry: JournalEntry) {
    setEditingId(entry.id);
    setEditNotesValue(entry.notes ?? "");
    setEditMetadata((entry.metadata as JournalMetadata) ?? {});
  }

  return (
    <div className="min-h-screen">
      <nav
        role="navigation"
        aria-label="App navigation"
        className="bg-[#1A0626]/80 backdrop-blur-sm border-b border-[rgba(79,70,229,0.2)] sticky top-0 z-50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <Link
                href="/app"
                className="text-xl font-bold text-white hover:text-[#A78BFA] transition-colors"
              >
                AlgoStudio
              </Link>
              <span className="text-[#7C8DB0]">/</span>
              <span className="text-[#94A3B8]">Trade Journal</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/app"
                className="text-sm text-[#94A3B8] hover:text-[#22D3EE] transition-colors duration-200"
              >
                Dashboard
              </Link>
              <Link
                href="/app/backtest"
                className="text-sm text-[#94A3B8] hover:text-[#22D3EE] transition-colors duration-200"
              >
                Backtest
              </Link>
              <Link
                href="/app/live"
                className="text-sm text-[#94A3B8] hover:text-[#22D3EE] transition-colors duration-200"
              >
                Track Record
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main id="main-content" className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <AppBreadcrumbs
          items={[{ label: "Dashboard", href: "/app" }, { label: "Trade Journal" }]}
        />

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Trade Journal</h1>
            <p className="mt-1 text-sm text-[#94A3B8]">
              Track your strategies from backtest to live. Compare performance across stages.
            </p>
          </div>
        </div>

        {/* Summary Stats */}
        {entries.length > 0 && <SummaryStats entries={entries} />}

        {/* P&L Breakdown */}
        {entries.length > 0 && <PnLBreakdown entries={entries} />}

        {/* Filters */}
        <div className="mb-6 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <label htmlFor="status-filter" className="text-sm text-[#CBD5E1]">
              Status:
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg bg-[#0A0118] border border-[rgba(79,70,229,0.3)] text-white px-3 py-1.5 text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-colors"
            >
              <option value="">All</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[rgba(79,70,229,0.2)] text-[#7C8DB0] hover:text-white hover:border-[rgba(79,70,229,0.4)] transition-all duration-200"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              {showFilters ? "Hide Filters" : "More Filters"}
            </button>
          </div>

          {showFilters && (
            <div className="flex items-end gap-3 flex-wrap bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-lg p-4">
              {uniqueSymbols.length > 0 && (
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-1">
                    Symbol
                  </label>
                  <select
                    value={symbolFilter}
                    onChange={(e) => {
                      setSymbolFilter(e.target.value);
                      setPage(1);
                    }}
                    className="rounded-lg bg-[#0A0118] border border-[rgba(79,70,229,0.3)] text-white px-3 py-1.5 text-sm focus:outline-none focus:border-[#4F46E5] transition-colors"
                  >
                    <option value="">All Symbols</option>
                    {uniqueSymbols.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-1">
                  From
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-lg bg-[#0A0118] border border-[rgba(79,70,229,0.3)] text-white px-3 py-1.5 text-sm focus:outline-none focus:border-[#4F46E5] transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-1">
                  To
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-lg bg-[#0A0118] border border-[rgba(79,70,229,0.3)] text-white px-3 py-1.5 text-sm focus:outline-none focus:border-[#4F46E5] transition-colors"
                />
              </div>
              <button
                onClick={() => {
                  setSymbolFilter("");
                  setDateFrom("");
                  setDateTo("");
                  setStatusFilter("");
                  setPage(1);
                }}
                className="px-3 py-1.5 text-xs text-[#94A3B8] hover:text-white transition-colors"
              >
                Clear All
              </button>
            </div>
          )}
        </div>

        {/* Journal Table */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4F46E5]" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16">
            <svg
              className="w-12 h-12 mx-auto text-[#4F46E5]/30 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-[#94A3B8] text-lg font-medium">No journal entries yet</p>
            <p className="text-[#7C8DB0] text-sm mt-1">
              Run a backtest and click &ldquo;Add to Journal&rdquo; to start tracking your
              strategies.
            </p>
            <Link
              href="/app/backtest"
              className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 text-sm font-medium text-white bg-[#4F46E5] rounded-lg hover:bg-[#6366F1] transition-all duration-200"
            >
              Go to Backtest
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => {
              const meta = (entry.metadata as JournalMetadata) ?? {};
              const isEditing = editingId === entry.id;

              return (
                <div
                  key={entry.id}
                  className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-white font-semibold">{entry.project.name}</h3>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${getStatusBadgeClass(entry.status)}`}
                      >
                        {entry.status}
                      </span>
                      {meta.symbol && (
                        <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-[#22D3EE]/15 text-[#22D3EE] border border-[#22D3EE]/30">
                          {meta.symbol}
                        </span>
                      )}
                      {meta.setupQuality && <StarRating value={meta.setupQuality} readonly />}
                      {entry.instance && (
                        <span className="text-xs text-[#7C8DB0]">via {entry.instance.eaName}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={entry.status}
                        onChange={(e) => handleStatusChange(entry.id, e.target.value)}
                        className="text-xs rounded bg-[#0A0118] border border-[rgba(79,70,229,0.3)] text-[#CBD5E1] px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        disabled={deletingId === entry.id}
                        className="text-xs text-[#EF4444]/60 hover:text-[#EF4444] transition-colors disabled:opacity-30"
                        title="Delete entry"
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

                  {/* Review badges (read-only when not editing) */}
                  {!isEditing && (meta.entryReason || meta.exitReason) && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {meta.entryReason && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(79,70,229,0.1)] text-[#A78BFA] border border-[rgba(79,70,229,0.2)]">
                          Entry:{" "}
                          {ENTRY_REASONS.find((r) => r.value === meta.entryReason)?.label ??
                            meta.entryReason}
                        </span>
                      )}
                      {meta.exitReason && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(79,70,229,0.1)] text-[#22D3EE] border border-[rgba(34,211,238,0.2)]">
                          Exit:{" "}
                          {EXIT_REASONS.find((r) => r.value === meta.exitReason)?.label ??
                            meta.exitReason}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Comparison Grid */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-2">
                        Metric
                      </p>
                      <div className="space-y-2 text-sm">
                        <p className="text-[#CBD5E1]">Net Profit</p>
                        <p className="text-[#CBD5E1]">Win Rate</p>
                        <p className="text-[#CBD5E1]">Sharpe Ratio</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-[#A78BFA] mb-2">
                        Backtest
                      </p>
                      <div className="space-y-2 text-sm">
                        <p className="text-[#CBD5E1]">{formatCurrency(entry.backtestProfit)}</p>
                        <p className="text-[#CBD5E1]">{formatMetric(entry.backtestWinRate, "%")}</p>
                        <p className="text-[#CBD5E1]">{formatMetric(entry.backtestSharpe)}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-[#22D3EE] mb-2">
                        Live
                      </p>
                      <div className="space-y-2 text-sm">
                        <p className={getMetricColor(entry.backtestProfit, entry.liveProfit)}>
                          {formatCurrency(entry.liveProfit)}
                        </p>
                        <p className={getMetricColor(entry.backtestWinRate, entry.liveWinRate)}>
                          {formatMetric(entry.liveWinRate, "%")}
                        </p>
                        <p className={getMetricColor(entry.backtestSharpe, entry.liveSharpe)}>
                          {formatMetric(entry.liveSharpe)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Notes & Structured Review */}
                  <div className="border-t border-[rgba(79,70,229,0.15)] pt-3">
                    {isEditing ? (
                      <div className="space-y-3">
                        {/* Structured review fields */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-1">
                              Entry Reason
                            </label>
                            <select
                              value={editMetadata.entryReason ?? ""}
                              onChange={(e) =>
                                setEditMetadata({
                                  ...editMetadata,
                                  entryReason: e.target.value || undefined,
                                })
                              }
                              className="w-full rounded-lg bg-[#0A0118] border border-[rgba(79,70,229,0.3)] text-white px-3 py-1.5 text-xs focus:outline-none focus:border-[#4F46E5] transition-colors"
                            >
                              <option value="">-- Select --</option>
                              {ENTRY_REASONS.map((r) => (
                                <option key={r.value} value={r.value}>
                                  {r.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-1">
                              Exit Reason
                            </label>
                            <select
                              value={editMetadata.exitReason ?? ""}
                              onChange={(e) =>
                                setEditMetadata({
                                  ...editMetadata,
                                  exitReason: e.target.value || undefined,
                                })
                              }
                              className="w-full rounded-lg bg-[#0A0118] border border-[rgba(79,70,229,0.3)] text-white px-3 py-1.5 text-xs focus:outline-none focus:border-[#4F46E5] transition-colors"
                            >
                              <option value="">-- Select --</option>
                              {EXIT_REASONS.map((r) => (
                                <option key={r.value} value={r.value}>
                                  {r.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-1">
                              Setup Quality
                            </label>
                            <StarRating
                              value={editMetadata.setupQuality ?? 0}
                              onChange={(v) =>
                                setEditMetadata({
                                  ...editMetadata,
                                  setupQuality: v,
                                })
                              }
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-1">
                            Symbol
                          </label>
                          <input
                            type="text"
                            value={editMetadata.symbol ?? ""}
                            onChange={(e) =>
                              setEditMetadata({
                                ...editMetadata,
                                symbol: e.target.value.toUpperCase() || undefined,
                              })
                            }
                            placeholder="e.g. EURUSD"
                            className="w-40 rounded-lg bg-[#0A0118] border border-[rgba(79,70,229,0.3)] text-white px-3 py-1.5 text-xs focus:outline-none focus:border-[#4F46E5] transition-colors"
                          />
                        </div>
                        <textarea
                          value={editNotesValue}
                          onChange={(e) => setEditNotesValue(e.target.value)}
                          maxLength={5000}
                          rows={3}
                          className="w-full px-3 py-2 text-sm bg-[#0A0118] border border-[rgba(79,70,229,0.3)] rounded-lg text-white placeholder-[#475569] focus:outline-none focus:ring-1 focus:ring-[#4F46E5] transition-colors resize-none"
                          placeholder="Add notes about this strategy..."
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveEntry(entry.id)}
                            disabled={savingNotes}
                            className="px-3 py-1 text-xs font-medium text-white bg-[#4F46E5] rounded hover:bg-[#6366F1] disabled:opacity-50 transition-colors"
                          >
                            {savingNotes ? "Saving..." : "Save"}
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1 text-xs text-[#94A3B8] hover:text-white transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditing(entry)}
                        className="text-sm text-left w-full"
                      >
                        {entry.notes ? (
                          <p className="text-[#94A3B8] whitespace-pre-wrap">{entry.notes}</p>
                        ) : (
                          <p className="text-[#475569] italic">
                            Click to add notes and review details...
                          </p>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-3 text-[10px] text-[#475569]">
                    <span>Started {new Date(entry.startedAt).toLocaleDateString()}</span>
                    <span>Updated {new Date(entry.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-xs text-[#CBD5E1] border border-[rgba(79,70,229,0.3)] rounded-lg hover:bg-[rgba(79,70,229,0.1)] disabled:opacity-30 transition-colors"
                >
                  Previous
                </button>
                <span className="text-xs text-[#7C8DB0]">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-xs text-[#CBD5E1] border border-[rgba(79,70,229,0.3)] rounded-lg hover:bg-[rgba(79,70,229,0.1)] disabled:opacity-30 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
