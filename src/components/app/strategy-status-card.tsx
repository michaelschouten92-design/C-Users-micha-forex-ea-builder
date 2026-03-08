/**
 * StrategyStatusCard — dashboard card for a single strategy.
 *
 * Answers three questions at a glance:
 *   1. Is my strategy working? (MonitoringStatusBadge)
 *   2. Why? (drift indicator + health score)
 *   3. What should I do? (status implies action)
 */

import Link from "next/link";
import { MonitoringStatusBadge } from "./monitoring-status-badge";
import { HealthScoreBar } from "./health-score-bar";
import type { CommandCenterStrategy } from "@/app/app/load-command-center-data";

// ── Lifecycle state display ──────────────────────────────

const LIFECYCLE_LABELS: Record<string, string> = {
  LIVE_MONITORING: "Monitoring",
  EDGE_AT_RISK: "Edge at Risk",
  INVALIDATED: "Invalidated",
  VERIFIED: "Verified",
  BACKTESTED: "Backtested",
  DRAFT: "Draft",
};

// ── Relative time formatting ─────────────────────────────

function formatRelativeTime(isoStr: string | null): string {
  if (!isoStr) return "Never";
  const diffMs = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ── Sub-components ───────────────────────────────────────

function MetricMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-[10px] text-[#71717A]">{label}</p>
      <p className="text-xs font-medium text-[#A1A1AA]">{value}</p>
    </div>
  );
}

function DriftIndicator({
  driftDetected,
  primaryDriver,
  scoreTrend,
}: {
  driftDetected: boolean;
  primaryDriver: string | null;
  scoreTrend: string | null;
}) {
  if (driftDetected) {
    const driverLabel = primaryDriver
      ? primaryDriver.replace(/([A-Z])/g, " $1").trim()
      : "performance";
    return (
      <p className="text-[10px] text-[#EF4444] truncate">
        <span className="inline-block mr-1">&#9660;</span>
        Drift detected in {driverLabel}
      </p>
    );
  }

  if (scoreTrend === "declining") {
    return (
      <p className="text-[10px] text-[#F59E0B] truncate">
        <span className="inline-block mr-1">&#9660;</span>
        Score trending down
      </p>
    );
  }

  if (scoreTrend === "improving") {
    return (
      <p className="text-[10px] text-[#10B981] truncate">
        <span className="inline-block mr-1">&#9650;</span>
        Score improving
      </p>
    );
  }

  return null;
}

// ── Connection indicator ─────────────────────────────────

function ConnectionDot({ status }: { status: "ONLINE" | "OFFLINE" | "ERROR" }) {
  const color = status === "ONLINE" ? "#10B981" : status === "ERROR" ? "#EF4444" : "#71717A";

  return (
    <span
      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
      style={{ backgroundColor: color }}
      title={status}
    />
  );
}

// ── Card ─────────────────────────────────────────────────

interface StrategyStatusCardProps {
  strategy: CommandCenterStrategy;
}

export function StrategyStatusCard({ strategy }: StrategyStatusCardProps) {
  const s = strategy;
  const borderColor =
    s.monitoringStatus === "INVALIDATED"
      ? "rgba(239,68,68,0.4)"
      : s.monitoringStatus === "AT_RISK"
        ? "rgba(245,158,11,0.3)"
        : s.hasHealthData
          ? "rgba(16,185,129,0.25)"
          : "rgba(255,255,255,0.06)";

  return (
    <Link
      href={`/app/strategy/${s.id}`}
      className="block bg-[#111114] rounded-xl p-4 transition-colors hover:border-[rgba(255,255,255,0.10)]"
      style={{
        border: `1px solid ${borderColor}`,
        borderLeft: `3px solid ${borderColor}`,
      }}
    >
      {/* Row 1: Name + Monitoring Status */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <ConnectionDot status={s.status} />
          <span className="text-sm font-medium text-white truncate">{s.eaName}</span>
        </div>
        {s.hasHealthData ? (
          <MonitoringStatusBadge status={s.monitoringStatus} />
        ) : (
          <span className="text-[10px] text-[#71717A] font-medium px-2 py-0.5 rounded-full border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.06)]">
            Awaiting Data
          </span>
        )}
      </div>

      {/* Row 2: Lifecycle state */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] text-[#71717A] font-medium">
          {LIFECYCLE_LABELS[s.lifecycleState] ?? s.lifecycleState}
        </span>
        {s.symbol && (
          <>
            <span className="text-[10px] text-[#71717A]">&middot;</span>
            <span className="text-[10px] text-[#71717A]">{s.symbol}</span>
          </>
        )}
      </div>

      {/* Row 3: Health Score Bar */}
      <div className="mb-3">
        <HealthScoreBar score={s.healthScore} />
      </div>

      {/* Row 4: Key Metrics */}
      <div className="flex items-center justify-between mb-2 px-1">
        <MetricMini
          label="Win Rate"
          value={s.liveWinRate !== null ? `${s.liveWinRate.toFixed(1)}%` : "—"}
        />
        <MetricMini
          label="Max DD"
          value={s.liveMaxDrawdownPct !== null ? `${s.liveMaxDrawdownPct.toFixed(1)}%` : "—"}
        />
        <MetricMini
          label="Expectancy"
          value={
            s.expectancy !== null
              ? `${s.expectancy >= 0 ? "+" : ""}${s.expectancy.toFixed(3)}%`
              : "—"
          }
        />
      </div>

      {/* Row 5: Drift / Explainer + Last Activity */}
      <div className="flex items-center justify-between pt-2 border-t border-[rgba(255,255,255,0.06)]">
        <div className="min-w-0 flex-1">
          <DriftIndicator
            driftDetected={s.driftDetected}
            primaryDriver={s.primaryDriver}
            scoreTrend={s.scoreTrend}
          />
        </div>
        <span className="text-[10px] text-[#71717A] flex-shrink-0 ml-2">
          {formatRelativeTime(s.lastHeartbeat)}
        </span>
      </div>
    </Link>
  );
}
