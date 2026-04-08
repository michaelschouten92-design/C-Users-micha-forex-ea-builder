/**
 * InvestigationPanel — answers "Why is this strategy flagged?"
 *
 * Shown when health status is WARNING, DEGRADED, or drift is detected.
 * Consolidates: status summary, top degraded metrics with baseline deviation,
 * recent trend, and evidence summary into a single decision-oriented view.
 *
 * Uses only existing persisted HealthSnapshot data — no new queries.
 */

import type {
  HealthSnapshotDetail,
  HealthHistoryPoint,
} from "@/app/app/strategy/[instanceId]/load-strategy-detail";

// ── Status helpers ──────────────────────────────────────

const HEALTH_DISPLAY: Record<string, { label: string; color: string }> = {
  HEALTHY: { label: "Healthy", color: "#10B981" },
  WARNING: { label: "Warning", color: "#F59E0B" },
  DEGRADED: { label: "Edge at Risk", color: "#EF4444" },
  INSUFFICIENT_DATA: { label: "Awaiting Data", color: "#7C8DB0" },
};

const LIFECYCLE_DISPLAY: Record<string, string> = {
  LIVE_MONITORING: "Live Monitoring",
  EDGE_AT_RISK: "Edge at Risk",
  INVALIDATED: "Invalidated",
  VERIFIED: "Verified",
  BACKTESTED: "Backtested",
  DRAFT: "Draft",
};

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// ── Metric degradation analysis ─────────────────────────

interface MetricDegradation {
  name: string;
  score: number;
  liveValue: number;
  baselineValue: number | null;
  format: (v: number) => string;
  /** Human explanation of what went wrong */
  explanation: string;
}

function analyzeMetrics(health: HealthSnapshotDetail): MetricDegradation[] {
  const metrics: MetricDegradation[] = [
    {
      name: "Return",
      score: health.returnScore,
      liveValue: health.liveReturnPct,
      baselineValue: health.baselineReturnPct,
      format: (v) => `${v.toFixed(1)}%`,
      explanation:
        health.baselineReturnPct !== null
          ? `Live return ${health.liveReturnPct.toFixed(1)}% vs baseline ${health.baselineReturnPct.toFixed(1)}%`
          : `Live return ${health.liveReturnPct.toFixed(1)}%`,
    },
    {
      name: "Drawdown",
      score: health.drawdownScore,
      liveValue: health.liveMaxDrawdownPct,
      baselineValue: health.baselineMaxDDPct,
      format: (v) => `${v.toFixed(1)}%`,
      explanation:
        health.baselineMaxDDPct !== null
          ? `Live drawdown ${health.liveMaxDrawdownPct.toFixed(1)}% vs baseline ${health.baselineMaxDDPct.toFixed(1)}%`
          : `Live drawdown ${health.liveMaxDrawdownPct.toFixed(1)}%`,
    },
    {
      name: "Win Rate",
      score: health.winRateScore,
      liveValue: health.liveWinRate,
      baselineValue: health.baselineWinRate,
      format: (v) => `${v.toFixed(1)}%`,
      explanation:
        health.baselineWinRate !== null
          ? `Live win rate ${health.liveWinRate.toFixed(1)}% vs baseline ${health.baselineWinRate.toFixed(1)}%`
          : `Live win rate ${health.liveWinRate.toFixed(1)}%`,
    },
    {
      name: "Volatility",
      score: health.volatilityScore,
      liveValue: health.liveVolatility,
      baselineValue: null, // baseline volatility not stored in snapshot
      format: (v) => v.toFixed(3),
      explanation: `Live volatility ${health.liveVolatility.toFixed(3)}`,
    },
    {
      name: "Trade Frequency",
      score: health.tradeFrequencyScore,
      liveValue: health.liveTradesPerDay,
      baselineValue: health.baselineTradesPerDay,
      format: (v) => v.toFixed(2),
      explanation:
        health.baselineTradesPerDay !== null
          ? `${health.liveTradesPerDay.toFixed(2)}/day vs baseline ${health.baselineTradesPerDay.toFixed(2)}/day`
          : `${health.liveTradesPerDay.toFixed(2)} trades/day`,
    },
  ];

  // Sort by score ascending (worst first), filter to only degraded metrics (score < 0.7)
  return metrics.filter((m) => m.score < 0.7).sort((a, b) => a.score - b.score);
}

// ── Sub-components ──────────────────────────────────────

function StatusRow({
  health,
  lifecycleState,
}: {
  health: HealthSnapshotDetail;
  lifecycleState: string;
}) {
  const hd = HEALTH_DISPLAY[health.status] ?? HEALTH_DISPLAY.INSUFFICIENT_DATA;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {/* Health */}
      <div className="flex items-center gap-1.5">
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: hd.color }}
        />
        <span className="text-xs font-semibold" style={{ color: hd.color }}>
          {hd.label}
        </span>
      </div>

      {/* Lifecycle */}
      <span className="text-xs text-[#7C8DB0]">
        {LIFECYCLE_DISPLAY[lifecycleState] ?? lifecycleState}
      </span>

      {/* Drift */}
      {health.driftDetected ? (
        <span className="text-xs font-medium text-[#EF4444] flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse" />
          Drift detected
        </span>
      ) : (
        <span className="text-xs text-[#7C8DB0]">No drift</span>
      )}

      {/* Evidence */}
      <span className="text-[10px] text-[#7C8DB0]">
        {health.tradesSampled} trades &middot; {health.windowDays}d &middot;{" "}
        {formatRelative(health.createdAt)}
      </span>
    </div>
  );
}

