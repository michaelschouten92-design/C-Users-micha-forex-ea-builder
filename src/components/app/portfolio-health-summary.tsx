/**
 * PortfolioHealthSummary — Layer 3 portfolio operational summary.
 *
 * Shows deployment-level counts and aggregate operational status.
 * Explicitly labeled as "Deployment Overview" — not strategy validation.
 * Designed for 3-second scan: numbers, not charts.
 */

import type { PortfolioOperationalSummary } from "@/lib/semantic-layers";

type OverallStatus = "HEALTHY" | "ATTENTION" | "CRITICAL" | "NO_DATA";

function deriveOverallStatus(summary: PortfolioOperationalSummary): OverallStatus {
  switch (summary.operationalStatus) {
    case "NO_DATA":
      return "NO_DATA";
    case "CRITICAL":
      return "CRITICAL";
    case "NEEDS_ATTENTION":
      return "ATTENTION";
    case "ALL_CLEAR":
      return "HEALTHY";
  }
}

const STATUS_CONFIG: Record<OverallStatus, { color: string; label: string }> = {
  HEALTHY: { color: "#10B981", label: "All Deployments Healthy" },
  ATTENTION: { color: "#F59E0B", label: "Deployment Needs Attention" },
  CRITICAL: { color: "#EF4444", label: "Deployment Invalidated" },
  NO_DATA: { color: "#7C8DB0", label: "No Deployments" },
};

interface PortfolioHealthSummaryProps {
  /** Accepts either the new PortfolioOperationalSummary or legacy summary shape. */
  summary: PortfolioOperationalSummary | LegacySummary;
}

/** Legacy shape for backward compatibility during transition. */
interface LegacySummary {
  total: number;
  healthy: number;
  atRisk: number;
  invalidated: number;
  online: number;
  driftCount: number;
  avgHealthScore: number | null;
}

function isPortfolioSummary(
  s: PortfolioOperationalSummary | LegacySummary
): s is PortfolioOperationalSummary {
  return "_type" in s && s._type === "portfolio_operational";
}

function toPortfolioShape(s: PortfolioOperationalSummary | LegacySummary) {
  if (isPortfolioSummary(s)) {
    return {
      healthy: s.healthyCount,
      atRisk: s.atRiskCount,
      invalidated: s.invalidatedCount,
      online: s.onlineCount,
      total: s.totalInstances,
      driftCount: s.driftCount,
      avgHealthScore: s.avgHealthScore,
      operationalStatus: s.operationalStatus,
    };
  }
  return {
    healthy: s.healthy,
    atRisk: s.atRisk,
    invalidated: s.invalidated,
    online: s.online,
    total: s.total,
    driftCount: s.driftCount,
    avgHealthScore: s.avgHealthScore,
    operationalStatus:
      s.invalidated > 0
        ? ("CRITICAL" as const)
        : s.atRisk > 0
          ? ("NEEDS_ATTENTION" as const)
          : s.total === 0
            ? ("NO_DATA" as const)
            : ("ALL_CLEAR" as const),
  };
}

export function PortfolioHealthSummary({ summary }: PortfolioHealthSummaryProps) {
  const data = toPortfolioShape(summary);
  const overall =
    data.total === 0
      ? ("NO_DATA" as OverallStatus)
      : data.invalidated > 0
        ? ("CRITICAL" as OverallStatus)
        : data.atRisk > 0
          ? ("ATTENTION" as OverallStatus)
          : ("HEALTHY" as OverallStatus);
  const config = STATUS_CONFIG[overall];

  if (overall === "NO_DATA") return null;

  return (
    <div
      className="rounded-xl bg-[#1A0626] p-4 sm:p-5"
      style={{
        border: `1px solid ${config.color}25`,
        borderLeft: `3px solid ${config.color}`,
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Left: Overall status */}
        <div className="flex items-center gap-3">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: config.color }}
          />
          <div>
            <h2 className="text-sm font-semibold text-white">Deployment Overview</h2>
            <p className="text-xs font-medium" style={{ color: config.color }}>
              {config.label}
            </p>
          </div>
        </div>

        {/* Right: Counts — explicitly about deployments, not strategies */}
        <div className="flex items-center gap-4 sm:gap-6">
          <CountPill label="Healthy" count={data.healthy} color="#10B981" />
          <CountPill label="At Risk" count={data.atRisk} color="#F59E0B" />
          <CountPill label="Invalidated" count={data.invalidated} color="#EF4444" />

          {/* Divider */}
          <div className="hidden sm:block w-px h-6 bg-[rgba(79,70,229,0.15)]" />

          {/* Aggregates */}
          <div className="hidden sm:flex items-center gap-4">
            {data.avgHealthScore !== null && (
              <div className="text-center">
                <p className="text-[10px] text-[#7C8DB0]">Avg Score</p>
                <p className="text-xs font-medium text-[#CBD5E1]">{data.avgHealthScore}%</p>
              </div>
            )}
            {data.driftCount > 0 && (
              <div className="text-center">
                <p className="text-[10px] text-[#7C8DB0]">Drift</p>
                <p className="text-xs font-medium text-[#F59E0B]">{data.driftCount}</p>
              </div>
            )}
            <div className="text-center">
              <p className="text-[10px] text-[#7C8DB0]">Online</p>
              <p className="text-xs font-medium text-[#CBD5E1]">
                {data.online}/{data.total}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CountPill({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="text-center">
      <p className="text-lg font-bold" style={{ color: count > 0 ? color : "#7C8DB0" }}>
        {count}
      </p>
      <p className="text-[10px] text-[#7C8DB0]">{label}</p>
    </div>
  );
}
