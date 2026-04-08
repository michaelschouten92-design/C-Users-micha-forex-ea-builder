import type { EdgeScoreResult, EdgeScoreBreakdown } from "@/domain/monitoring/edge-score";
import { InfoTooltip } from "./info-tooltip";

function scoreColor(score: number): string {
  if (score >= 90) return "#10B981";
  if (score >= 70) return "#F59E0B";
  return "#EF4444";
}

function formatMetric(key: string, value: number): string {
  if (key === "winRate") return `${(value * 100).toFixed(1)}%`;
  if (key === "drawdown" || key === "returnPct") return `${value.toFixed(1)}%`;
  return value === Infinity ? "∞" : value.toFixed(2);
}

const METRIC_LABELS: Record<keyof EdgeScoreBreakdown, string> = {
  profitFactor: "Profit Factor",
  winRate: "Win Rate",
  drawdown: "Max Drawdown",
  returnPct: "Return",
};

const METRIC_TIPS: Record<keyof EdgeScoreBreakdown, string> = {
  profitFactor:
    "Gross profit divided by gross loss. Above 1.5 is healthy, below 1.0 means losing money.",
  winRate: "Percentage of trades that are profitable. Compare live vs backtest to spot drift.",
  drawdown:
    "Largest peak-to-trough decline. Lower is better. Exceeding your backtest drawdown is a warning sign.",
  returnPct: "Total return as a percentage of starting balance.",
};

export function EdgeScorePanel({ edgeScore }: { edgeScore: EdgeScoreResult }) {
  if (edgeScore.phase === "COLLECTING") {
    const pct = (edgeScore.tradesCompleted / edgeScore.tradesRequired) * 100;
    return (
      <div className="bg-[#111114] border border-[rgba(255,255,255,0.06)] rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[#FAFAFA]">
            Edge Score
            <InfoTooltip text="Compares your live trading performance against your backtest baseline. 100% means your live results match the backtest exactly." />
          </h3>
          <span className="text-[10px] text-[#64748B]">
            Collecting data ({edgeScore.tradesCompleted}/{edgeScore.tradesRequired} trades)
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-[#1E293B] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#52525B] transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }

  const score = edgeScore.score!;
  const color = scoreColor(score);
  const isEarly = edgeScore.phase === "EARLY";

  return (
    <div className="bg-[#111114] border border-[rgba(255,255,255,0.06)] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#FAFAFA]">Edge Score</h3>
        <div className="flex items-center gap-2">
          {isEarly && (
            <span className="text-[9px] font-medium text-[#64748B] uppercase tracking-wider">
              Early
            </span>
          )}
          <span
            className={`text-2xl font-bold tabular-nums ${isEarly ? "opacity-60" : ""}`}
            style={{ color }}
          >
            {Math.round(score)}%
          </span>
        </div>
      </div>

      {edgeScore.breakdown && (
        <div className="space-y-3">
          {(
            Object.entries(edgeScore.breakdown) as [
              keyof EdgeScoreBreakdown,
              EdgeScoreBreakdown[keyof EdgeScoreBreakdown],
            ][]
          ).map(([key, metric]) => {
            if (metric.weight === 0) return null;
            const ratio = metric.ratio * 100;
            const barWidth = Math.min(ratio, 200);
            const barColor = scoreColor(ratio);
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-[#A1A1AA]">
                    {METRIC_LABELS[key]}
                    <InfoTooltip text={METRIC_TIPS[key]} />
                  </span>
                  <div className="flex items-center gap-3 text-[10px] tabular-nums">
                    <span className="text-[#64748B]">BL: {formatMetric(key, metric.baseline)}</span>
                    <span className="text-[#FAFAFA] font-medium">
                      Live: {formatMetric(key, metric.live)}
                    </span>
                    <span className="font-semibold w-10 text-right" style={{ color: barColor }}>
                      {Math.round(ratio)}%
                    </span>
                  </div>
                </div>
                <div className="h-1 rounded-full bg-[#1E293B] overflow-hidden relative">
                  {/* 100% baseline marker */}
                  <div className="absolute top-0 bottom-0 left-1/2 w-px bg-[#334155]" />
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(barWidth / 2, 100)}%`,
                      backgroundColor: barColor,
                    }}
                  />
                </div>
              </div>
            );
          })}
          <p className="text-[9px] text-[#52525B] pt-1">
            Based on {edgeScore.tradesCompleted} live trades. 100% = matching backtest baseline.
          </p>
        </div>
      )}
    </div>
  );
}
