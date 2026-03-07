/**
 * LivePerformanceGrid — 2x2 grid of governance-relevant metrics.
 *
 * Shows the strongest available signals: win rate, max drawdown,
 * expectancy, and trade frequency.
 */

import type { HealthSnapshotDetail } from "@/app/app/strategy/[instanceId]/load-strategy-detail";

function MetricCard({
  label,
  value,
  trend,
}: {
  label: string;
  value: string;
  trend?: string | null;
}) {
  const trendColor =
    trend === "improving" ? "#10B981" : trend === "declining" ? "#EF4444" : "#7C8DB0";
  const trendArrow =
    trend === "improving"
      ? "\u25B2"
      : trend === "declining"
        ? "\u25BC"
        : trend === "stable"
          ? "\u25B6"
          : null;

  return (
    <div className="rounded-lg bg-[#0A0118]/50 border border-[rgba(79,70,229,0.1)] p-3">
      <p className="text-[10px] text-[#7C8DB0] mb-1">{label}</p>
      <div className="flex items-baseline gap-1.5">
        <span className="text-base font-bold text-white tabular-nums">{value}</span>
        {trendArrow && (
          <span className="text-[10px]" style={{ color: trendColor }}>
            {trendArrow}
          </span>
        )}
      </div>
    </div>
  );
}

interface LivePerformanceGridProps {
  health: HealthSnapshotDetail | null;
}

export function LivePerformanceGrid({ health }: LivePerformanceGridProps) {
  if (!health || health.status === "INSUFFICIENT_DATA") {
    return (
      <div className="rounded-xl bg-[#1A0626] border border-[rgba(79,70,229,0.15)] p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#7C8DB0] mb-3">
          Live Performance
        </p>
        <p className="text-xs text-[#7C8DB0]">
          Performance metrics will appear after sufficient trade activity.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-[#1A0626] border border-[rgba(79,70,229,0.15)] p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#7C8DB0] mb-3">
        Live Performance
      </p>
      <div className="grid grid-cols-2 gap-2">
        <MetricCard
          label="Win Rate"
          value={`${health.liveWinRate.toFixed(1)}%`}
          trend={health.scoreTrend}
        />
        <MetricCard label="Max Drawdown" value={`${health.liveMaxDrawdownPct.toFixed(1)}%`} />
        <MetricCard
          label="Expectancy"
          value={
            health.expectancy !== null
              ? `${health.expectancy >= 0 ? "+" : ""}${health.expectancy.toFixed(3)}%`
              : "\u2014"
          }
        />
        <MetricCard label="Trades / Day" value={health.liveTradesPerDay.toFixed(1)} />
      </div>
    </div>
  );
}
