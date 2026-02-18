"use client";

import { useEffect, useState, useCallback } from "react";
import { apiClient } from "@/lib/api-client";

interface HealthData {
  services: {
    database: { status: "ok" | "error"; latency: number };
    redis: { status: "ok" | "error" | "unconfigured"; latency: number };
    stripe: { status: "ok" | "error" | "unconfigured"; latency: number };
  };
  exports: {
    queueDepth: number;
    failureRate: string;
    failed24h: number;
    total24h: number;
  };
  webhooks: {
    count24h: number;
  };
  eas: {
    online: number;
    offline: number;
    error: number;
  };
}

function StatusDot({ status }: { status: "ok" | "error" | "unconfigured" | "warning" }) {
  const colors = {
    ok: "bg-emerald-400",
    error: "bg-red-400",
    unconfigured: "bg-[#64748B]",
    warning: "bg-amber-400",
  };

  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${colors[status]} mr-2`} />;
}

export function SystemHealthTab() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await apiClient.get<HealthData>("/api/admin/system-health");
      setHealth(res);
      setLastUpdated(new Date());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  if (loading) {
    return <div className="text-[#94A3B8] py-8 text-center">Loading system health...</div>;
  }

  if (!health) {
    return <div className="text-red-400 py-8 text-center">Failed to load system health</div>;
  }

  const exportStatus: "ok" | "warning" | "error" =
    parseFloat(health.exports.failureRate) > 20
      ? "error"
      : parseFloat(health.exports.failureRate) > 5
        ? "warning"
        : "ok";

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">System Health</h2>
        {lastUpdated && (
          <span className="text-xs text-[#64748B]">
            Last updated: {lastUpdated.toLocaleTimeString()} (auto-refresh 30s)
          </span>
        )}
      </div>

      {/* Services */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="rounded-lg border border-[rgba(79,70,229,0.2)] bg-[#1A0626]/60 p-4">
          <div className="flex items-center mb-2">
            <StatusDot status={health.services.database.status} />
            <span className="text-white font-medium">Database</span>
          </div>
          <div className="text-sm text-[#94A3B8]">
            Latency: <span className="text-white">{health.services.database.latency}ms</span>
          </div>
        </div>

        <div className="rounded-lg border border-[rgba(79,70,229,0.2)] bg-[#1A0626]/60 p-4">
          <div className="flex items-center mb-2">
            <StatusDot status={health.services.redis.status} />
            <span className="text-white font-medium">Redis</span>
          </div>
          <div className="text-sm text-[#94A3B8]">
            {health.services.redis.status === "unconfigured" ? (
              "Not configured"
            ) : (
              <>
                Latency: <span className="text-white">{health.services.redis.latency}ms</span>
              </>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-[rgba(79,70,229,0.2)] bg-[#1A0626]/60 p-4">
          <div className="flex items-center mb-2">
            <StatusDot status={health.services.stripe.status} />
            <span className="text-white font-medium">Stripe</span>
          </div>
          <div className="text-sm text-[#94A3B8]">
            {health.services.stripe.status === "unconfigured" ? (
              "Not configured"
            ) : (
              <>
                Latency: <span className="text-white">{health.services.stripe.latency}ms</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Exports & Webhooks */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-lg border border-[rgba(79,70,229,0.2)] bg-[#1A0626]/60 p-4">
          <div className="flex items-center mb-2">
            <StatusDot status={health.exports.queueDepth > 10 ? "warning" : "ok"} />
            <span className="text-sm text-[#94A3B8]">Export Queue</span>
          </div>
          <div className="text-2xl font-bold text-white">{health.exports.queueDepth}</div>
        </div>

        <div className="rounded-lg border border-[rgba(79,70,229,0.2)] bg-[#1A0626]/60 p-4">
          <div className="flex items-center mb-2">
            <StatusDot status={exportStatus} />
            <span className="text-sm text-[#94A3B8]">Failure Rate (24h)</span>
          </div>
          <div className="text-2xl font-bold text-white">{health.exports.failureRate}%</div>
          <div className="text-xs text-[#64748B]">
            {health.exports.failed24h} / {health.exports.total24h}
          </div>
        </div>

        <div className="rounded-lg border border-[rgba(79,70,229,0.2)] bg-[#1A0626]/60 p-4">
          <div className="text-sm text-[#94A3B8] mb-2">Webhooks (24h)</div>
          <div className="text-2xl font-bold text-white">{health.webhooks.count24h}</div>
        </div>

        <div className="rounded-lg border border-[rgba(79,70,229,0.2)] bg-[#1A0626]/60 p-4">
          <div className="text-sm text-[#94A3B8] mb-2">Live EAs</div>
          <div className="flex gap-4 mt-1">
            <div>
              <span className="text-emerald-400 font-bold">{health.eas.online}</span>
              <span className="text-xs text-[#64748B] ml-1">online</span>
            </div>
            <div>
              <span className="text-gray-400 font-bold">{health.eas.offline}</span>
              <span className="text-xs text-[#64748B] ml-1">offline</span>
            </div>
            <div>
              <span className="text-red-400 font-bold">{health.eas.error}</span>
              <span className="text-xs text-[#64748B] ml-1">error</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
