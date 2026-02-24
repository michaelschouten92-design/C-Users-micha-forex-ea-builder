"use client";

import type { ReactNode } from "react";
import type { StrategyStatus, StatusConfidence } from "@/lib/strategy-status/resolver";

// ============================================
// STATUS CONFIGURATION
// ============================================

interface StatusConfig {
  color: string;
  label: string;
  icon: ReactNode;
}

const ShieldIcon = (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
    />
  </svg>
);

const EyeIcon = (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
    />
  </svg>
);

const FlaskIcon = (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9.75 3v4.5m4.5-4.5v4.5M9.75 7.5l-3 9.5a2 2 0 001.9 2.5h6.7a2 2 0 001.9-2.5l-3-9.5m-4.5 0h4.5"
    />
  </svg>
);

const WarningIcon = (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
    />
  </svg>
);

const TrendingDownIcon = (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
    />
  </svg>
);

const PauseIcon = (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const STATUS_CONFIG: Record<StrategyStatus, StatusConfig> = {
  VERIFIED: { color: "#10B981", label: "Verified", icon: ShieldIcon },
  MONITORING: { color: "#6366F1", label: "Monitoring", icon: EyeIcon },
  TESTING: { color: "#A78BFA", label: "Testing", icon: FlaskIcon },
  UNSTABLE: { color: "#F59E0B", label: "Unstable", icon: WarningIcon },
  EDGE_DEGRADED: { color: "#EF4444", label: "Edge Degraded", icon: TrendingDownIcon },
  INACTIVE: { color: "#7C8DB0", label: "Inactive", icon: PauseIcon },
};

// ============================================
// BADGE COMPONENT
// ============================================

interface StrategyStatusBadgeProps {
  status: StrategyStatus;
  confidence?: StatusConfidence | null;
  variant?: "compact" | "expanded";
  explanation?: string | null;
}

/**
 * Unified strategy status badge.
 *
 * - **compact**: Colored dot + label (for EA cards, lists)
 * - **expanded**: Icon + label + optional tooltip/confidence (for detail views)
 */
export function StrategyStatusBadge({
  status,
  confidence,
  variant = "compact",
  explanation,
}: StrategyStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  if (variant === "compact") {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full border"
        style={{
          backgroundColor: `${config.color}15`,
          color: config.color,
          borderColor: `${config.color}25`,
        }}
        title={explanation ?? config.label}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: config.color }} />
        {config.label}
      </span>
    );
  }

  // Expanded variant
  return (
    <div className="inline-flex flex-col gap-0.5">
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border"
        style={{
          backgroundColor: `${config.color}15`,
          color: config.color,
          borderColor: `${config.color}25`,
        }}
        title={explanation ?? config.label}
      >
        {config.icon}
        {config.label}
        {confidence && (
          <span className="text-[10px] opacity-70">({confidence.toLowerCase()} confidence)</span>
        )}
      </span>
      {explanation && <span className="text-[10px] text-[#7C8DB0] pl-1">{explanation}</span>}
    </div>
  );
}
