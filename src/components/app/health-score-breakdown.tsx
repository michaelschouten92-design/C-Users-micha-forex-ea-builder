/**
 * HealthScoreBreakdown — component score bars + sparkline history.
 *
 * Expandable section showing the 5 individual health score components
 * and a sparkline of score history over recent evaluations.
 */

import { DisclosureSection } from "./disclosure-section";
import type {
  HealthSnapshotDetail,
  HealthHistoryPoint,
} from "@/app/app/strategy/[instanceId]/load-strategy-detail";

function ScoreBar({ score, label }: { score: number; label: string }) {
  const pct = Math.round(score * 100);
  const barColor = pct >= 70 ? "#10B981" : pct >= 40 ? "#F59E0B" : "#EF4444";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-[#7C8DB0]">{label}</span>
        <span className="text-white font-medium tabular-nums">{pct}%</span>
      </div>
      <div className="h-1.5 bg-[#0D0D12] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  );
}

function HealthSparkline({ points }: { points: HealthHistoryPoint[] }) {
  if (points.length < 2) return null;

  const W = 200;
  const H = 32;
  const pad = 1;

  // Points are newest-first; reverse to chronological
  const sorted = [...points].reverse();
  const scores = sorted.map((p) => p.overallScore);

  const xStep = (W - pad * 2) / Math.max(scores.length - 1, 1);

  const pathParts = scores.map((s, i) => {
    const x = pad + i * xStep;
    const y = H - pad - s * (H - pad * 2);
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const latest = scores[scores.length - 1];
  const strokeColor = latest >= 0.7 ? "#10B981" : latest >= 0.4 ? "#F59E0B" : "#EF4444";

  const warningY = H - pad - 0.7 * (H - pad * 2);
  const degradedY = H - pad - 0.4 * (H - pad * 2);

  return (
    <div className="pt-3 border-t border-[rgba(79,70,229,0.1)]">
      <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-1">Score History</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-8" preserveAspectRatio="none">
        <rect x={0} y={pad} width={W} height={warningY - pad} fill="#EF4444" opacity={0.05} />
        <rect
          x={0}
          y={warningY}
          width={W}
          height={degradedY - warningY}
          fill="#F59E0B"
          opacity={0.05}
        />
        <rect
          x={0}
          y={degradedY}
          width={W}
          height={H - pad - degradedY}
          fill="#10B981"
          opacity={0.05}
        />
        <line
          x1={0}
          y1={warningY}
          x2={W}
          y2={warningY}
          stroke="#7C8DB0"
          strokeWidth={0.3}
          strokeDasharray="2,2"
        />
        <line
          x1={0}
          y1={degradedY}
          x2={W}
          y2={degradedY}
          stroke="#7C8DB0"
          strokeWidth={0.3}
          strokeDasharray="2,2"
        />
        <path d={pathParts.join("")} fill="none" stroke={strokeColor} strokeWidth={1.5} />
      </svg>
    </div>
  );
}

interface HealthScoreBreakdownProps {
  health: HealthSnapshotDetail | null;
  history: HealthHistoryPoint[];
}

export function HealthScoreBreakdown({ health, history }: HealthScoreBreakdownProps) {
  if (!health || health.status === "INSUFFICIENT_DATA") {
    return (
      <DisclosureSection title="Health Score Breakdown">
        <div className="pt-3">
          <p className="text-xs text-[#7C8DB0]">
            Score breakdown available after sufficient trade activity.
          </p>
        </div>
      </DisclosureSection>
    );
  }

  const overallPct = Math.round(health.overallScore * 100);
  const ci = `${Math.round(health.confidenceLower * 100)}–${Math.round(health.confidenceUpper * 100)}%`;

  return (
    <DisclosureSection title="Health Score Breakdown">
      <div className="pt-3 space-y-4">
        {/* Overall + confidence + sampling */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-white font-semibold tabular-nums">{overallPct}%</span>
            <span className="text-[10px] text-[#7C8DB0]">CI: {ci}</span>
          </div>
          <span className="text-[10px] text-[#7C8DB0]">
            {health.tradesSampled} trades / {health.windowDays}d window
          </span>
        </div>

        {/* Component scores */}
        <div className="space-y-2.5">
          <ScoreBar score={health.returnScore} label="Return" />
          <ScoreBar score={health.drawdownScore} label="Drawdown" />
          <ScoreBar score={health.winRateScore} label="Win Rate" />
          <ScoreBar score={health.volatilityScore} label="Volatility" />
          <ScoreBar score={health.tradeFrequencyScore} label="Trade Frequency" />
        </div>

        {/* Primary driver + trend + expectancy */}
        {(health.primaryDriver || health.scoreTrend || health.expectancy !== null) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[#7C8DB0] pt-2 border-t border-[rgba(79,70,229,0.1)]">
            {health.primaryDriver && <span>{health.primaryDriver}</span>}
            {health.scoreTrend && (
              <span className="flex items-center gap-0.5">
                {health.scoreTrend === "improving" && (
                  <span className="text-[#10B981]">&#9650;</span>
                )}
                {health.scoreTrend === "declining" && (
                  <span className="text-[#EF4444]">&#9660;</span>
                )}
                {health.scoreTrend === "stable" && <span className="text-[#7C8DB0]">&#9654;</span>}
                {health.scoreTrend}
              </span>
            )}
            {health.expectancy !== null && (
              <span>
                Exp: {health.expectancy >= 0 ? "+" : ""}
                {health.expectancy.toFixed(3)}%/trade
              </span>
            )}
          </div>
        )}

        {/* Sparkline */}
        <HealthSparkline points={history} />

        {/* Last assessed */}
        <p className="text-[10px] text-[#7C8DB0]">
          Last assessed: {new Date(health.createdAt).toLocaleString()}
        </p>
      </div>
    </DisclosureSection>
  );
}
