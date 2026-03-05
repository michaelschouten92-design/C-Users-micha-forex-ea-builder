/**
 * Shared helpers for audit replay and bundle routes.
 * No secrets, no raw meta blobs — whitelisted extraction only.
 */

import { NextRequest } from "next/server";
import { timingSafeEqual } from "@/lib/csrf";
import { prisma } from "@/lib/prisma";
import { verifyProofChain, type StoredProofEvent } from "@/lib/proof/chain";
import { computeThresholdsHash } from "@/domain/verification/config-snapshot";
import {
  verifyHeartbeatProofEvent,
  HEARTBEAT_EVENT_TYPES,
} from "@/domain/audit/verify-heartbeat-proof";

// ── Auth ─────────────────────────────────────────────────

export function authenticateInternal(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-internal-api-key");
  const expectedKey = process.env.INTERNAL_API_KEY;

  if (!expectedKey) return false;
  if (!apiKey) return false;

  return timingSafeEqual(apiKey, expectedKey);
}

// ── Whitelisted meta keys for extracted payload ──────────

export const EXTRACTED_KEYS = new Set([
  "strategyId",
  "verdict",
  "reasonCodes",
  "reasons",
  "configVersion",
  "thresholdsHash",
  "configSource",
  "tradeSnapshotHash",
  "tradeFactCount",
  "liveFactCount",
  "monitoringVerdict",
  "snapshotRange",
  "dataSources",
  "monteCarloSeed",
  "monteCarloIterations",
  // Heartbeat proof event fields (safe enums + canonical JSON, no secrets)
  "governanceSnapshot",
  "action",
  "reasonCode",
  "originalAction",
  "originalReasonCode",
  "guardedAction",
  "guardedReasonCode",
]);

export function extractWhitelisted(meta: unknown): Record<string, unknown> {
  if (!meta || typeof meta !== "object") return {};
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta as Record<string, unknown>)) {
    if (EXTRACTED_KEYS.has(key)) {
      result[key] = value;
    }
  }
  return result;
}

// ── Run type detection ───────────────────────────────────

export type RunType = "verification" | "monitoring" | "unknown";

export function detectRunType(events: { type: string }[]): RunType {
  for (const evt of events) {
    if (evt.type === "VERIFICATION_RUN_COMPLETED") return "verification";
    if (evt.type === "MONITORING_RUN_COMPLETED") return "monitoring";
  }
  return "unknown";
}

// ── Verification result type ─────────────────────────────

export interface VerificationStatus {
  status: "OK" | "FAILED" | "NOT_VERIFIABLE";
  expectedHash?: string;
  actualHash?: string;
  details?: string;
}

// ── Config verification ──────────────────────────────────

export async function verifyConfig(
  configVersion: string | undefined,
  thresholdsHash: string | undefined
): Promise<VerificationStatus> {
  if (!configVersion || !thresholdsHash) {
    return {
      status: "NOT_VERIFIABLE",
      details: "configVersion or thresholdsHash missing from run payload",
    };
  }

  try {
    const configRow = await prisma.verificationConfig.findUnique({
      where: { configVersion },
      select: { snapshot: true, thresholdsHash: true },
    });

    if (!configRow) {
      return {
        status: "NOT_VERIFIABLE",
        details: `No config snapshot found for version ${configVersion}`,
      };
    }

    if (configRow.thresholdsHash !== thresholdsHash) {
      return {
        status: "FAILED",
        expectedHash: thresholdsHash,
        actualHash: configRow.thresholdsHash,
        details: "thresholdsHash in run payload does not match config snapshot row",
      };
    }

    const snapshot = configRow.snapshot as Record<string, unknown> | null;
    if (!snapshot || !snapshot.thresholds) {
      return { status: "NOT_VERIFIABLE", details: "Config snapshot JSON missing thresholds" };
    }

    const thresholds = snapshot.thresholds as Record<string, number>;
    const monitoringThresholds = snapshot.monitoringThresholds as
      | Record<string, unknown>
      | undefined;

    const recomputedHash = computeThresholdsHash(
      thresholds as never,
      monitoringThresholds as never
    );

    if (recomputedHash !== thresholdsHash) {
      return {
        status: "FAILED",
        expectedHash: thresholdsHash,
        actualHash: recomputedHash,
        details: "Recomputed thresholdsHash from snapshot does not match stored hash",
      };
    }

    return { status: "OK", expectedHash: thresholdsHash, actualHash: recomputedHash };
  } catch {
    return { status: "FAILED", details: "Error during config verification" };
  }
}

// ── Snapshot verification ────────────────────────────────

export async function verifySnapshot(
  snapshotHash: string | undefined,
  strategyId: string | undefined,
  runType: RunType
): Promise<VerificationStatus> {
  if (!snapshotHash) {
    return { status: "NOT_VERIFIABLE", details: "No snapshotHash in run payload" };
  }

  if (!strategyId) {
    return { status: "NOT_VERIFIABLE", details: "No strategyId available to recompute snapshot" };
  }

  if (runType !== "monitoring") {
    return {
      status: "NOT_VERIFIABLE",
      details: "Snapshot recomputation only supported for monitoring runs",
    };
  }

  try {
    const { buildTradeSnapshot } = await import("@/domain/trade-ingest/build-snapshot");

    const facts = await prisma.tradeFact.findMany({
      where: { strategyId, source: "LIVE" },
      orderBy: [{ executedAt: "asc" }, { id: "asc" }],
      select: { id: true, profit: true, executedAt: true, source: true },
    });

    if (facts.length === 0) {
      return { status: "NOT_VERIFIABLE", details: "No LIVE TradeFacts found for recomputation" };
    }

    const LIVE_SNAPSHOT_INITIAL_BALANCE = 10000;
    const recomputed = buildTradeSnapshot(facts, LIVE_SNAPSHOT_INITIAL_BALANCE);

    if (recomputed.snapshotHash === snapshotHash) {
      return { status: "OK" };
    }

    return {
      status: "FAILED",
      details: `Recomputed hash ${recomputed.snapshotHash.slice(0, 16)}... does not match stored ${snapshotHash.slice(0, 16)}...`,
    };
  } catch {
    return { status: "FAILED", details: "Error during snapshot recomputation" };
  }
}

