/**
 * IncidentPreviewList — shows up to 5 recent incidents for a strategy.
 *
 * Open/escalated incidents appear with urgency styling.
 * Closed incidents show resolution reason.
 */

import type { IncidentSummary } from "@/app/app/strategy/[instanceId]/load-strategy-detail";

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  OPEN: { color: "#F59E0B", label: "Open" },
  ACKNOWLEDGED: { color: "#6366F1", label: "Acknowledged" },
  ESCALATED: { color: "#EF4444", label: "Escalated" },
  CLOSED: { color: "#7C8DB0", label: "Closed" },
};

const REASON_LABELS: Record<string, string> = {
  MONITORING_DRAWDOWN_BREACH: "Drawdown",
  MONITORING_SHARPE_DEGRADATION: "Sharpe",
  MONITORING_LOSS_STREAK: "Loss Streak",
  MONITORING_INACTIVITY: "Inactivity",
  MONITORING_CUSUM_DRIFT: "Drift",
  MONITORING_BASELINE_MISSING: "No Baseline",
  MONITORING_INVALID_INPUT: "Invalid Input",
};

function formatRelativeTime(isoStr: string): string {
  const diffMs = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function IncidentCard({ incident }: { incident: IncidentSummary }) {
  const config = STATUS_CONFIG[incident.status] ?? STATUS_CONFIG.OPEN;
  const isUrgent = incident.status === "OPEN" || incident.status === "ESCALATED";

  return (
    <div
      className="rounded-lg p-3 space-y-2"
      style={{
        backgroundColor: isUrgent ? `${config.color}12` : "rgba(10,1,24,0.5)",
        border: `1px solid ${config.color}${isUrgent ? "35" : "15"}`,
        borderLeft: isUrgent ? `3px solid ${config.color}` : undefined,
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full border"
            style={{
              backgroundColor: `${config.color}15`,
              color: config.color,
              borderColor: `${config.color}25`,
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: config.color }} />
            {config.label}
          </span>
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded"
            style={{
              color: incident.severity === "INVALIDATED" ? "#EF4444" : "#F59E0B",
            }}
          >
            {incident.severity}
          </span>
        </div>
        <span className="text-[10px] text-[#7C8DB0]">{formatRelativeTime(incident.openedAt)}</span>
      </div>

      {/* Reason codes */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {incident.reasonCodes.map((code) => (
          <span
            key={code}
            className="text-[10px] text-[#7C8DB0] px-1.5 py-0.5 rounded bg-[rgba(79,70,229,0.08)] border border-[rgba(79,70,229,0.12)]"
          >
            {REASON_LABELS[code] ?? code}
          </span>
        ))}
      </div>

      {/* ACK deadline or close reason */}
      {isUrgent && (
        <p className="text-[10px] text-[#F59E0B]">
          ACK expected: {new Date(incident.ackDeadlineAt).toLocaleString()}
          {incident.escalationCount > 0 && ` (escalated ${incident.escalationCount}x)`}
        </p>
      )}
      {incident.status === "CLOSED" && incident.closeReason && (
        <p className="text-[10px] text-[#7C8DB0]">
          Resolved: {incident.closeReason.toLowerCase().replace(/_/g, " ")}
        </p>
      )}
    </div>
  );
}

interface IncidentPreviewListProps {
  incidents: IncidentSummary[];
}

export function IncidentPreviewList({ incidents }: IncidentPreviewListProps) {
  if (incidents.length === 0) {
    return (
      <div className="rounded-xl bg-[#1A0626] border border-[rgba(79,70,229,0.15)] p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#7C8DB0] mb-3">
          Recent Incidents
        </p>
        <p className="text-xs text-[#7C8DB0]">No incidents recorded. This is a positive signal.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-[#1A0626] border border-[rgba(79,70,229,0.15)] p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#7C8DB0] mb-3">
        Recent Incidents
      </p>
      <div className="space-y-2">
        {incidents.map((incident) => (
          <IncidentCard key={incident.id} incident={incident} />
        ))}
      </div>
    </div>
  );
}
