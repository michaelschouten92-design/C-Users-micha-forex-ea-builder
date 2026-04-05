/**
 * Shared alert severity mapping.
 *
 * Single source of truth for alertType → severity bucket.
 * Used by both backend (email/webhook subjects) and UI (notification bell styling).
 */

export type ControlLayerAlertType =
  | "DEPLOYMENT_INVALIDATED"
  | "DEPLOYMENT_RESTRICTED"
  | "DEPLOYMENT_REVIEW"
  | "MONITOR_OFFLINE"
  | "BASELINE_MISSING"
  | "VERSION_OUTDATED"
  | "HEALTH_DEGRADED"
  | "HEALTH_CRITICAL"
  | "EDGE_DECAY_WARNING";

export type AlertSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export const ALERT_SEVERITY: Record<ControlLayerAlertType, AlertSeverity> = {
  DEPLOYMENT_INVALIDATED: "CRITICAL",
  DEPLOYMENT_RESTRICTED: "HIGH",
  DEPLOYMENT_REVIEW: "MEDIUM",
  MONITOR_OFFLINE: "MEDIUM",
  BASELINE_MISSING: "LOW",
  VERSION_OUTDATED: "LOW",
  HEALTH_DEGRADED: "HIGH",
  HEALTH_CRITICAL: "CRITICAL",
  EDGE_DECAY_WARNING: "MEDIUM",
};

export function getAlertSeverity(alertType: string): AlertSeverity {
  return (ALERT_SEVERITY as Record<string, AlertSeverity>)[alertType] ?? "LOW";
}
