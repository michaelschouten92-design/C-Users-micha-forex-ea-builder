/**
 * StrategyHeader — full-width header for the Strategy Detail Page.
 *
 * Shows: name, connection, monitoring status, lifecycle, health score, last eval.
 */

import Link from "next/link";
import { MonitoringStatusBadge } from "./monitoring-status-badge";
import { HealthScoreBar } from "./health-score-bar";
import type { StrategyDetailData } from "@/app/app/strategy/[instanceId]/load-strategy-detail";

const LIFECYCLE_LABELS: Record<string, string> = {
  LIVE_MONITORING: "Monitoring",
  EDGE_AT_RISK: "Edge at Risk",
  INVALIDATED: "Invalidated",
  VERIFIED: "Verified",
  BACKTESTED: "Backtested",
  DRAFT: "Draft",
};

function formatRelativeTime(isoStr: string | null): string {
  if (!isoStr) return "Never";
  const diffMs = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface StrategyHeaderProps {
  data: StrategyDetailData;
}

export function StrategyHeader({ data }: StrategyHeaderProps) {
  const borderColor =
    data.monitoringStatus === "INVALIDATED"
      ? "rgba(239,68,68,0.4)"
      : data.monitoringStatus === "AT_RISK"
        ? "rgba(245,158,11,0.3)"
        : data.hasHealthData
          ? "rgba(16,185,129,0.25)"
          : "rgba(79,70,229,0.15)";

  const connectionColor =
    data.status === "ONLINE" ? "#10B981" : data.status === "ERROR" ? "#EF4444" : "#7C8DB0";

  return (
    <div
      className="rounded-xl bg-[#1A0626] p-4 sm:p-5"
      style={{
        border: `1px solid ${borderColor}`,
        borderLeft: `3px solid ${borderColor}`,
      }}
    >
      {/* Back link */}
      <Link
        href="/app"
        className="inline-flex items-center gap-1 text-[10px] text-[#7C8DB0] hover:text-white transition-colors mb-3"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Dashboard
      </Link>

      {/* Main header row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Left: Name + connection + badges */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2.5">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: connectionColor }}
              title={data.status}
            />
            <h1 className="text-xl font-bold text-white tracking-tight">{data.eaName}</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {data.hasHealthData ? (
              <MonitoringStatusBadge status={data.monitoringStatus} size="md" />
            ) : (
              <span className="text-[10px] text-[#7C8DB0] font-medium px-2 py-0.5 rounded-full border border-[rgba(79,70,229,0.15)] bg-[rgba(79,70,229,0.08)]">
                Awaiting Data
              </span>
            )}
            <span
              className="text-[10px] font-medium px-2 py-0.5 rounded-full border"
              style={{
                backgroundColor: "rgba(79,70,229,0.08)",
                color: "#7C8DB0",
                borderColor: "rgba(79,70,229,0.15)",
              }}
            >
              {data.isAutoDiscovered
                ? "Discovered"
                : (LIFECYCLE_LABELS[data.lifecycleState] ?? data.lifecycleState)}
            </span>
            {data.symbol && <span className="text-[10px] text-[#7C8DB0]">{data.symbol}</span>}
            {data.timeframe && (
              <>
                <span className="text-[10px] text-[#7C8DB0]">&middot;</span>
                <span className="text-[10px] text-[#7C8DB0]">{data.timeframe}</span>
              </>
            )}
          </div>
        </div>

        {/* Right: Health score + last eval */}
        <div className="flex flex-col items-start sm:items-end gap-2.5 min-w-0 sm:min-w-[220px]">
          <div className="w-full max-w-[240px]">
            <HealthScoreBar
              score={data.health ? Math.round(data.health.overallScore * 100) : null}
            />
          </div>
          <div className="flex items-center gap-3 text-[10px] text-[#7C8DB0]">
            {data.health && <span>Last eval: {formatRelativeTime(data.health.createdAt)}</span>}
            {data.lastHeartbeat && <span>Heartbeat: {formatRelativeTime(data.lastHeartbeat)}</span>}
          </div>
          {data.health?.driftDetected && (
            <span className="text-[10px] text-[#EF4444] font-medium flex items-center gap-1">
              <span>&#9660;</span> Drift detected
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
