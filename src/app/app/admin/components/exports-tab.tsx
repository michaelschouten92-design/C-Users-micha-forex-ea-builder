"use client";

import { useEffect, useState, useCallback } from "react";
import { apiClient } from "@/lib/api-client";

interface ExportJobData {
  id: string;
  exportType: string;
  status: string;
  errorMessage: string | null;
  createdAt: string;
  user: { email: string };
  project: { name: string };
}

const STATUS_BADGE: Record<string, string> = {
  DONE: "bg-emerald-500/20 text-emerald-400 border-emerald-500/50",
  FAILED: "bg-red-500/20 text-red-400 border-red-500/50",
  QUEUED: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
  RUNNING: "bg-blue-500/20 text-blue-400 border-blue-500/50",
};

export function ExportsTab() {
  const [exports, setExports] = useState<ExportJobData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Stats
  const [todayCount, setTodayCount] = useState(0);
  const [successRate, setSuccessRate] = useState(0);
  const [failedWeek, setFailedWeek] = useState(0);

  const limit = 50;

  const fetchExports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (statusFilter) params.set("status", statusFilter);

      const [exportsRes, statsRes] = await Promise.all([
        apiClient.get<{ data: ExportJobData[]; total: number }>(`/api/admin/exports?${params}`),
        apiClient.get<{ exportsToday: number; exportStats: Record<string, number> }>(
          "/api/admin/stats"
        ),
      ]);

      setExports(exportsRes.data);
      setTotal(exportsRes.total);
      setTodayCount(statsRes.exportsToday);

      const totalWeek = Object.values(statsRes.exportStats).reduce((a, b) => a + b, 0);
      const doneWeek = statsRes.exportStats.DONE || 0;
      setSuccessRate(totalWeek > 0 ? (doneWeek / totalWeek) * 100 : 100);
      setFailedWeek(statsRes.exportStats.FAILED || 0);
    } catch {
      setExports([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchExports();
  }, [fetchExports]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Export Monitor</h2>

      {/* Top cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-lg border border-[rgba(79,70,229,0.2)] bg-[#1A0626]/60 p-4">
          <div className="text-sm text-[#94A3B8]">Today</div>
          <div className="text-2xl font-bold text-white mt-1">{todayCount}</div>
        </div>
        <div className="rounded-lg border border-[rgba(79,70,229,0.2)] bg-[#1A0626]/60 p-4">
          <div className="text-sm text-[#94A3B8]">Success Rate (week)</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{successRate.toFixed(1)}%</div>
        </div>
        <div className="rounded-lg border border-[rgba(79,70,229,0.2)] bg-[#1A0626]/60 p-4">
          <div className="text-sm text-[#94A3B8]">Failed (week)</div>
          <div className="text-2xl font-bold text-red-400 mt-1">{failedWeek}</div>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 mb-4">
        {["", "DONE", "FAILED", "QUEUED", "RUNNING"].map((s) => (
          <button
            key={s}
            onClick={() => {
              setStatusFilter(s);
              setPage(1);
            }}
            className={`px-3 py-1.5 text-xs rounded-full font-medium transition-all ${
              statusFilter === s
                ? "bg-[#4F46E5] text-white"
                : "bg-[#1A0626]/60 text-[#94A3B8] border border-[rgba(79,70,229,0.2)] hover:border-[rgba(79,70,229,0.4)]"
            }`}
          >
            {s || "ALL"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-[#94A3B8] py-8 text-center">Loading exports...</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-[rgba(79,70,229,0.2)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#1A0626]/60 border-b border-[rgba(79,70,229,0.2)]">
                  <th className="text-left px-4 py-3 text-[#94A3B8] font-medium">Time</th>
                  <th className="text-left px-4 py-3 text-[#94A3B8] font-medium">User</th>
                  <th className="text-left px-4 py-3 text-[#94A3B8] font-medium">Project</th>
                  <th className="text-left px-4 py-3 text-[#94A3B8] font-medium">Type</th>
                  <th className="text-left px-4 py-3 text-[#94A3B8] font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {exports.map((exp) => (
                  <>
                    <tr
                      key={exp.id}
                      className={`border-b border-[rgba(79,70,229,0.1)] hover:bg-[rgba(79,70,229,0.05)] transition-colors ${
                        exp.status === "FAILED" ? "cursor-pointer" : ""
                      }`}
                      onClick={() => {
                        if (exp.status === "FAILED") {
                          setExpandedId(expandedId === exp.id ? null : exp.id);
                        }
                      }}
                    >
                      <td className="px-4 py-3 text-[#94A3B8] whitespace-nowrap">
                        {new Date(exp.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-white">{exp.user.email}</td>
                      <td className="px-4 py-3 text-[#CBD5E1]">{exp.project.name}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono text-[#A78BFA]">{exp.exportType}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${STATUS_BADGE[exp.status] || ""}`}
                        >
                          {exp.status}
                        </span>
                      </td>
                    </tr>
                    {expandedId === exp.id && exp.errorMessage && (
                      <tr key={`${exp.id}-error`}>
                        <td colSpan={5} className="px-4 py-3 bg-red-500/5">
                          <pre className="text-xs text-red-400 whitespace-pre-wrap font-mono">
                            {exp.errorMessage}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
                {exports.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">
                      No exports found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <span className="text-sm text-[#94A3B8]">
                Page {page} of {totalPages} ({total} total)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm rounded border border-[rgba(79,70,229,0.3)] text-white disabled:opacity-30 hover:bg-[rgba(79,70,229,0.1)] transition-colors"
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm rounded border border-[rgba(79,70,229,0.3)] text-white disabled:opacity-30 hover:bg-[rgba(79,70,229,0.1)] transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
