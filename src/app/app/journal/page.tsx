"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AppBreadcrumbs } from "@/components/app/app-breadcrumbs";
import { getCsrfHeaders } from "@/lib/api-client";
import { showSuccess, showError } from "@/lib/toast";

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
  status: string;
  startedAt: string;
  updatedAt: string;
  project: { id: string; name: string };
  instance: { id: string; eaName: string; status: string } | null;
}

const STATUS_OPTIONS = ["BACKTESTING", "DEMO", "LIVE", "STOPPED"] as const;

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

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [editNotesValue, setEditNotesValue] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (statusFilter) params.set("status", statusFilter);

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
  }, [page, statusFilter]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

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

  async function handleSaveNotes(entryId: string) {
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/journal/${entryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({ notes: editNotesValue || null }),
      });

      if (res.ok) {
        setEntries((prev) =>
          prev.map((e) => (e.id === entryId ? { ...e, notes: editNotesValue || null } : e))
        );
        setEditingNotes(null);
        showSuccess("Notes saved");
      } else {
        showError("Failed to save notes");
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
                Live EAs
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

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6">
          <label htmlFor="status-filter" className="text-sm text-[#CBD5E1]">
            Filter by status:
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
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-white font-semibold">{entry.project.name}</h3>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${getStatusBadgeClass(entry.status)}`}
                    >
                      {entry.status}
                    </span>
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
                    <p className="text-[10px] uppercase tracking-wider text-[#22D3EE] mb-2">Live</p>
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

                {/* Notes */}
                <div className="border-t border-[rgba(79,70,229,0.15)] pt-3">
                  {editingNotes === entry.id ? (
                    <div className="space-y-2">
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
                          onClick={() => handleSaveNotes(entry.id)}
                          disabled={savingNotes}
                          className="px-3 py-1 text-xs font-medium text-white bg-[#4F46E5] rounded hover:bg-[#6366F1] disabled:opacity-50 transition-colors"
                        >
                          {savingNotes ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={() => setEditingNotes(null)}
                          className="px-3 py-1 text-xs text-[#94A3B8] hover:text-white transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingNotes(entry.id);
                        setEditNotesValue(entry.notes ?? "");
                      }}
                      className="text-sm text-left w-full"
                    >
                      {entry.notes ? (
                        <p className="text-[#94A3B8] whitespace-pre-wrap">{entry.notes}</p>
                      ) : (
                        <p className="text-[#475569] italic">Click to add notes...</p>
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
            ))}

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
