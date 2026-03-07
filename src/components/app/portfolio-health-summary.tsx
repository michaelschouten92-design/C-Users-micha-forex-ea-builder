/**
 * PortfolioHealthSummary — top-level portfolio health aggregation.
 *
 * Shows overall status, counts by monitoring verdict, and key aggregates.
 * Designed for 3-second scan: numbers, not charts.
 */

import type { CommandCenterData } from "@/app/app/load-command-center-data";

type OverallStatus = "HEALTHY" | "ATTENTION" | "CRITICAL" | "NO_DATA";

function deriveOverallStatus(summary: CommandCenterData["summary"]): OverallStatus {
  if (summary.total === 0) return "NO_DATA";
  if (summary.invalidated > 0) return "CRITICAL";
  if (summary.atRisk > 0) return "ATTENTION";
  return "HEALTHY";
}

const STATUS_CONFIG: Record<OverallStatus, { color: string; label: string }> = {
  HEALTHY: { color: "#10B981", label: "All Healthy" },
  ATTENTION: { color: "#F59E0B", label: "Needs Attention" },
  CRITICAL: { color: "#EF4444", label: "Strategy Invalidated" },
  NO_DATA: { color: "#7C8DB0", label: "No Strategies" },
};

interface PortfolioHealthSummaryProps {
  summary: CommandCenterData["summary"];
}

export function PortfolioHealthSummary({ summary }: PortfolioHealthSummaryProps) {
  const overall = deriveOverallStatus(summary);
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
            <h2 className="text-sm font-semibold text-white">Portfolio Health</h2>
            <p className="text-xs font-medium" style={{ color: config.color }}>
              {config.label}
            </p>
          </div>
        </div>

        {/* Right: Counts */}
        <div className="flex items-center gap-4 sm:gap-6">
          <CountPill label="Healthy" count={summary.healthy} color="#10B981" />
          <CountPill label="At Risk" count={summary.atRisk} color="#F59E0B" />
          <CountPill label="Invalidated" count={summary.invalidated} color="#EF4444" />

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
                {summary.online}/{summary.total}
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
