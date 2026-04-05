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
  summary: PortfolioOperationalSummary;
}

export function PortfolioHealthSummary({ summary }: PortfolioHealthSummaryProps) {
  const overall = deriveOverallStatus(summary);
  const config = STATUS_CONFIG[overall];

  if (overall === "NO_DATA") return null;

  return (
    <div
      className="rounded-xl bg-[#111114] p-4 sm:p-5"
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
          <CountPill label="Healthy" count={summary.healthyCount} color="#10B981" />
          <CountPill label="At Risk" count={summary.atRiskCount} color="#F59E0B" />
          <CountPill label="Invalidated" count={summary.invalidatedCount} color="#EF4444" />

          {/* Divider */}
          <div className="hidden sm:block w-px h-6 bg-[rgba(79,70,229,0.15)]" />

          {/* Aggregates */}
          <div className="hidden sm:flex items-center gap-4">
            {summary.avgHealthScore !== null && (
              <div className="text-center">
                <p className="text-[10px] text-[#7C8DB0]">Avg Score</p>
                <p className="text-xs font-medium text-[#CBD5E1]">{summary.avgHealthScore}%</p>
              </div>
            )}
            {summary.driftCount > 0 && (
              <div className="text-center">
                <p className="text-[10px] text-[#7C8DB0]">Drift</p>
                <p className="text-xs font-medium text-[#F59E0B]">{summary.driftCount}</p>
              </div>
            )}
            <div className="text-center">
              <p className="text-[10px] text-[#7C8DB0]">Online</p>
              <p className="text-xs font-medium text-[#CBD5E1]">
                {summary.onlineCount}/{summary.totalInstances}
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
