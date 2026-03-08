/**
 * Pure function to build Incident creation data.
 * No IO, no side effects — computes deadlines from params.
 */

import type { IncidentOpenParams } from "./types";

export interface IncidentCreateData {
  strategyId: string;
  instanceId: string;
  status: "OPEN";
  severity: string;
  triggerRecordId: string;
  reasonCodes: string[];
  snapshotHash: string | null;
  configVersion: string;
  thresholdsHash: string;
  ackDeadlineAt: Date;
  invalidateDeadlineAt: Date | null;
}

export function buildIncidentData(params: IncidentOpenParams): IncidentCreateData {
  const ackDeadlineAt = new Date(params.now.getTime() + params.ackDeadlineMinutes * 60_000);

  const invalidateDeadlineAt =
    params.autoInvalidateMinutes != null
      ? new Date(params.now.getTime() + params.autoInvalidateMinutes * 60_000)
      : null;

  return {
    strategyId: params.strategyId,
    instanceId: params.instanceId,
    status: "OPEN",
    severity: params.severity,
    triggerRecordId: params.triggerRecordId,
    reasonCodes: params.reasonCodes,
    snapshotHash: params.snapshotHash,
    configVersion: params.configVersion,
    thresholdsHash: params.thresholdsHash,
    ackDeadlineAt,
    invalidateDeadlineAt,
  };
}
