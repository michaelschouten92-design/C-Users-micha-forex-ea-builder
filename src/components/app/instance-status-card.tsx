/**
 * InstanceStatusCard — dashboard card for a single deployment (instance).
 *
 * Layer 1 (instance truth) — each card represents one LiveEAInstance.
 * This is NOT a strategy aggregate — it shows one deployment's actual health.
 *
 * Follows the operator mental model:
 *   1. STATUS  — governance state (what the control layer concludes)
 *   2. WHY     — primary reason / signal
 *   3. ACTION  — recommended next step
 */

import Link from "next/link";
import { HealthScoreBar } from "./health-score-bar";
import type { CommandCenterInstance } from "@/app/app/load-command-center-data";
import type { GovernanceState, GovernanceAction } from "@/lib/semantic-layers";

// ── Governance display config ────────────────────────────

const STATE_CONFIG: Record<GovernanceState, { color: string; label: string }> = {
  CLEAR: { color: "#10B981", label: "Clear" },
  OBSERVATION: { color: "#7C8DB0", label: "Observation" },
  REVIEW_REQUIRED: { color: "#F59E0B", label: "Review Required" },
  RESTRICTED: { color: "#EF4444", label: "Restricted" },
  INVALIDATED: { color: "#EF4444", label: "Invalidated" },
};

const ACTION_LABELS: Record<GovernanceAction, string> = {
  NONE: "No action needed",
  OBSERVE: "Continue monitoring",
  REVIEW: "Review deployment",
  PAUSE: "Pause deployment",
  STOP: "Stop deployment",
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

interface InstanceStatusCardProps {
  instance: CommandCenterInstance;
}

export function InstanceStatusCard({ instance }: InstanceStatusCardProps) {
  const s = instance;
  const stateConfig = STATE_CONFIG[s.governanceState];

  return (
    <Link
      href={`/app/strategy/${s.id}`}
      className="block bg-[#111114] rounded-xl p-4 transition-colors hover:border-[rgba(255,255,255,0.10)]"
      style={{
        border: `1px solid ${stateConfig.color}20`,
        borderLeft: `3px solid ${stateConfig.color}`,
      }}
    >
      {/* Row 1: Name + Governance State */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <ConnectionDot status={s.status} />
          <span className="text-sm font-medium text-white truncate">{s.eaName}</span>
        </div>
        <span
          className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-semibold rounded-full border flex-shrink-0"
          style={{
            backgroundColor: `${stateConfig.color}15`,
            color: stateConfig.color,
            borderColor: `${stateConfig.color}25`,
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: stateConfig.color }}
          />
          {stateConfig.label}
        </span>
      </div>

      {/* Row 2: WHY — primary reason */}
      <p className="text-[11px] text-[#A1A1AA] mb-3 line-clamp-2 leading-relaxed">
        {s.governancePrimaryReason ?? s.governanceSummary}
      </p>

      {/* Row 3: Health Score Bar */}
      <div className="mb-3">
        <HealthScoreBar score={s.healthScore} />
      </div>

      {/* Row 4: Key Metrics */}
      {s.hasHealthData && s.healthStatus !== "INSUFFICIENT_DATA" && (
        <div className="flex items-center justify-between mb-2 px-1">
          <MetricMini
            label="Win Rate"
            value={s.liveWinRate !== null ? `${s.liveWinRate.toFixed(1)}%` : "\u2014"}
          />
          <MetricMini
            label="Max DD"
            value={s.liveMaxDrawdownPct !== null ? `${s.liveMaxDrawdownPct.toFixed(1)}%` : "\u2014"}
          />
          <MetricMini
            label="Expectancy"
            value={
              s.expectancy !== null
                ? `${s.expectancy >= 0 ? "+" : ""}${s.expectancy.toFixed(3)}%`
                : "\u2014"
            }
          />
        </div>
      )}

      {/* Row 5: ACTION + Last Activity */}
      <div className="flex items-center justify-between pt-2 border-t border-[rgba(255,255,255,0.06)]">
        {s.governanceAction !== "NONE" ? (
          <span className="text-[10px] font-medium" style={{ color: stateConfig.color }}>
            {ACTION_LABELS[s.governanceAction]}
          </span>
        ) : (
          <span className="text-[10px] text-[#71717A]">{ACTION_LABELS[s.governanceAction]}</span>
        )}
        <span className="text-[10px] text-[#71717A] flex-shrink-0 ml-2">
          {formatRelativeTime(s.lastHeartbeat)}
        </span>
      </div>
    </Link>
  );
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
