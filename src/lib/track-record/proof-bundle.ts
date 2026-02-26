/**
 * Proof Bundle Assembly
 *
 * Packages everything a third party needs to independently verify
 * a track record into a single self-contained JSON document.
 *
 * The bundle contains:
 * 1. The signed investor report (manifest + body)
 * 2. All ledger events in the range (for independent replay)
 * 3. HMAC checkpoints (for faster partial verification)
 * 4. Broker evidence and digests (for Level 2)
 * 5. Pre-computed verification result
 *
 * A verifier only needs this bundle — no database access, no API calls.
 */

import { prisma } from "@/lib/prisma";
import type { ProofBundle } from "./types";
import { generateInvestorReport } from "./report-generator";
import { verifyProofBundle } from "./verifier";
import { moneyStr } from "./decimal";

/**
 * Generate a complete proof bundle for an instance.
 */
export async function generateProofBundle(
  instanceId: string,
  fromSeqNo?: number,
  toSeqNo?: number
): Promise<ProofBundle> {
  // Load events once and share with report generator (avoids double-loading)
  const whereClause: Record<string, unknown> = { instanceId };
  if (fromSeqNo != null || toSeqNo != null) {
    whereClause.seqNo = {};
    if (fromSeqNo != null) (whereClause.seqNo as Record<string, unknown>).gte = fromSeqNo;
    if (toSeqNo != null) (whereClause.seqNo as Record<string, unknown>).lte = toSeqNo;
  }

  const dbEvents = await prisma.trackRecordEvent.findMany({
    where: whereClause,
    orderBy: { seqNo: "asc" },
    take: 100_000,
  });

  // Generate the investor report, passing pre-loaded events to avoid re-querying
  const report = await generateInvestorReport(instanceId, fromSeqNo, toSeqNo, dbEvents);

  const events = dbEvents.map((e) => ({
    seqNo: e.seqNo,
    eventType: e.eventType,
    eventHash: e.eventHash,
    prevHash: e.prevHash,
    timestamp: Math.floor(e.timestamp.getTime() / 1000),
    payload: e.payload as Record<string, unknown>,
  }));

  // Load checkpoints
  const dbCheckpoints = await prisma.trackRecordCheckpoint.findMany({
    where: whereClause.seqNo
      ? { instanceId, seqNo: whereClause.seqNo as Record<string, number> }
      : { instanceId },
    orderBy: { seqNo: "asc" },
  });

  const checkpoints = dbCheckpoints.map((c) => ({
    seqNo: c.seqNo,
    hmac: c.hmac,
    balance: moneyStr(c.balance),
    equity: moneyStr(c.equity),
    highWaterMark: moneyStr(c.highWaterMark),
  }));

  // Extract broker evidence from events
  const brokerEvidence = events
    .filter((e) => e.eventType === "BROKER_EVIDENCE")
    .map((e) => ({
      brokerTicket: (e.payload.brokerTicket as string) ?? "",
      executionTimestamp: (e.payload.executionTimestamp as number) ?? 0,
      symbol: (e.payload.symbol as string) ?? "",
      volume: moneyStr((e.payload.volume as number) ?? 0),
      executionPrice: ((e.payload.executionPrice as number) ?? 0).toFixed(8),
      linkedTicket: (e.payload.linkedTicket as string) ?? "",
    }));

  // Extract broker digests from events
  const brokerDigests = events
    .filter((e) => e.eventType === "BROKER_HISTORY_DIGEST")
    .map((e) => ({
      periodStart: (e.payload.periodStart as string) ?? "",
      periodEnd: (e.payload.periodEnd as string) ?? "",
      tradeCount: (e.payload.tradeCount as number) ?? 0,
      historyHash: (e.payload.historyHash as string) ?? "",
    }));

  // Load ledger commitments
  const dbCommitments = await prisma.ledgerCommitment.findMany({
    where: whereClause.seqNo
      ? { instanceId, seqNo: whereClause.seqNo as Record<string, number> }
      : { instanceId },
    orderBy: { seqNo: "asc" },
  });

  const commitments = dbCommitments.map((c) => ({
    seqNo: c.seqNo,
    commitmentHash: c.commitmentHash,
    lastEventHash: c.lastEventHash,
    stateHmac: c.stateHmac,
    notarizedAt: c.notarizedAt?.toISOString() ?? null,
    provider: c.provider,
    proof: c.proof,
    verifyUrl: c.verifyUrl,
  }));

  // Build a preliminary verification (will be recomputed by the verifier)
  const preliminaryBundle: ProofBundle = {
    report,
    events,
    checkpoints,
    brokerEvidence,
    brokerDigests,
    commitments,
    verification: {
      level: "L0_NONE",
      l1: {
        chainValid: false,
        chainLength: 0,
        checkpointsValid: false,
        checkpointCount: 0,
        signatureValid: false,
        reportReproducible: false,
        errors: [],
        caveats: [],
      },
      l2: null,
      l3: null,
      verified: false,
      summary: "",
    },
  };

  // Run verification on the assembled bundle
  const verification = verifyProofBundle(preliminaryBundle);

  return {
    ...preliminaryBundle,
    verification,
  };
}
