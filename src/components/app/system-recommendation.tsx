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
    label: "Investigate Degradation",
  },
  STOP: { color: "#EF4444", icon: "\u25A0", label: "Stop Strategy" },
};

interface SystemRecommendationProps {
  level: RecommendationLevel;
  reason: string;
}

export function SystemRecommendation({ level, reason }: SystemRecommendationProps) {
  const config = RECOMMENDATION_CONFIG[level];

  return (
    <div
      className="rounded-xl bg-[#1A0626] p-4 sm:p-5"
      style={{
        border: `1px solid ${config.color}25`,
        borderLeft: `3px solid ${config.color}`,
      }}
    >
      <div className="flex items-start gap-3">
        <span className="text-lg flex-shrink-0 mt-0.5" style={{ color: config.color }}>
          {config.icon}
        </span>
        <div className="space-y-1 min-w-0">
          <h3 className="text-sm font-semibold" style={{ color: config.color }}>
            {config.label}
          </h3>
          <p className="text-xs text-[#CBD5E1] leading-relaxed">{reason}</p>
        </div>
      </div>
    </div>
  );
}
