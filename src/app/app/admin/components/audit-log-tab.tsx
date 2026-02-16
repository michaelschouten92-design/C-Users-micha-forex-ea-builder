"use client";

import { useEffect, useState, useCallback } from "react";
import { apiClient } from "@/lib/api-client";

interface AuditLogEntry {
  id: string;
  userId: string | null;
  eventType: string;
  resourceType: string | null;
  resourceId: string | null;
  metadata: string | null;
  ipAddress: string | null;
  createdAt: string;
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  auth: "bg-blue-500/20 text-blue-400 border-blue-500/50",
  project: "bg-emerald-500/20 text-emerald-400 border-emerald-500/50",
  export: "bg-cyan-500/20 text-cyan-400 border-cyan-500/50",
  subscription: "bg-purple-500/20 text-purple-400 border-purple-500/50",
  admin: "bg-amber-500/20 text-amber-400 border-amber-500/50",
};

function getEventColor(eventType: string): string {
  const prefix = eventType.split(".")[0];
  return (
    EVENT_TYPE_COLORS[prefix] ||
    "bg-[rgba(79,70,229,0.2)] text-[#94A3B8] border-[rgba(79,70,229,0.3)]"
  );
}

interface AuditLogTabProps {
  onUserClick: (userId: string) => void;
}

export function AuditLogTab({ onUserClick }: AuditLogTabProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [eventTypeFilter, setEventTypeFilter] = useState("");
  const [userIdFilter, setUserIdFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const limit = 50;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (eventTypeFilter) params.set("eventType", eventTypeFilter);
      if (userIdFilter) params.set("userId", userIdFilter);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);

      const res = await apiClient.get<{ data: AuditLogEntry[]; total: number }>(
        `/api/admin/audit-logs?${params}`
      );
      setLogs(res.data);
      setTotal(res.total);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [page, eventTypeFilter, userIdFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Audit Log</h2>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <select
          value={eventTypeFilter}
          onChange={(e) => {
            setEventTypeFilter(e.target.value);
            setPage(1);
          }}
          className="bg-[#0F0318] border border-[rgba(79,70,229,0.3)] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4F46E5] transition-colors"
        >
          <option value="">All Event Types</option>
          <option value="auth.login">auth.login</option>
          <option value="auth.logout">auth.logout</option>
          <option value="auth.password_reset_request">auth.password_reset_request</option>
          <option value="auth.password_reset_complete">auth.password_reset_complete</option>
          <option value="project.create">project.create</option>
          <option value="project.update">project.update</option>
          <option value="project.delete">project.delete</option>
          <option value="project.version_create">project.version_create</option>
          <option value="export.request">export.request</option>
          <option value="export.complete">export.complete</option>
          <option value="export.failed">export.failed</option>
          <option value="subscription.upgrade">subscription.upgrade</option>
          <option value="subscription.downgrade">subscription.downgrade</option>
          <option value="subscription.cancel">subscription.cancel</option>
          <option value="admin.impersonation_start">admin.impersonation_start</option>
          <option value="admin.impersonation_stop">admin.impersonation_stop</option>
        </select>
        <input
          type="text"
          placeholder="Filter by User ID..."
          value={userIdFilter}
          onChange={(e) => {
            setUserIdFilter(e.target.value);
            setPage(1);
          }}
          className="bg-[#0F0318] border border-[rgba(79,70,229,0.3)] rounded px-3 py-2 text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#4F46E5] transition-colors"
        />
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            setPage(1);
          }}
          className="bg-[#0F0318] border border-[rgba(79,70,229,0.3)] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4F46E5] transition-colors"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setPage(1);
          }}
          className="bg-[#0F0318] border border-[rgba(79,70,229,0.3)] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4F46E5] transition-colors"
        />
      </div>

      {loading ? (
        <div className="text-[#94A3B8] py-8 text-center">Loading audit logs...</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-[rgba(79,70,229,0.2)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#1A0626]/60 border-b border-[rgba(79,70,229,0.2)]">
                  <th className="text-left px-4 py-3 text-[#94A3B8] font-medium">Timestamp</th>
                  <th className="text-left px-4 py-3 text-[#94A3B8] font-medium">Event Type</th>
                  <th className="text-left px-4 py-3 text-[#94A3B8] font-medium">User</th>
                  <th className="text-left px-4 py-3 text-[#94A3B8] font-medium">Resource</th>
                  <th className="text-left px-4 py-3 text-[#94A3B8] font-medium">IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-[rgba(79,70,229,0.1)] hover:bg-[rgba(79,70,229,0.05)] transition-colors"
                  >
                    <td className="px-4 py-3 text-[#94A3B8] whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${getEventColor(log.eventType)}`}
                      >
                        {log.eventType}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {log.userId ? (
                        <button
                          onClick={() => onUserClick(log.userId!)}
                          className="text-[#22D3EE] hover:text-[#22D3EE]/80 text-xs font-mono transition-colors"
                        >
                          {log.userId.substring(0, 12)}...
                        </button>
                      ) : (
                        <span className="text-[#64748B]">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#94A3B8] text-xs">
                      {log.resourceType && (
                        <span>
                          {log.resourceType}
                          {log.resourceId && (
                            <span className="text-[#64748B] ml-1 font-mono">
                              {log.resourceId.substring(0, 8)}
                            </span>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#64748B] text-xs font-mono">
                      {log.ipAddress || "-"}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">
                      No audit logs found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
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
