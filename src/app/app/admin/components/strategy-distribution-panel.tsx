"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";

type StrategyStatus =
  | "CONSISTENT"
  | "MONITORING"
  | "TESTING"
  | "UNSTABLE"
  | "EDGE_DEGRADED"
  | "INACTIVE";

interface DistributionData {
  distribution: Record<StrategyStatus, number>;
  total: number;
}

const STATUS_CONFIG: { key: StrategyStatus; label: string; color: string }[] = [
  { key: "CONSISTENT", label: "Consistent", color: "#10B981" },
  { key: "MONITORING", label: "Monitoring", color: "#3B82F6" },
  { key: "TESTING", label: "Testing", color: "#A78BFA" },
  { key: "UNSTABLE", label: "Unstable", color: "#F59E0B" },
  { key: "EDGE_DEGRADED", label: "Edge Degraded", color: "#EF4444" },
  { key: "INACTIVE", label: "Inactive", color: "#64748B" },
];

export function StrategyDistributionPanel() {
  const [data, setData] = useState<DistributionData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await apiClient.get<DistributionData>("/api/admin/strategy-distribution");
      setData(res);
    } catch {
      // non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") fetchData();
    }, 120_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="rounded-lg border border-[rgba(79,70,229,0.2)] bg-[#1A0626]/60 p-6">
        <div className="text-[#94A3B8] text-sm">Loading strategy distribution...</div>
      </div>
    );
  }

  if (!data || data.total === 0) {
    return (
      <div className="rounded-lg border border-[rgba(79,70,229,0.2)] bg-[#1A0626]/60 p-6">
        <h3 className="text-sm font-semibold text-[#A78BFA] uppercase tracking-wider mb-3">
          Strategy Distribution
        </h3>
        <div className="text-[#7C8DB0] text-sm">No live strategies found</div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[rgba(79,70,229,0.2)] bg-[#1A0626]/60 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#A78BFA] uppercase tracking-wider">
          Strategy Distribution
        </h3>
        <span className="text-xs text-[#7C8DB0]">{data.total} total</span>
      </div>

      {/* Stacked bar */}
      <div className="h-4 rounded-full overflow-hidden flex bg-[#0A0118]">
        {STATUS_CONFIG.map(({ key, color }) => {
          const count = data.distribution[key];
          if (count === 0) return null;
          const pct = (count / data.total) * 100;
          return (
            <div
              key={key}
              style={{ width: `${pct}%`, backgroundColor: color }}
              className="transition-all duration-500"
              title={`${key}: ${count} (${pct.toFixed(1)}%)`}
            />
          );
        })}
      </div>

      {/* Mini stat cards */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mt-4">
        {STATUS_CONFIG.map(({ key, label, color }) => {
          const count = data.distribution[key];
          const pct = data.total > 0 ? ((count / data.total) * 100).toFixed(1) : "0.0";
          return (
            <div key={key} className="text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-xs text-[#94A3B8]">{label}</span>
              </div>
              <div className="text-lg font-bold text-white">{count}</div>
              <div className="text-xs text-[#7C8DB0]">{pct}%</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