// ── Core replay computation ──────────────────────────────

export interface ReplayResult {
  recordId: string;
  chain: {
    ok: boolean;
    chainLength: number;
    error?: string;
    breakAtSequence?: number;
  };
  runType: RunType;
  extracted: Record<string, unknown>;
  snapshotVerification: VerificationStatus;
  configVerification: VerificationStatus;
  heartbeatVerification: VerificationStatus;
  events: {
    sequence: number | null;
    type: string;
    strategyId: string | null;
    createdAt: Date;
    eventHash: string | null;
    prevEventHash: string | null;
    payload: Record<string, unknown>;
  }[];
  /** First strategyId found in chain events (for proof logging). */
  strategyId: string | undefined;
}

// ── Heartbeat semantic verification ──────────────────────

export function verifyHeartbeatEvents(
  events: { type: string; meta: unknown }[]
): VerificationStatus {
  const heartbeatEvents = events.filter((e) => HEARTBEAT_EVENT_TYPES.has(e.type));

  if (heartbeatEvents.length === 0) {
    return { status: "NOT_VERIFIABLE", details: "No heartbeat events in chain" };
  }

  for (const event of heartbeatEvents) {
    const payload =
      event.meta && typeof event.meta === "object" ? (event.meta as Record<string, unknown>) : {};
    const result = verifyHeartbeatProofEvent(event.type, payload);
    if (!result.ok) {
      return { status: "FAILED", details: result.failureCode };
    }
  }

  return { status: "OK" };
}

// ── Core replay computation ──────────────────────────────

export async function computeReplay(recordId: string): Promise<ReplayResult> {
  const chainedEvents = await prisma.proofEventLog.findMany({
    where: { sessionId: recordId, sequence: { not: null } },
    orderBy: { sequence: "asc" },
    select: {
      sequence: true,
      strategyId: true,
      type: true,
      sessionId: true,
      eventHash: true,
      prevEventHash: true,
      meta: true,
      createdAt: true,
    },
  });

  const chainResult = verifyProofChain(chainedEvents as unknown as StoredProofEvent[]);

  const chain = {
    ok: chainResult.valid,
    chainLength: chainResult.chainLength,
    ...(chainResult.error ? { error: chainResult.error } : {}),
    ...(chainResult.breakAtSequence != null
      ? { breakAtSequence: chainResult.breakAtSequence }
      : {}),
  };

  const runType = detectRunType(chainedEvents);

  const completionEvent = chainedEvents.find(
    (e) => e.type === "VERIFICATION_RUN_COMPLETED" || e.type === "MONITORING_RUN_COMPLETED"
  );

  const extracted = completionEvent ? extractWhitelisted(completionEvent.meta) : {};

  const strategyId = (extracted.strategyId as string) ?? chainedEvents[0]?.strategyId ?? undefined;
  const configVersion = extracted.configVersion as string | undefined;
  const thresholdsHash = extracted.thresholdsHash as string | undefined;
  const snapshotHash = (extracted.tradeSnapshotHash as string) ?? undefined;

  const [configVerification, snapshotVerification] = await Promise.all([
    verifyConfig(configVersion, thresholdsHash),
    verifySnapshot(snapshotHash, strategyId, runType),
  ]);

  // Semantic verification of heartbeat proof events (pure, no I/O)
  const heartbeatVerification = verifyHeartbeatEvents(chainedEvents);

  const events = chainedEvents.map((e) => ({
    sequence: e.sequence,
    type: e.type,
    strategyId: e.strategyId,
    createdAt: e.createdAt,
    eventHash: e.eventHash,
    prevEventHash: e.prevEventHash,
    payload: extractWhitelisted(e.meta),
  }));

  return {
    recordId,
    chain,
    runType,
    extracted,
    snapshotVerification,
    configVerification,
    heartbeatVerification,
    events,
    strategyId,
  };
}

// ── Stable JSON serialization ────────────────────────────

/**
 * Recursively sort object keys for deterministic JSON output.
 * Arrays preserve order; nested objects get sorted keys.
 */
export function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, val) => {
    if (val && typeof val === "object" && !Array.isArray(val) && !(val instanceof Date)) {
      const sorted: Record<string, unknown> = {};
      for (const k of Object.keys(val).sort()) {
        sorted[k] = (val as Record<string, unknown>)[k];
      }
      return sorted;
    }
    return val;
  });
}

// ── Best-effort proof event logging ──────────────────────

export async function logAuditAccess(
  strategyId: string | undefined,
  recordId: string,
  mode: "replay" | "bundle"
): Promise<void> {
  if (!strategyId) return; // Cannot log without strategyId

  try {
    const { appendProofEvent } = await import("@/lib/proof/events");
    await appendProofEvent(strategyId, "AUDIT_REPLAY_PERFORMED", {
      eventType: "AUDIT_REPLAY_PERFORMED",
      recordId,
      mode,
      timestamp: new Date().toISOString(),
    });
  } catch {
    // Best-effort — do not break replay/bundle response
  }
}
