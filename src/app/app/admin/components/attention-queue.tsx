"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";

interface AttentionItem {
  id: string;
  type: string;
  severity: "critical" | "high" | "warning";
  title: string;
  detail: string;
  instanceId?: string;
  userId?: string;
  timestamp: string;
}

interface AttentionData {
  items: AttentionItem[];
}

const SEVERITY_CONFIG: Record<string, { border: string; icon: string; label: string }> = {
  critical: { border: "border-l-red-500", icon: "\u26A0", label: "Critical" },
  high: { border: "border-l-orange-500", icon: "\u26A1", label: "High" },
  warning: { border: "border-l-yellow-500", icon: "\u2139", label: "Warning" },
};

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function AttentionQueue() {
  const [data, setData] = useState<AttentionData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await apiClient.get<AttentionData>("/api/admin/attention-queue");
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
    }, 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="rounded-lg border border-[rgba(79,70,229,0.2)] bg-[#1A0626]/60 p-6">
        <div className="text-[#94A3B8] text-sm">Loading attention queue...</div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[rgba(79,70,229,0.2)] bg-[#1A0626]/60 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#A78BFA] uppercase tracking-wider">
          Attention Queue
        </h3>
        {data && data.items.length > 0 && (
          <span className="text-xs font-medium text-white bg-red-500/20 border border-red-500/30 px-2 py-0.5 rounded-full">
            {data.items.length} item{data.items.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {!data || data.items.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-2xl mb-2">&#x2714;&#xFE0F;</div>
          <div className="text-[#94A3B8] text-sm">All clear — nothing needs attention</div>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {data.items.map((item) => {
            const config = SEVERITY_CONFIG[item.severity] || SEVERITY_CONFIG.warning;
            return (
              <div
                key={item.id}
                className={`border-l-4 ${config.border} bg-[#0A0118]/50 rounded-r-lg px-4 py-3`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <span className="text-sm flex-shrink-0">{config.icon}</span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-white truncate">{item.title}</div>
                      <div className="text-xs text-[#94A3B8] mt-0.5 truncate">{item.detail}</div>
                    </div>
                  </div>
                  <span className="text-xs text-[#7C8DB0] whitespace-nowrap flex-shrink-0">
                    {timeAgo(item.timestamp)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
