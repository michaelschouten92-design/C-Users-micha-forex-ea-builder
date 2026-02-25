"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { showSuccess, showError } from "@/lib/toast";

interface Incident {
  id: string;
  severity: string;
  category: string;
  title: string;
  description: string | null;
  sourceType: string | null;
  sourceId: string | null;
  status: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface IncidentsResponse {
  data: Incident[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

const SEVERITY_BADGE: Record<string, string> = {
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  warning: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  info: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

const STATUS_BADGE: Record<string, string> = {
  open: "bg-red-500/10 text-red-400",
  acknowledged: "bg-yellow-500/10 text-yellow-400",
  resolved: "bg-emerald-500/10 text-emerald-400",
};

const CATEGORY_LABELS: Record<string, string> = {
  ea_silent: "Silent EA",
  strategy_degraded: "Strategy Degraded",
  export_failure: "Export Failure",
  system: "System",
  manual: "Manual",
};

type StatusFilter = "all" | "open" | "acknowledged" | "resolved";

export function IncidentsTab() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formSeverity, setFormSeverity] = useState("warning");
  const [formCategory, setFormCategory] = useState("manual");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "25" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await apiClient.get<IncidentsResponse>(`/api/admin/incidents?${params}`);
      setIncidents(res.data);
      setTotalPages(res.pagination.totalPages);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle.trim()) return;
    setSubmitting(true);
    try {
      await apiClient.post("/api/admin/incidents", {
        severity: formSeverity,
        category: formCategory,
        title: formTitle.trim(),
        description: formDescription.trim() || undefined,
      });
      showSuccess("Created", "Incident logged");
      setFormTitle("");
      setFormDescription("");
      setShowForm(false);
      fetchIncidents();
    } catch (err) {
      showError("Failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(id: string, newStatus: "acknowledged" | "resolved") {
    try {
      await apiClient.patch(`/api/admin/incidents/${id}`, { status: newStatus });
      showSuccess("Updated", `Incident ${newStatus}`);
      fetchIncidents();
    } catch (err) {
      showError("Failed", err instanceof Error ? err.message : "Unknown error");
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(["all", "open", "acknowledged", "resolved"] as const).map((f) => (
            <button
              key={f}
              onClick={() => {
                setStatusFilter(f);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                statusFilter === f
                  ? "bg-[#4F46E5] text-white"
                  : "bg-[#1A0626]/60 text-[#94A3B8] border border-[rgba(79,70,229,0.2)] hover:border-[rgba(79,70,229,0.4)]"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 text-xs font-medium text-white bg-[#4F46E5] rounded-lg hover:bg-[#6366F1] transition-colors"
        >
          {showForm ? "Cancel" : "Log Incident"}
        </button>
      </div>

      {/* Inline form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="rounded-lg border border-[rgba(79,70,229,0.3)] bg-[#0F0318] p-4 space-y-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#94A3B8] block mb-1">Severity</label>
              <select
                value={formSeverity}
                onChange={(e) => setFormSeverity(e.target.value)}
                className="w-full bg-[#0A0118] border border-[rgba(79,70,229,0.3)] rounded px-2 py-1.5 text-sm text-white focus:outline-none"
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-[#94A3B8] block mb-1">Category</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full bg-[#0A0118] border border-[rgba(79,70,229,0.3)] rounded px-2 py-1.5 text-sm text-white focus:outline-none"
              >
                <option value="manual">Manual</option>
                <option value="ea_silent">Silent EA</option>
                <option value="strategy_degraded">Strategy Degraded</option>
                <option value="export_failure">Export Failure</option>
                <option value="system">System</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-[#94A3B8] block mb-1">Title</label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Brief incident title..."
              className="w-full bg-[#0A0118] border border-[rgba(79,70,229,0.3)] rounded px-3 py-1.5 text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#4F46E5]"
              required
            />
          </div>
          <div>
            <label className="text-xs text-[#94A3B8] block mb-1">Description (optional)</label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Additional details..."
              rows={2}
              className="w-full bg-[#0A0118] border border-[rgba(79,70,229,0.3)] rounded px-3 py-1.5 text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#4F46E5] resize-y"
            />
          </div>
          <button
            type="submit"
            disabled={submitting || !formTitle.trim()}
            className="px-4 py-1.5 text-xs font-medium text-white bg-[#4F46E5] rounded-lg hover:bg-[#6366F1] disabled:opacity-50 transition-colors"
          >
            {submitting ? "Creating..." : "Create Incident"}
          </button>
        </form>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-8 text-[#94A3B8] text-sm">Loading incidents...</div>
      ) : incidents.length === 0 ? (
        <div className="text-center py-8 text-[#7C8DB0] text-sm">
          No incidents found for this filter
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[rgba(79,70,229,0.2)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1A0626]/60 border-b border-[rgba(79,70,229,0.2)]">
                <th className="text-left px-3 py-2 text-[#94A3B8] font-medium">Severity</th>
                <th className="text-left px-3 py-2 text-[#94A3B8] font-medium">Category</th>
                <th className="text-left px-3 py-2 text-[#94A3B8] font-medium">Title</th>
                <th className="text-left px-3 py-2 text-[#94A3B8] font-medium">Status</th>
                <th className="text-left px-3 py-2 text-[#94A3B8] font-medium">Time</th>
                <th className="text-right px-3 py-2 text-[#94A3B8] font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((inc) => (
                <tr
                  key={inc.id}
                  className="border-b border-[rgba(79,70,229,0.1)] hover:bg-[#1A0626]/30"
                >
                  <td className="px-3 py-2">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${
                        SEVERITY_BADGE[inc.severity] || SEVERITY_BADGE.info
                      }`}
                    >
                      {inc.severity}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-[#CBD5E1] text-xs">
                    {CATEGORY_LABELS[inc.category] || inc.category}
                  </td>
                  <td className="px-3 py-2 text-white max-w-xs truncate">{inc.title}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        STATUS_BADGE[inc.status] || ""
                      }`}
                    >
                      {inc.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-[#94A3B8] text-xs whitespace-nowrap">
                    {new Date(inc.createdAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {inc.status === "open" && (
                        <button
                          onClick={() => handleStatusChange(inc.id, "acknowledged")}
                          className="text-xs text-yellow-400 hover:text-yellow-300 border border-yellow-500/30 px-2 py-1 rounded transition-colors"
                        >
                          Ack
                        </button>
                      )}
                      {(inc.status === "open" || inc.status === "acknowledged") && (
                        <button
                          onClick={() => handleStatusChange(inc.id, "resolved")}
                          className="text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 px-2 py-1 rounded transition-colors"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 text-xs text-[#94A3B8] border border-[rgba(79,70,229,0.2)] rounded hover:border-[rgba(79,70,229,0.4)] disabled:opacity-30 transition-colors"
          >
            Prev
          </button>
          <span className="text-xs text-[#7C8DB0]">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 text-xs text-[#94A3B8] border border-[rgba(79,70,229,0.2)] rounded hover:border-[rgba(79,70,229,0.4)] disabled:opacity-30 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