function DegradedMetricRow({ metric }: { metric: MetricDegradation }) {
  const scorePct = Math.round(metric.score * 100);
  const barColor = scorePct >= 40 ? "#F59E0B" : "#EF4444";

  return (
    <div className="py-2 border-b border-[rgba(79,70,229,0.08)] last:border-0">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-white">{metric.name}</span>
          <span className="text-[10px] font-semibold tabular-nums" style={{ color: barColor }}>
            {scorePct}%
          </span>
        </div>
        {metric.baselineValue !== null && (
          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-[#7C8DB0]">Base: {metric.format(metric.baselineValue)}</span>
            <span className="text-white font-medium">{metric.format(metric.liveValue)}</span>
          </div>
        )}
      </div>
      <div className="h-1 bg-[#0D0D12] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${scorePct}%`, backgroundColor: barColor }}
        />
      </div>
      <p className="text-[10px] text-[#7C8DB0] mt-1">{metric.explanation}</p>
    </div>
  );
}

function TrendRow({ history }: { history: HealthHistoryPoint[] }) {
  if (history.length < 2) return null;

  // Show last 10, newest first (already sorted desc from loader)
  const recent = history.slice(0, 10);

  return (
    <div className="pt-3 border-t border-[rgba(79,70,229,0.08)]">
      <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-2">Recent Trend</p>
      <div className="flex items-center gap-1">
        {/* Reverse to show chronological (oldest left, newest right) */}
        {[...recent].reverse().map((point, i) => {
          const color =
            point.status === "HEALTHY"
              ? "#10B981"
              : point.status === "WARNING"
                ? "#F59E0B"
                : point.status === "DEGRADED"
                  ? "#EF4444"
                  : "#7C8DB0";
          const scorePct = Math.round(point.overallScore * 100);
          return (
            <div
              key={i}
              className="flex flex-col items-center gap-0.5"
              title={`${scorePct}% — ${point.status}`}
            >
              <div
                className="w-5 rounded-sm"
                style={{
                  height: `${Math.max(4, scorePct * 0.2)}px`,
                  backgroundColor: color,
                  opacity: 0.85,
                }}
              />
              <span className="text-[8px] tabular-nums text-[#7C8DB0]">{scorePct}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DriftEvidence({ health }: { health: HealthSnapshotDetail }) {
  if (!health.driftDetected && health.driftSeverity < 0.1) return null;

  const severityPct = Math.round(health.driftSeverity * 100);

  return (
    <div className="pt-3 border-t border-[rgba(79,70,229,0.08)]">
      <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-2">Drift Evidence</p>
      <div className="flex items-center gap-4 text-xs">
        <div>
          <span className="text-[#7C8DB0]">Severity: </span>
          <span
            className="font-semibold tabular-nums"
            style={{
              color: severityPct >= 100 ? "#EF4444" : severityPct >= 50 ? "#F59E0B" : "#7C8DB0",
            }}
          >
            {severityPct}%
          </span>
        </div>
        <div>
          <span className="text-[#7C8DB0]">CUSUM: </span>
          <span className="text-white font-medium tabular-nums">
            {health.driftCusumValue.toFixed(2)}
          </span>
        </div>
        {health.expectancy !== null && (
          <div>
            <span className="text-[#7C8DB0]">Expectancy: </span>
            <span
              className="font-medium tabular-nums"
              style={{ color: health.expectancy < 0 ? "#EF4444" : "#10B981" }}
            >
              {health.expectancy >= 0 ? "+" : ""}
              {health.expectancy.toFixed(3)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────

interface InvestigationPanelProps {
  health: HealthSnapshotDetail | null;
  healthHistory: HealthHistoryPoint[];
  lifecycleState: string;
}

export function InvestigationPanel({
  health,
  healthHistory,
  lifecycleState,
}: InvestigationPanelProps) {
  // Only show when there's something to investigate
  if (!health) return null;
  if (health.status !== "WARNING" && health.status !== "DEGRADED" && !health.driftDetected) {
    return null;
  }

  const degradedMetrics = analyzeMetrics(health);
  const borderColor =
    health.status === "DEGRADED" ? "rgba(239,68,68,0.3)" : "rgba(245,158,11,0.25)";

  return (
    <div
      className="rounded-xl bg-[#111114] p-4 sm:p-5"
      style={{
        border: `1px solid ${borderColor}`,
        borderLeft: `3px solid ${borderColor}`,
      }}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-[#7C8DB0] mb-3">
        Investigation
      </p>

      {/* Status summary */}
      <StatusRow health={health} lifecycleState={lifecycleState} />

      {/* Degraded metrics (why this is flagged) */}
      {degradedMetrics.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-1">
            Degraded Metrics
          </p>
          {degradedMetrics.map((m) => (
            <DegradedMetricRow key={m.name} metric={m} />
          ))}
        </div>
      )}

      {/* Drift evidence */}
      <DriftEvidence health={health} />

      {/* Recent trend */}
      <TrendRow history={healthHistory} />
    </div>
  );
}
