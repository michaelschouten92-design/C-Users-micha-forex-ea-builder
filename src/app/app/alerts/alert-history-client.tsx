"use client";

import { useState, useEffect, useCallback } from "react";
import { getCsrfHeaders } from "@/lib/api-client";

interface Delivery {
  channel: string;
  status: string;
  error: string | null;
}

interface AlertItem {
  id: string;
  alertType: string;
  summary: string;
  acknowledgedAt: string | null;
  createdAt: string;
  instance: { eaName: string; symbol: string | null } | null;
  deliveries: Delivery[];
}

const ALERT_TYPE_LABELS: Record<string, string> = {
  DEPLOYMENT_INVALIDATED: "Deployment Invalidated",
  DEPLOYMENT_RESTRICTED: "Edge at Risk",
  DEPLOYMENT_REVIEW: "Review Required",
  MONITOR_OFFLINE: "Monitor Offline",
  BASELINE_MISSING: "Baseline Missing",
  VERSION_OUTDATED: "Version Outdated",
  HEALTH_DEGRADED: "Health Degraded",
  HEALTH_CRITICAL: "Health Critical",
  EDGE_DECAY_WARNING: "Edge Decay Warning",
};

const SEVERITY_COLORS: Record<string, string> = {
  DEPLOYMENT_INVALIDATED: "#EF4444",
  HEALTH_CRITICAL: "#EF4444",
  DEPLOYMENT_RESTRICTED: "#F59E0B",
  HEALTH_DEGRADED: "#F59E0B",
  EDGE_DECAY_WARNING: "#F59E0B",
  DEPLOYMENT_REVIEW: "#818CF8",
  MONITOR_OFFLINE: "#818CF8",
  BASELINE_MISSING: "#7C8DB0",
  VERSION_OUTDATED: "#7C8DB0",
};

const CHANNEL_LABELS: Record<string, string> = {
  EMAIL: "Email",
  WEBHOOK: "Webhook",
  TELEGRAM: "Telegram",
  BROWSER_PUSH: "Push",
  SLACK: "Slack",
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDateTime(iso);
}

