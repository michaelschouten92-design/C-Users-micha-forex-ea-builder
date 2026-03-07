/**
 * BaselineComparison — live vs backtest metrics with deviation bars.
 *
 * Shows 4 key metrics: win rate, max drawdown, return, trades/day.
 * Each row shows baseline, live, deviation %, and a visual bar.
 */

import type { HealthSnapshotDetail } from "@/app/app/strategy/[instanceId]/load-strategy-detail";

function DeviationRow({
  label,
  baseline,
  live,
  format,
  invertPolarity,
}: {
  label: string;
  baseline: number | null;
  live: number;
  format: (v: number) => string;
  invertPolarity?: boolean;
}) {
  if (baseline === null || baseline === 0) {
    return (
      <div className="flex items-center justify-between py-2 border-b border-[rgba(79,70,229,0.08)] last:border-0">
        <span className="text-xs text-[#7C8DB0] w-24">{label}</span>
        <span className="text-xs font-medium text-white">{format(live)}</span>
        <span className="text-[10px] text-[#7C8DB0] w-20 text-right">No baseline</span>
      </div>
    );
  }

  const rawDeviation = ((live - baseline) / Math.abs(baseline)) * 100;
  // For drawdown: higher live = bad. For others: lower live = bad.
  const isNegative = invertPolarity ? rawDeviation > 0 : rawDeviation < 0;

  const absDeviation = Math.abs(rawDeviation);
  const deviationColor = absDeviation < 10 ? "#10B981" : absDeviation < 25 ? "#F59E0B" : "#EF4444";

  // Clamp bar width to 100%
  const barWidth = Math.min(absDeviation, 100);

  return (
    <div className="py-2 border-b border-[rgba(79,70,229,0.08)] last:border-0 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#7C8DB0] w-24">{label}</span>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-[#7C8DB0]">Base: {format(baseline)}</span>
          <span className="text-xs font-medium text-white">{format(live)}</span>
          <span
            className="text-[11px] font-semibold w-16 text-right tabular-nums"
            style={{ color: isNegative ? deviationColor : "#10B981" }}
          >
            {rawDeviation >= 0 ? "+" : ""}
            {rawDeviation.toFixed(1)}%
          </span>
        </div>
      </div>
      {/* Deviation bar */}
      <div className="h-1.5 bg-[#0A0118] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${barWidth}%`,
            backgroundColor: isNegative ? deviationColor : "#10B981",
            opacity: 0.85,
          }}
        />
      </div>
    </div>
  );
}

interface BaselineComparisonProps {
  health: HealthSnapshotDetail | null;
}

export function BaselineComparison({ health }: BaselineComparisonProps) {
  if (!health || health.status === "INSUFFICIENT_DATA") {
    return (
      <div className="rounded-xl bg-[#1A0626] border border-[rgba(79,70,229,0.15)] p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#7C8DB0] mb-3">
          Baseline vs Live
        </p>
        <p className="text-xs text-[#7C8DB0]">
          Baseline comparison requires sufficient live data and a backtest baseline.
        </p>
      </div>
    );
  }

  const hasAnyBaseline =
    health.baselineWinRate !== null ||
    health.baselineMaxDDPct !== null ||
    health.baselineReturnPct !== null ||
    health.baselineTradesPerDay !== null;

  return (
    <div className="rounded-xl bg-[#1A0626] border border-[rgba(79,70,229,0.15)] p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#7C8DB0] mb-3">
        Baseline vs Live
      </p>
      {!hasAnyBaseline ? (
        <p className="text-xs text-[#7C8DB0]">
          No backtest baseline available. Upload a backtest to enable deviation tracking.
        </p>
      ) : (
        <div>
          <DeviationRow
            label="Win Rate"
            baseline={health.baselineWinRate}
            live={health.liveWinRate}
            format={(v) => `${v.toFixed(1)}%`}
          />
          <DeviationRow
            label="Max Drawdown"
            baseline={health.baselineMaxDDPct}
            live={health.liveMaxDrawdownPct}
            format={(v) => `${v.toFixed(1)}%`}
            invertPolarity
          />
          <DeviationRow
            label="Return"
            baseline={health.baselineReturnPct}
            live={health.liveReturnPct}
            format={(v) => `${v.toFixed(1)}%`}
          />
          <DeviationRow
            label="Trades / Day"
            baseline={health.baselineTradesPerDay}
            live={health.liveTradesPerDay}
            format={(v) => v.toFixed(2)}
          />
        </div>
      )}
    </div>
  );
}
