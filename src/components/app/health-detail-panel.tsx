"use client";

import { useState, useEffect } from "react";

interface HealthSnapshotData {
  id: string;
  status: "HEALTHY" | "WARNING" | "DEGRADED" | "INSUFFICIENT_DATA";
  overallScore: number;
  returnScore: number;
  volatilityScore: number;
  drawdownScore: number;
  winRateScore: number;
  tradeFrequencyScore: number;
  liveReturnPct: number;
  liveVolatility: number;
  liveMaxDrawdownPct: number;
  liveWinRate: number;
  liveTradesPerDay: number;
  baselineReturnPct: number | null;
  baselineMaxDDPct: number | null;
  baselineWinRate: number | null;
  baselineTradesPerDay: number | null;
  tradesSampled: number;
  windowDays: number;
  confidenceLower: number;
  confidenceUpper: number;
  driftDetected: boolean;
  driftSeverity: number;
  primaryDriver: string | null;
  scoreTrend: string | null;
  expectancy: number | null;
  createdAt: string;
}

const MIN_TRADES = 10;
const MIN_DAYS = 7;

interface HealthDetailPanelProps {
  instanceId: string;
}

const STATUS_CONFIG = {
  HEALTHY: { color: "#10B981", bg: "#10B981", label: "Healthy" },
  WARNING: { color: "#F59E0B", bg: "#F59E0B", label: "Warning" },
  DEGRADED: { color: "#EF4444", bg: "#EF4444", label: "Degraded" },
  INSUFFICIENT_DATA: { color: "#7C8DB0", bg: "#7C8DB0", label: "Insufficient Data" },
} as const;

const METRIC_LABELS: Record<
  string,
  { label: string; unit: string; format: (v: number) => string }
> = {
  return: { label: "Return", unit: "%", format: (v) => v.toFixed(1) },
  volatility: { label: "Volatility", unit: "", format: (v) => (v * 100).toFixed(1) + "%" },
  drawdown: { label: "Max Drawdown", unit: "%", format: (v) => v.toFixed(1) },
  winRate: { label: "Win Rate", unit: "%", format: (v) => v.toFixed(1) },
  tradeFrequency: { label: "Trade Frequency", unit: "/day", format: (v) => v.toFixed(2) },
};

