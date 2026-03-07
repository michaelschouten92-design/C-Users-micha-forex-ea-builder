/**
 * MonitoringStatusBadge — primary health indicator for strategy cards.
 *
 * Shows HEALTHY / AT_RISK / INVALIDATED with consistent color coding.
 * Reusable on dashboard cards and detail pages.
 */

import type { MonitoringStatus } from "@/app/app/load-command-center-data";

const CONFIG: Record<MonitoringStatus, { color: string; label: string }> = {
  HEALTHY: { color: "#10B981", label: "Healthy" },
  AT_RISK: { color: "#F59E0B", label: "At Risk" },
  INVALIDATED: { color: "#EF4444", label: "Invalidated" },
};

interface MonitoringStatusBadgeProps {
  status: MonitoringStatus;
  size?: "sm" | "md";
}

export function MonitoringStatusBadge({ status, size = "sm" }: MonitoringStatusBadgeProps) {
  const config = CONFIG[status];
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";
  const px = size === "sm" ? "px-2 py-0.5" : "px-2.5 py-1";

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${px} ${textSize} font-semibold rounded-full border`}
      style={{
        backgroundColor: `${config.color}15`,
        color: config.color,
        borderColor: `${config.color}25`,
      }}
    >
      <span
        className={`${size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2"} rounded-full`}
        style={{ backgroundColor: config.color }}
      />
      {config.label}
    </span>
  );
}
