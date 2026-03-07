/**
 * IncidentTimeline — chronological audit-style view of governance events.
 *
 * Derives timeline events from existing strategy detail data:
 * monitoring runs, drift detection, and incidents.
 */

import type {
  HealthSnapshotDetail,
  IncidentSummary,
  MonitoringRunSummary,
} from "@/app/app/strategy/[instanceId]/load-strategy-detail";
import { DisclosureSection } from "./disclosure-section";

// ── Types ─────────────────────────────────────────────────

type EventSeverity = "normal" | "attention" | "critical";

interface TimelineEvent {
  id: string;
  type: "monitoring" | "incident" | "drift";
  title: string;
  timestamp: string;
  meta?: string;
  severity: EventSeverity;
}

// ── Derivation ────────────────────────────────────────────

const REASON_LABELS: Record<string, string> = {
  MONITORING_DRAWDOWN_BREACH: "Drawdown",
  MONITORING_SHARPE_DEGRADATION: "Sharpe",
  MONITORING_LOSS_STREAK: "Loss Streak",
  MONITORING_INACTIVITY: "Inactivity",
  MONITORING_CUSUM_DRIFT: "Drift",
  MONITORING_BASELINE_MISSING: "No Baseline",
  MONITORING_INVALID_INPUT: "Invalid Input",
};

function deriveTimelineEvents(
  latestRun: MonitoringRunSummary | null,
  health: HealthSnapshotDetail | null,
  incidents: IncidentSummary[]
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // A) Monitoring run
  if (latestRun?.completedAt) {
    const severity: EventSeverity =
      latestRun.verdict === "INVALIDATED"
        ? "critical"
        : latestRun.verdict === "AT_RISK"
          ? "attention"
          : "normal";
    events.push({
      id: `run-${latestRun.completedAt}`,
      type: "monitoring",
      title: "Monitoring run completed",
      timestamp: latestRun.completedAt,
      meta: latestRun.verdict ? `Verdict: ${latestRun.verdict}` : undefined,
      severity,
    });
  }

  // B) Drift detection
  if (health?.driftDetected) {
    events.push({
      id: `drift-${health.createdAt}`,
      type: "drift",
      title: "Edge drift detected",
      timestamp: health.createdAt,
      meta: `Severity: ${Math.round(health.driftSeverity * 100)}%`,
      severity: "attention",
    });
  }

  // C) Incidents
  for (const inc of incidents) {
    const reasons = inc.reasonCodes.map((c) => REASON_LABELS[c] ?? c).join(", ");

    // Opened (fold escalation count into metadata if present)
    const metaParts = [inc.severity, reasons].filter(Boolean);
    if (inc.escalationCount > 0) {
      metaParts.push(`escalated ${inc.escalationCount}x`);
    }
    events.push({
      id: `inc-open-${inc.id}`,
      type: "incident",
      title: "Incident opened",
      timestamp: inc.openedAt,
      meta: metaParts.join(" \u2014 "),
      severity:
        inc.severity === "INVALIDATED" || inc.escalationCount > 0 ? "critical" : "attention",
    });

    // Closed
    if (inc.closedAt) {
      events.push({
        id: `inc-close-${inc.id}`,
        type: "incident",
        title: "Incident closed",
        timestamp: inc.closedAt,
        meta: inc.closeReason ? inc.closeReason.toLowerCase().replace(/_/g, " ") : undefined,
        severity: "normal",
      });
    }
  }

  // Sort newest first
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return events;
}

// ── Severity colors ───────────────────────────────────────

const SEVERITY_COLORS: Record<EventSeverity, string> = {
  normal: "#7C8DB0",
  attention: "#F59E0B",
  critical: "#EF4444",
};

// ── Component ─────────────────────────────────────────────

interface IncidentTimelineProps {
  latestRun: MonitoringRunSummary | null;
  health: HealthSnapshotDetail | null;
  incidents: IncidentSummary[];
}

export function IncidentTimeline({ latestRun, health, incidents }: IncidentTimelineProps) {
  const events = deriveTimelineEvents(latestRun, health, incidents);

  if (events.length === 0) return null;

  return (
    <DisclosureSection title="Event Timeline" count={events.length}>
      <div className="pt-3 pl-3">
        {events.map((event, i) => {
          const color = SEVERITY_COLORS[event.severity];
          const isLast = i === events.length - 1;

          return (
            <div key={event.id} className="flex gap-3">
              {/* Dot + connector */}
              <div className="flex flex-col items-center flex-shrink-0">
                <div
                  className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                {!isLast && (
                  <div
                    className="w-px flex-1 min-h-[24px]"
                    style={{ backgroundColor: `${color}30` }}
                  />
                )}
              </div>

              {/* Content */}
              <div className="pb-4 min-w-0">
                <p className="text-xs font-medium text-[#E2E8F0]">{event.title}</p>
                <p className="text-[10px] text-[#7C8DB0] mt-0.5">
                  {new Date(event.timestamp).toLocaleString()}
                </p>
                {event.meta && (
                  <p className="text-[10px] mt-0.5" style={{ color }}>
                    {event.meta}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </DisclosureSection>
  );
}
