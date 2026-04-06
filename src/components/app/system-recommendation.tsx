/**
 * SystemRecommendation — action-oriented recommendation panel.
 *
 * Derived server-side from lifecycle + health + incidents.
 * Shows one recommendation, one explanation, one visual cue.
 */

import type { RecommendationLevel } from "@/app/app/strategy/[instanceId]/load-strategy-detail";

const RECOMMENDATION_CONFIG: Record<
  RecommendationLevel,
  { color: string; icon: string; label: string }
> = {
  NO_ACTION: { color: "#10B981", icon: "\u2713", label: "No Action Required" },
  AWAIT_DATA: {
    color: "#7C8DB0",
    icon: "\u25F7",
    label: "Awaiting Data",
  },
  MONITOR_CLOSELY: {
    color: "#F59E0B",
    icon: "\u25C9",
    label: "Monitor Closely",
  },
  INVESTIGATE: {
    color: "#EF4444",
    icon: "\u25B2",
    label: "Investigate Edge",
  },
  STOP: { color: "#EF4444", icon: "\u25A0", label: "Stop Deployment" },
};

const ACTION_HINTS: Partial<Record<RecommendationLevel, string>> = {
  STOP: "Use the Pause Strategy button above to halt trading immediately.",
  INVESTIGATE: "Review the health breakdown below. Consider pausing if the trend continues.",
  MONITOR_CLOSELY:
    "Keep an eye on the health score. Set up Telegram alerts to get notified of changes.",
};

interface SystemRecommendationProps {
  level: RecommendationLevel;
  reason: string;
}

export function SystemRecommendation({ level, reason }: SystemRecommendationProps) {
  const config = RECOMMENDATION_CONFIG[level];
  const actionHint = ACTION_HINTS[level];

  return (
    <div
      className="rounded-xl bg-[#111114] p-4 sm:p-5"
      style={{
        border: `1px solid ${config.color}25`,
        borderLeft: `3px solid ${config.color}`,
      }}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0 mt-0.5 leading-none" style={{ color: config.color }}>
          {config.icon}
        </span>
        <div className="space-y-1.5 min-w-0">
          <h3 className="text-[15px] font-bold tracking-tight" style={{ color: config.color }}>
            {config.label}
          </h3>
          <p className="text-xs text-[#E2E8F0] leading-relaxed">{reason}</p>
          {actionHint && (
            <p className="text-[11px] text-[#94A3B8] leading-relaxed italic">{actionHint}</p>
          )}
        </div>
      </div>
    </div>
  );
}
