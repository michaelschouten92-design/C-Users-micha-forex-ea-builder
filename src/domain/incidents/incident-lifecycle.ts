/**
 * Pure incident lifecycle decision functions.
 * No IO, no side effects — stateless predicates.
 */

import type { IncidentStatus } from "./types";

/** Returns true if the incident can be acknowledged (ACK). */
export function canAcknowledge(status: IncidentStatus): boolean {
  return status === "OPEN" || status === "ESCALATED";
}

/** Returns true if the incident should be escalated (overdue ACK). */
export function shouldEscalate(
  incident: { status: string; ackDeadlineAt: Date },
  now: Date
): boolean {
  return incident.status === "OPEN" && incident.ackDeadlineAt <= now;
}

/** Returns true if the incident should be auto-invalidated (deadline exceeded). */
export function shouldAutoInvalidate(
  incident: { status: string; invalidateDeadlineAt: Date | null },
  now: Date
): boolean {
  if (incident.status !== "OPEN" && incident.status !== "ESCALATED") return false;
  if (incident.invalidateDeadlineAt == null) return false;
  return incident.invalidateDeadlineAt <= now;
}
