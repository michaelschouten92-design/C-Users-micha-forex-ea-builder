/**
 * Strategy Identity types — fingerprinting and versioning for strategy tracking.
 */

export interface FingerprintResult {
  fingerprint: string;
  logicHash: string;
  parameterHash: string;
}

export interface StrategyIdentityInfo {
  id: string;
  projectId: string | null;
  origin: "PROJECT" | "EXTERNAL";
  strategyId: string;
  currentFingerprint: string;
  currentVersionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StrategyVersionInfo {
  id: string;
  strategyIdentityId: string;
  buildVersionId: string | null;
  versionNo: number;
  fingerprint: string;
  logicHash: string;
  parameterHash: string;
  createdAt: Date;
}
