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
  createdAt: string;
}

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

export function HealthDetailPanel({ instanceId }: HealthDetailPanelProps) {
  const [health, setHealth] = useState<HealthSnapshotData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHealth() {
      try {
        const res = await fetch(`/api/live/${instanceId}/health`);
        if (res.ok) {
          const data = await res.json();
          setHealth(data.health);
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
            Score: {Math.round(health.overallScore * 100)}%
          </span>
        </div>
        <span className="text-[10px] text-[#7C8DB0]">
          {health.tradesSampled} trades / {health.windowDays}d window
        </span>
      </div>

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