function DeliveryBadge({ delivery }: { delivery: Delivery }) {
  const isSuccess = delivery.status === "SENT";
  const isFailed = delivery.status === "FAILED" || delivery.status === "DEAD";

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
        isSuccess
          ? "bg-[#10B981]/10 text-[#10B981]"
          : isFailed
            ? "bg-[#EF4444]/10 text-[#EF4444]"
            : "bg-[#F59E0B]/10 text-[#F59E0B]"
      }`}
      title={delivery.error ?? undefined}
    >
      <span
        className={`w-1 h-1 rounded-full ${
          isSuccess ? "bg-[#10B981]" : isFailed ? "bg-[#EF4444]" : "bg-[#F59E0B]"
        }`}
      />
      {CHANNEL_LABELS[delivery.channel] ?? delivery.channel}
    </span>
  );
}

function AlertRow({
  alert,
  onAcknowledge,
}: {
  alert: AlertItem;
  onAcknowledge: (id: string) => void;
}) {
  const color = SEVERITY_COLORS[alert.alertType] ?? "#7C8DB0";
  const label = ALERT_TYPE_LABELS[alert.alertType] ?? alert.alertType;
  const strategyLabel = alert.instance
    ? (alert.instance.symbol ?? alert.instance.eaName)
    : "Unknown";

  return (
    <div
      className={`rounded-xl border bg-[#111114] p-4 transition-colors ${
        alert.acknowledgedAt
          ? "border-[rgba(255,255,255,0.04)] opacity-60"
          : "border-[rgba(255,255,255,0.08)]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {/* Severity dot */}
          <div
            className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
            style={{ backgroundColor: color }}
          />
          <div className="min-w-0">
            {/* Type + strategy */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-white">{label}</span>
              <span className="text-xs text-[#7C8DB0]">{strategyLabel}</span>
            </div>
            {/* Summary */}
            <p className="text-xs text-[#94A3B8] mt-0.5 line-clamp-2">{alert.summary}</p>
            {/* Deliveries */}
            {alert.deliveries.length > 0 && (
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-[10px] text-[#7C8DB0]">Sent via:</span>
                {alert.deliveries.map((d, i) => (
                  <DeliveryBadge key={i} delivery={d} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: time + acknowledge */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="text-[11px] text-[#7C8DB0] whitespace-nowrap">
            {formatRelative(alert.createdAt)}
          </span>
          {!alert.acknowledgedAt && (
            <button
              onClick={() => onAcknowledge(alert.id)}
              className="text-[10px] text-[#818CF8] hover:text-white transition-colors"
            >
              Acknowledge
            </button>
          )}
          {alert.acknowledgedAt && <span className="text-[10px] text-[#10B981]">Acknowledged</span>}
        </div>
      </div>
    </div>
  );
}

export function AlertHistoryClient() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState<"all" | "unacknowledged">("all");

  const fetchAlerts = useCallback(async (cursor?: string) => {
    const url = cursor
      ? `/api/alerts/history?cursor=${cursor}&limit=50`
      : "/api/alerts/history?limit=50";
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.json() as Promise<{ items: AlertItem[]; nextCursor: string | null }>;
  }, []);

  useEffect(() => {
    fetchAlerts().then((data) => {
      if (data) {
        setAlerts(data.items);
        setNextCursor(data.nextCursor);
      }
      setLoading(false);
    });
  }, [fetchAlerts]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    const data = await fetchAlerts(nextCursor);
    if (data) {
      setAlerts((prev) => [...prev, ...data.items]);
      setNextCursor(data.nextCursor);
    }
    setLoadingMore(false);
  }

  async function handleAcknowledge(id: string) {
    const res = await fetch(`/api/alerts/${id}/acknowledge`, {
      method: "POST",
      headers: getCsrfHeaders(),
    });
    if (res.ok) {
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, acknowledgedAt: new Date().toISOString() } : a))
      );
    }
  }

  async function handleAcknowledgeAll() {
    const res = await fetch("/api/alerts/acknowledge-all", {
      method: "POST",
      headers: getCsrfHeaders(),
    });
    if (res.ok) {
      setAlerts((prev) =>
        prev.map((a) => ({
          ...a,
          acknowledgedAt: a.acknowledgedAt ?? new Date().toISOString(),
        }))
      );
    }
  }

  const filtered = filter === "unacknowledged" ? alerts.filter((a) => !a.acknowledgedAt) : alerts;

  const unackCount = alerts.filter((a) => !a.acknowledgedAt).length;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <svg className="w-5 h-5 text-[#818CF8] animate-spin" fill="none" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="text-center py-16 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114]">
        <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-[rgba(255,255,255,0.04)] flex items-center justify-center">
          <svg
            className="w-6 h-6 text-[#7C8DB0]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </div>
        <h3 className="text-sm font-medium text-white mb-1">No alerts yet</h3>
        <p className="text-xs text-[#7C8DB0]">
          Alerts will appear here when your strategies need attention.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filter === "all"
                ? "bg-[rgba(255,255,255,0.08)] text-white"
                : "text-[#7C8DB0] hover:text-white"
            }`}
          >
            All ({alerts.length})
          </button>
          <button
            onClick={() => setFilter("unacknowledged")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filter === "unacknowledged"
                ? "bg-[rgba(255,255,255,0.08)] text-white"
                : "text-[#7C8DB0] hover:text-white"
            }`}
          >
            Unread ({unackCount})
          </button>
        </div>
        {unackCount > 0 && (
          <button
            onClick={handleAcknowledgeAll}
            className="text-xs text-[#818CF8] hover:text-white transition-colors"
          >
            Acknowledge all
          </button>
        )}
      </div>

      {/* Alert list */}
      <div className="space-y-2">
        {filtered.map((alert) => (
          <AlertRow key={alert.id} alert={alert} onAcknowledge={handleAcknowledge} />
        ))}
      </div>

      {/* Load more */}
      {nextCursor && (
        <div className="flex justify-center pt-4">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="px-5 py-2 text-sm text-[#818CF8] border border-[rgba(79,70,229,0.3)] rounded-lg hover:bg-[rgba(79,70,229,0.1)] disabled:opacity-50 transition-colors"
          >
            {loadingMore ? "Loading..." : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
