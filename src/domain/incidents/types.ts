export type IncidentStatus = "OPEN" | "ACKNOWLEDGED" | "ESCALATED" | "CLOSED";
export type IncidentSeverity = "AT_RISK" | "INVALIDATED";
export type IncidentCloseReason =
  | "RECOVERED"
  | "INVALIDATED"
  | "AUTO_INVALIDATED"
  | "OVERRIDE_APPLIED";

export interface IncidentOpenParams {
  strategyId: string;
  instanceId: string;
  severity: IncidentSeverity;
  triggerRecordId: string;
  reasonCodes: string[];
  snapshotHash: string | null;
  configVersion: string;
  thresholdsHash: string;
  ackDeadlineMinutes: number;
  autoInvalidateMinutes: number | null;
  now: Date;
}