function ScoreBar({ score, label }: { score: number; label: string }) {
  const pct = Math.round(score * 100);
  const barColor = pct >= 70 ? "#10B981" : pct >= 40 ? "#F59E0B" : "#EF4444";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-[#7C8DB0]">{label}</span>
        <span className="text-white font-medium">{pct}%</span>
      </div>
      <div className="h-1.5 bg-[#0A0118] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  );
}

function MetricRow({
  label,
  liveValue,
  baselineValue,
  format,
}: {
  label: string;
  liveValue: number;
  baselineValue: number | null;
  format: (v: number) => string;
}) {
  return (
    <div className="flex items-center justify-between text-xs py-1.5">
      <span className="text-[#7C8DB0]">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-white font-medium">{format(liveValue)}</span>
        {baselineValue !== null && (
          <span className="text-[#7C8DB0] text-[10px]">vs {format(baselineValue)}</span>
        )}
      </div>
    </div>
  );
}

interface HistoryPoint {
  overallScore: number;
  status: string;
  createdAt: string;
}

function HealthSparkline({ points }: { points: HistoryPoint[] }) {
  if (points.length < 2) return null;

  const W = 200;
  const H = 32;
  const pad = 1;

  // Points are newest-first from the API; reverse to chronological order
  const sorted = [...points].reverse();
  const scores = sorted.map((p) => p.overallScore);

  const xStep = (W - pad * 2) / Math.max(scores.length - 1, 1);

  const pathParts = scores.map((s, i) => {
    const x = pad + i * xStep;
    const y = H - pad - s * (H - pad * 2);
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  });

  // Color based on most recent score
  const latest = scores[scores.length - 1];
  const strokeColor = latest >= 0.7 ? "#10B981" : latest >= 0.4 ? "#F59E0B" : "#EF4444";

  // Zone backgrounds
  const warningY = H - pad - 0.7 * (H - pad * 2);
  const degradedY = H - pad - 0.4 * (H - pad * 2);

  return (
    <div className="pt-3 border-t border-[rgba(79,70,229,0.1)]">
      <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-1">Score History</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-8" preserveAspectRatio="none">
        {/* Zone backgrounds */}
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
        {/* Threshold lines */}
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
        {/* Score line */}
        <path d={pathParts.join("")} fill="none" stroke={strokeColor} strokeWidth={1.5} />
      </svg>
    </div>
  );
}

export function HealthDetailPanel({ instanceId }: HealthDetailPanelProps) {
  const [health, setHealth] = useState<HealthSnapshotData | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHealth() {
      try {
        const [healthRes, historyRes] = await Promise.all([
          fetch(`/api/live/${instanceId}/health`),
          fetch(`/api/live/${instanceId}/health/history?limit=20`),
        ]);
        if (healthRes.ok) {
          const data = await healthRes.json();
          setHealth(data.health);
        }
        if (historyRes.ok) {
          const data = await historyRes.json();
          setHistory(data.snapshots ?? []);
        }
      } catch {
        // Silently fail — health is non-critical
      } finally {
        setLoading(false);
      }
    }
    fetchHealth();
  }, [instanceId]);

  if (loading) {
    return (
      <div className="mt-4 p-4 rounded-lg bg-[#0A0118]/50 border border-[rgba(79,70,229,0.1)]">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-[#1A0626] rounded w-32" />
          <div className="h-2 bg-[#1A0626] rounded w-full" />
          <div className="h-2 bg-[#1A0626] rounded w-3/4" />
        </div>
      </div>
    );
  }

  if (!health) {
    return (
      <div className="mt-4 p-4 rounded-lg bg-[#0A0118]/50 border border-[rgba(79,70,229,0.1)]">
        <p className="text-xs text-[#7C8DB0]">
          No health data available yet. Health assessment begins after trade activity.
        </p>
      </div>
    );
  }

  const config = STATUS_CONFIG[health.status];

  // Insufficient data: show progress indicator instead of scores
  if (health.status === "INSUFFICIENT_DATA") {
    const tradeProgress = Math.min(1, health.tradesSampled / MIN_TRADES);
    const dayProgress = Math.min(1, health.windowDays / MIN_DAYS);
    const tradePct = Math.round(tradeProgress * 100);
    const dayPct = Math.round(dayProgress * 100);

    return (
      <div className="mt-4 p-4 rounded-lg bg-[#0A0118]/50 border border-[rgba(79,70,229,0.1)] space-y-3">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full border"
            style={{
              backgroundColor: `${config.bg}20`,
              color: config.color,
              borderColor: `${config.color}30`,
            }}
          >
            Collecting Data
          </span>
        </div>
        <p className="text-xs text-[#7C8DB0]">
          Health assessment begins after enough trading activity.
        </p>
        <div className="space-y-2">
          <div className="space-y-1">
            <div className="flex justify-between text-[10px]">
              <span className="text-[#7C8DB0]">Trades</span>
              <span className="text-white">
                {health.tradesSampled} / {MIN_TRADES}
              </span>
            </div>
            <div className="h-1.5 bg-[#0A0118] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${tradePct}%`,
                  backgroundColor: tradeProgress >= 1 ? "#10B981" : "#7C8DB0",
                }}
              />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[10px]">
              <span className="text-[#7C8DB0]">Window</span>
              <span className="text-white">
                {health.windowDays} / {MIN_DAYS} days
              </span>
            </div>
            <div className="h-1.5 bg-[#0A0118] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${dayPct}%`,
                  backgroundColor: dayProgress >= 1 ? "#10B981" : "#7C8DB0",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const scorePct = Math.round(health.overallScore * 100);
  const ciLower = Math.round(health.confidenceLower * 100);
  const ciUpper = Math.round(health.confidenceUpper * 100);

  return (
    <div className="mt-4 p-4 rounded-lg bg-[#0A0118]/50 border border-[rgba(79,70,229,0.1)] space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full border"
            style={{
              backgroundColor: `${config.bg}20`,
              color: config.color,
              borderColor: `${config.color}30`,
            }}
          >
            {config.label}
          </span>
          <span className="text-xs text-[#7C8DB0]">
            {scorePct}%
            <span className="text-[10px] ml-1 opacity-70">
              ({ciLower}–{ciUpper}%)
            </span>
          </span>
        </div>
        <span className="text-[10px] text-[#7C8DB0]">
          {health.tradesSampled} trades / {health.windowDays}d window
        </span>
      </div>

      {/* Drift Warning */}
      {health.driftDetected && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[#EF4444]/10 border border-[#EF4444]/20">
          <span className="text-[10px] text-[#EF4444] font-medium">
            Edge drift detected — strategy expectancy has persistently declined
          </span>
        </div>
      )}
      {!health.driftDetected && health.driftSeverity > 0.5 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[#F59E0B]/10 border border-[#F59E0B]/20">
          <span className="text-[10px] text-[#F59E0B] font-medium">
            Possible drift ({Math.round(health.driftSeverity * 100)}% toward threshold)
          </span>
        </div>
      )}

      {/* Primary Driver + Trend + Expectancy */}
      {(health.primaryDriver || health.scoreTrend || health.expectancy !== null) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[#7C8DB0]">
          {health.primaryDriver && <span>{health.primaryDriver}</span>}
          {health.scoreTrend && (
            <span className="flex items-center gap-0.5">
              {health.scoreTrend === "improving" && <span className="text-[#10B981]">&#9650;</span>}
              {health.scoreTrend === "declining" && <span className="text-[#EF4444]">&#9660;</span>}
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

      {/* Score Bars */}
      <div className="space-y-2.5">
        <ScoreBar score={health.returnScore} label="Return" />
        <ScoreBar score={health.drawdownScore} label="Drawdown" />
        <ScoreBar score={health.winRateScore} label="Win Rate" />
        <ScoreBar score={health.volatilityScore} label="Volatility" />
        <ScoreBar score={health.tradeFrequencyScore} label="Trade Frequency" />
      </div>

      {/* Live vs Baseline Comparison */}
      <div className="pt-3 border-t border-[rgba(79,70,229,0.1)]">
        <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-2">Live vs Baseline</p>
        <MetricRow
          label="Return"
          liveValue={health.liveReturnPct}
          baselineValue={health.baselineReturnPct}
          format={METRIC_LABELS.return.format}
        />
        <MetricRow
          label="Max Drawdown"
          liveValue={health.liveMaxDrawdownPct}
          baselineValue={health.baselineMaxDDPct}
          format={METRIC_LABELS.drawdown.format}
        />
        <MetricRow
          label="Win Rate"
          liveValue={health.liveWinRate}
          baselineValue={health.baselineWinRate}
          format={METRIC_LABELS.winRate.format}
        />
        <MetricRow
          label="Trades/Day"
          liveValue={health.liveTradesPerDay}
          baselineValue={health.baselineTradesPerDay}
          format={METRIC_LABELS.tradeFrequency.format}
        />
      </div>

      {/* Health History Sparkline */}
      {history.length >= 2 && <HealthSparkline points={history} />}

      <p className="text-[10px] text-[#7C8DB0]">
        Last assessed: {new Date(health.createdAt).toLocaleString()}
      </p>
    </div>
  );
}

/**
 * Compact health badge for inline use in EA cards.
 */
export function HealthBadge({
  status,
  score,
}: {
  status: "HEALTHY" | "WARNING" | "DEGRADED" | "INSUFFICIENT_DATA" | null;
  score: number | null;
}) {
  if (!status) return null;

  const config = STATUS_CONFIG[status];

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full border"
      style={{
        backgroundColor: `${config.bg}15`,
        color: config.color,
        borderColor: `${config.color}25`,
      }}
      title={score !== null ? `Health: ${Math.round(score * 100)}%` : config.label}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: config.color }} />
      {score !== null && status !== "INSUFFICIENT_DATA"
        ? `${Math.round(score * 100)}%`
        : config.label.split(" ")[0]}
    </span>
  );
}
