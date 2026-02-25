"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";

interface HealthData {
  services: {
    database: { status: string; latency: number };
    redis: { status: string; latency: number };
    stripe: { status: string; latency: number };
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
  monitoring: {
    silentEAs: number;
    degradedStrategies: number;
  };
  verification: {
    staleChains: number;
  };
  jobs: {
    failedRecent: number;
  };
}

type DomainStatus = "green" | "yellow" | "red";

interface Domain {
  label: string;
  status: DomainStatus;
  tooltip: string;
}

function computeDomains(h: HealthData): Domain[] {
  // 1. Infrastructure — DB + Redis + Stripe
  const infra = (() => {
    const services = [h.services.database, h.services.redis, h.services.stripe];
    const errors = services.filter((s) => s.status === "error").length;
    if (errors > 0) return { status: "red" as const, tooltip: `${errors} service(s) down` };
    const slow = services.filter((s) => s.latency > 1000).length;
    if (slow > 0) return { status: "yellow" as const, tooltip: `${slow} service(s) slow (>1s)` };
    return { status: "green" as const, tooltip: "All services healthy" };
  })();

  // 2. Exports — queue depth + failure rate
  const exports = (() => {
    const rate = parseFloat(h.exports.failureRate);
    if (rate > 20 || h.exports.queueDepth > 20)
      return {
        status: "red" as const,
        tooltip: `Queue: ${h.exports.queueDepth}, Failure rate: ${h.exports.failureRate}%`,
      };
    if (rate > 5 || h.exports.queueDepth > 10)
      return {
        status: "yellow" as const,
        tooltip: `Queue: ${h.exports.queueDepth}, Failure rate: ${h.exports.failureRate}%`,
      };
    return {
      status: "green" as const,
      tooltip: `Queue: ${h.exports.queueDepth}, Failure rate: ${h.exports.failureRate}%`,
    };
  })();

  // 3. Live EAs — online/offline/error
  const eas = (() => {
    if (h.eas.error > 0)
      return {
        status: "red" as const,
        tooltip: `${h.eas.error} in ERROR, ${h.eas.online} online, ${h.eas.offline} offline`,
      };
    if (h.eas.offline > h.eas.online && h.eas.online > 0)
      return {
        status: "yellow" as const,
        tooltip: `${h.eas.online} online, ${h.eas.offline} offline`,
      };
    return {
      status: "green" as const,
      tooltip: `${h.eas.online} online, ${h.eas.offline} offline`,
    };
  })();

  // 4. Monitoring — silent EAs + degraded strategies
  const monitoring = (() => {
    if (h.monitoring.degradedStrategies > 0)
      return {
        status: "red" as const,
        tooltip: `${h.monitoring.silentEAs} silent, ${h.monitoring.degradedStrategies} degraded`,
      };
    if (h.monitoring.silentEAs > 0)
      return { status: "yellow" as const, tooltip: `${h.monitoring.silentEAs} silent EAs` };
    return { status: "green" as const, tooltip: "All strategies reporting" };
  })();

  // 5. Verification — stale chains
  const verification = (() => {
    if (h.verification.staleChains > 3)
      return { status: "red" as const, tooltip: `${h.verification.staleChains} stale chains` };
    if (h.verification.staleChains > 0)
      return { status: "yellow" as const, tooltip: `${h.verification.staleChains} stale chain(s)` };
    return { status: "green" as const, tooltip: "All chains current" };
  })();

  // 6. Jobs — recent failures
  const jobs = (() => {
    if (h.jobs.failedRecent > 5)
      return { status: "red" as const, tooltip: `${h.jobs.failedRecent} failed in last hour` };
    if (h.jobs.failedRecent > 0)
      return { status: "yellow" as const, tooltip: `${h.jobs.failedRecent} failed in last hour` };
    return { status: "green" as const, tooltip: "No recent failures" };
  })();

  return [
    { label: "Infrastructure", ...infra },
    { label: "Exports", ...exports },
    { label: "Live EAs", ...eas },
    { label: "Monitoring", ...monitoring },
    { label: "Verification", ...verification },
    { label: "Jobs", ...jobs },
  ];
}

const DOT_COLORS: Record<DomainStatus, string> = {
  green: "#10B981",
  yellow: "#F59E0B",
  red: "#EF4444",
};

export function HealthRadar() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await apiClient.get<HealthData>("/api/admin/system-health");
      setHealth(res);
    } catch {
      // non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") fetchHealth();
    }, 120_000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  if (loading || !health) {
    return (
      <div className="flex items-center gap-4 px-4 py-2.5 mb-6 rounded-lg border border-[rgba(79,70,229,0.2)] bg-[#1A0626]/60">
        <span className="text-xs text-[#94A3B8]">Loading health radar...</span>
      </div>
    );
  }

  const domains = computeDomains(health);

  return (
    <div className="flex flex-wrap items-center gap-4 px-4 py-2.5 mb-6 rounded-lg border border-[rgba(79,70,229,0.2)] bg-[#1A0626]/60">
      <span className="text-xs font-semibold text-[#A78BFA] uppercase tracking-wider mr-2">
        Health
      </span>
      {domains.map((domain) => (
        <div key={domain.label} className="group relative flex items-center gap-1.5">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: DOT_COLORS[domain.status] }}
          />
          <span className="text-xs text-[#CBD5E1]">{domain.label}</span>
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 rounded bg-[#0F0318] border border-[rgba(79,70,229,0.3)] text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
            {domain.tooltip}
          </div>
        </div>
      ))}
    </div>
  );
}
