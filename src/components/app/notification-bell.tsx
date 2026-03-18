"use client";

/**
 * NotificationBell — client component for the control-layer alert feed.
 *
 * Shows a bell icon with unread count badge. Clicking opens a dropdown
 * with recent unacknowledged alerts. Each alert can be acknowledged inline.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { getCsrfHeaders } from "@/lib/api-client";

interface AlertItem {
  id: string;
  instanceId: string;
  alertType: string;
  summary: string;
  reasons: string[] | null;
  acknowledgedAt: string | null;
  webhookStatus: string | null;
  createdAt: string;
  instance: { eaName: string };
}

const WEBHOOK_STATUS_LABEL: Record<string, { text: string; color: string }> = {
  DELIVERED: { text: "Webhook sent", color: "#10B981" },
  FAILED: { text: "Webhook failed", color: "#EF4444" },
  SKIPPED: { text: "No webhook", color: "#71717A" },
};

const ALERT_TYPE_COLORS: Record<string, string> = {
  DEPLOYMENT_INVALIDATED: "#EF4444",
  DEPLOYMENT_RESTRICTED: "#F59E0B",
  DEPLOYMENT_REVIEW: "#F59E0B",
  MONITOR_OFFLINE: "#71717A",
  BASELINE_MISSING: "#7C8DB0",
  VERSION_OUTDATED: "#7C8DB0",
};

function formatTimeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationBell() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const mutatingRef = useRef(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchAlerts = useCallback(async () => {
    // Skip fetch while an acknowledge operation is in flight to prevent
    // stale server state from overwriting the optimistic UI update.
    if (mutatingRef.current) return;
    try {
      const res = await fetch("/api/alerts?limit=10");
      if (!res.ok) return;
      const data = await res.json();
      setAlerts(data.alerts ?? []);
      setTotal(data.total ?? 0);
    } catch {
      // Silently fail — non-critical UI feature
    }
  }, []);

  // Initial fetch + poll every 60s
  useEffect(() => {
    void fetchAlerts();
    const interval = setInterval(() => void fetchAlerts(), 60_000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const acknowledge = async (alertId: string) => {
    // Optimistic update — remove immediately from UI
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    setTotal((prev) => Math.max(0, prev - 1));
    mutatingRef.current = true;
    try {
      const res = await fetch(`/api/alerts/${alertId}/acknowledge`, {
        method: "POST",
        headers: getCsrfHeaders(),
      });
      if (!res.ok) {
        // Revert on failure — re-fetch server state
        mutatingRef.current = false;
        await fetchAlerts();
        return;
      }
    } catch {
      mutatingRef.current = false;
      await fetchAlerts();
      return;
    }
    mutatingRef.current = false;
  };

  const acknowledgeAll = async () => {
    const prevAlerts = alerts;
    // Optimistic update
    setAlerts([]);
    setTotal(0);
    mutatingRef.current = true;
    setDismissing(true);
    try {
      // Single server-side query acknowledges ALL unacknowledged alerts,
      // not just the loaded page of 10.
      const res = await fetch("/api/alerts/acknowledge-all", {
        method: "POST",
        headers: getCsrfHeaders(),
      });
      if (!res.ok) throw new Error("acknowledge-all failed");
    } catch {
      // Revert on failure
      mutatingRef.current = false;
      setDismissing(false);
      setAlerts(prevAlerts);
      setTotal(prevAlerts.length);
      return;
    }
    mutatingRef.current = false;
    setDismissing(false);
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative p-1.5 text-[#71717A] hover:text-white transition-colors"
        aria-label={`Alerts${total > 0 ? ` (${total} unread)` : ""}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-5 h-5"
        >
          <path
            fillRule="evenodd"
            d="M10 2a6 6 0 00-6 6c0 1.887-.454 3.665-1.257 5.234a.75.75 0 00.515 1.076 32.91 32.91 0 003.256.508 3.5 3.5 0 006.972 0 32.903 32.903 0 003.256-.508.75.75 0 00.515-1.076A11.448 11.448 0 0116 8a6 6 0 00-6-6zM8.05 14.943a33.54 33.54 0 003.9 0 2 2 0 01-3.9 0z"
            clipRule="evenodd"
          />
        </svg>
        {total > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center text-[10px] font-bold text-white bg-[#EF4444] rounded-full px-1">
            {total > 9 ? "9+" : total}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-[#1A1A1F] border border-[rgba(255,255,255,0.08)] rounded-xl shadow-2xl overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.06)]">
            <span className="text-sm font-medium text-white">Alerts</span>
            {alerts.length > 0 && (
              <button
                type="button"
                onClick={acknowledgeAll}
                disabled={dismissing}
                className="text-[10px] text-[#818CF8] hover:text-white transition-colors disabled:opacity-50"
              >
                {dismissing ? "Dismissing..." : "Dismiss all"}
              </button>
            )}
          </div>

          {/* Alert list */}
          <div className="max-h-80 overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-xs text-[#71717A]">No unread alerts</p>
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="px-4 py-3 border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{
                            backgroundColor: ALERT_TYPE_COLORS[alert.alertType] ?? "#7C8DB0",
                          }}
                        />
                        <span className="text-xs font-medium text-white truncate">
                          {alert.instance.eaName}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#A1A1AA] leading-relaxed">{alert.summary}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-[#71717A]">
                          {formatTimeAgo(alert.createdAt)}
                        </span>
                        {alert.webhookStatus && WEBHOOK_STATUS_LABEL[alert.webhookStatus] && (
                          <span
                            className="text-[9px]"
                            style={{
                              color: WEBHOOK_STATUS_LABEL[alert.webhookStatus].color,
                            }}
                          >
                            {WEBHOOK_STATUS_LABEL[alert.webhookStatus].text}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        acknowledge(alert.id);
                      }}
                      disabled={false}
                      className="flex-shrink-0 text-[10px] text-[#71717A] hover:text-white transition-colors px-1.5 py-0.5 rounded disabled:opacity-50"
                      title="Dismiss"
                    >
                      &times;
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
