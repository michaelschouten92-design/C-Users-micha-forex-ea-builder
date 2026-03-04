/**
 * Deterministic hashing for strategy identity bindings.
 *
 * Produces stable SHA-256 hashes for strategy version snapshots and
 * backtest baselines, enabling tamper-evident identity verification.
 */

import { sha256 } from "@/lib/track-record/canonical";
import { stableJSON } from "./chain";

const SCHEMA_VERSION = "1";

export interface SnapshotHashInput {
  fingerprint: string;
  logicHash: string;
  parameterHash: string;
  versionNo: number;
}

export interface BaselineHashInput {
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  maxDrawdownPct: number;
  avgTradesPerDay: number;
  netReturnPct: number;
  sharpeRatio: number;
  initialDeposit: number;
  backtestDurationDays: number;
}

/**
 * Compute a deterministic hash for a strategy version snapshot.
 * Includes schemaVersion to allow future format evolution.
 */
export function computeSnapshotHash(input: SnapshotHashInput): string {
  return sha256(
    stableJSON({
      schemaVersion: SCHEMA_VERSION,
      fingerprint: input.fingerprint,
      logicHash: input.logicHash,
      parameterHash: input.parameterHash,
      versionNo: input.versionNo,
    })
  );
}

/**
 * Compute a deterministic hash for a backtest baseline.
 * Excludes nullable `volatility` and unstructured `rawMetrics`.
 */
export function computeBaselineHash(input: BaselineHashInput): string {
  return sha256(
    stableJSON({
      totalTrades: input.totalTrades,
      winRate: input.winRate,
      profitFactor: input.profitFactor,
      maxDrawdownPct: input.maxDrawdownPct,
      avgTradesPerDay: input.avgTradesPerDay,
      netReturnPct: input.netReturnPct,
      sharpeRatio: input.sharpeRatio,
      initialDeposit: input.initialDeposit,
      backtestDurationDays: input.backtestDurationDays,
    })
  );
}
