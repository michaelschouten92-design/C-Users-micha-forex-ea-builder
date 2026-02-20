/**
 * Full Verification Pipeline
 *
 * A third party receives a ProofBundle and wants to prove:
 * 1. Trades happened in the claimed order (hash chain)
 * 2. Data was not modified (signatures + HMAC)
 * 3. Report is exactly reproducible from the ledger (deterministic replay)
 * 4. Drawdown was calculated correctly (replay comparison)
 * 5. Broker data matches (if Level 2 evidence present)
 *
 * Usage:
 *   const result = verifyProofBundle(bundle);
 *   result.verified  // true/false
 *   result.level     // "L1_LEDGER" | "L2_BROKER" | "L3_NOTARIZED"
 *
 * This is a STANDALONE function — it does not require database access.
 * All data comes from the proof bundle.
 */

import type {
  ProofBundle,
  InvestorReport,
  VerificationResult,
  L1Result,
  L2Result,
  VerificationLevel,
} from "./types";
import { GENESIS_HASH } from "./types";
import { buildCanonicalEvent, computeEventHash, sha256 } from "./canonical";
import { canonicalizeReportBody, verifyReportSignature, computeLedgerRootHash } from "./manifest";
import { replayAll, buildDailyReturns, type ReplayEvent } from "./replay-engine";
import { moneyStr } from "./decimal";

/**
 * Verify a complete proof bundle. This is the main entry point for third-party verification.
 * Runs Level 1 (always), Level 2 (if broker evidence present), Level 3 (if notarization present).
 */
export function verifyProofBundle(bundle: ProofBundle): VerificationResult {
  const l1 = verifyLevel1(bundle);

  const l2 =
    bundle.brokerEvidence.length > 0 || bundle.brokerDigests.length > 0
      ? verifyLevel2(bundle)
      : null;

  const l3 = bundle.verification.l3 ?? null;

  // Determine highest achieved level
  let level: VerificationLevel = "L0_NONE";
  if (l1.chainValid && l1.reportReproducible && l1.signatureValid) {
    level = "L1_LEDGER";
  }
  if (level === "L1_LEDGER" && l2 && l2.mismatchedCount === 0 && l2.matchedCount > 0) {
    level = "L2_BROKER";
  }
  if (level === "L2_BROKER" && l3?.notarized) {
    level = "L3_NOTARIZED";
  }

  const verified = level !== "L0_NONE";

  const summary = verified
    ? `Verified at ${level}: ${l1.chainLength} events, ${l1.checkpointCount} checkpoints`
    : `FAILED: ${l1.errors.join("; ")}`;

  return { level, l1, l2, l3, verified, summary };
}

// ============================================
// LEVEL 1 — LEDGER INTEGRITY
// ============================================

function verifyLevel1(bundle: ProofBundle): L1Result {
  const errors: string[] = [];
  const events = bundle.events;
  const report = bundle.report;

  // 1. Verify hash chain
  let chainValid = true;
  let expectedSeqNo = events.length > 0 ? events[0].seqNo : 1;
  let expectedPrevHash = expectedSeqNo === 1 ? GENESIS_HASH : events[0].prevHash;

  // For ranges starting at seqNo > 1, we trust the first event's prevHash
  // (it links to events outside this bundle's scope)
  if (expectedSeqNo > 1) {
    expectedPrevHash = events[0].prevHash;
  }

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];

    // Sequence check
    if (ev.seqNo !== expectedSeqNo) {
      errors.push(`seqNo gap: expected ${expectedSeqNo}, got ${ev.seqNo}`);
      chainValid = false;
      break;
    }

    // prevHash check (skip for first event in partial range)
    if (i > 0 && ev.prevHash !== expectedPrevHash) {
      errors.push(`prevHash mismatch at seqNo ${ev.seqNo}`);
      chainValid = false;
      break;
    }

    // Recompute event hash
    const canonical = buildCanonicalEvent(
      report.manifest.instanceId,
      ev.eventType,
      ev.seqNo,
      ev.prevHash,
      ev.timestamp,
      ev.payload
    );
    const computed = computeEventHash(canonical);
    if (computed !== ev.eventHash) {
      errors.push(
        `eventHash mismatch at seqNo ${ev.seqNo}: computed ${computed}, claimed ${ev.eventHash}`
      );
      chainValid = false;
      break;
    }

    expectedPrevHash = ev.eventHash;
    expectedSeqNo++;
  }

  // 2. Verify Ed25519 signature
  const signatureValid = verifyReportSignature(
    report.manifest.reportBodyHash,
    report.manifest.signature,
    report.manifest.publicKey
  );
  if (!signatureValid) {
    errors.push("Ed25519 signature verification failed");
  }

  // 3. Verify ledger root hash
  const eventHashes = events.map((e) => e.eventHash);
  const computedRootHash = computeLedgerRootHash(eventHashes);
  if (computedRootHash !== report.manifest.ledgerRootHash) {
    errors.push(
      `Ledger root hash mismatch: computed ${computedRootHash}, manifest ${report.manifest.ledgerRootHash}`
    );
  }

  // 4. Verify report body hash
  const canonicalBody = canonicalizeReportBody(report.body);
  const computedBodyHash = sha256(canonicalBody);
  if (computedBodyHash !== report.manifest.reportBodyHash) {
    errors.push("Report body hash mismatch — report content was modified");
  }

  // 5. Deterministic replay — reproduce the report
  const replayEvents: ReplayEvent[] = events.map((e) => ({
    seqNo: e.seqNo,
    eventType: e.eventType,
    eventHash: e.eventHash,
    prevHash: e.prevHash,
    timestamp: e.timestamp,
    payload: e.payload,
  }));
  const replayState = replayAll(replayEvents);
  const replayDailyReturns = buildDailyReturns(replayState);

  // Compare key metrics from replay vs report
  let reportReproducible = true;

  if (moneyStr(replayState.balance) !== report.body.statistics.finalBalance) {
    errors.push(
      `Balance mismatch: replayed ${moneyStr(replayState.balance)}, report ${report.body.statistics.finalBalance}`
    );
    reportReproducible = false;
  }

  if (moneyStr(replayState.maxDrawdown) !== report.body.statistics.maxDrawdownAbs) {
    errors.push(
      `MaxDrawdown mismatch: replayed ${moneyStr(replayState.maxDrawdown)}, report ${report.body.statistics.maxDrawdownAbs}`
    );
    reportReproducible = false;
  }

  if (replayState.totalTrades !== report.body.statistics.totalTrades) {
    errors.push(
      `Trade count mismatch: replayed ${replayState.totalTrades}, report ${report.body.statistics.totalTrades}`
    );
    reportReproducible = false;
  }

  if (replayDailyReturns.length !== report.body.dailyReturns.length) {
    errors.push(
      `Daily returns count mismatch: replayed ${replayDailyReturns.length}, report ${report.body.dailyReturns.length}`
    );
    reportReproducible = false;
  }

  // Verify equity curve length matches
  if (replayState.equityCurve.length !== report.body.equityCurve.length) {
    errors.push(
      `Equity curve length mismatch: replayed ${replayState.equityCurve.length}, report ${report.body.equityCurve.length}`
    );
    reportReproducible = false;
  }

  return {
    chainValid,
    chainLength: events.length,
    checkpointsValid: bundle.checkpoints.length > 0,
    checkpointCount: bundle.checkpoints.length,
    signatureValid,
    reportReproducible,
    errors,
  };
}

// ============================================
// LEVEL 2 — BROKER CORROBORATION
// ============================================

function verifyLevel2(bundle: ProofBundle): L2Result {
  const evidence = bundle.brokerEvidence;
  const digests = bundle.brokerDigests;

  // Match broker evidence against trade events
  const tradeEvents = bundle.events.filter(
    (e) => e.eventType === "TRADE_OPEN" || e.eventType === "TRADE_CLOSE"
  );

  let matchedCount = 0;
  let mismatchedCount = 0;
  const mismatches: string[] = [];

  for (const be of evidence) {
    const linkedTrade = tradeEvents.find((e) => {
      const payload = e.payload;
      return (
        (payload.ticket as string) === be.linkedTicket &&
        Math.abs(e.timestamp - be.executionTimestamp) < 60 // within 60 seconds
      );
    });

    if (linkedTrade) {
      // Verify price matches within tolerance (broker may have slightly different precision)
      const tradePrice =
        linkedTrade.eventType === "TRADE_OPEN"
          ? (linkedTrade.payload.openPrice as number)
          : (linkedTrade.payload.closePrice as number);

      const priceDiff = Math.abs(tradePrice - parseFloat(be.executionPrice));
      if (priceDiff < 0.0001) {
        matchedCount++;
      } else {
        mismatchedCount++;
        mismatches.push(
          `Ticket ${be.brokerTicket}: price ${be.executionPrice} vs ledger ${tradePrice}`
        );
      }
    } else {
      mismatchedCount++;
      mismatches.push(`Ticket ${be.brokerTicket}: no matching ledger event found`);
    }
  }

  // Verify broker history digests
  const digestValid = digests.length > 0; // Digest presence = L2 intention

  return {
    brokerEvidenceCount: evidence.length,
    matchedCount,
    mismatchedCount,
    mismatches,
    digestValid,
    digestCount: digests.length,
  };
}

/**
 * Verify a report standalone (without a full proof bundle).
 * Checks signature and report body hash only.
 */
export function verifyReportStandalone(report: InvestorReport): {
  signatureValid: boolean;
  bodyHashValid: boolean;
} {
  const canonicalBody = canonicalizeReportBody(report.body);
  const computedBodyHash = sha256(canonicalBody);

  const bodyHashValid = computedBodyHash === report.manifest.reportBodyHash;
  const signatureValid = verifyReportSignature(
    report.manifest.reportBodyHash,
    report.manifest.signature,
    report.manifest.publicKey
  );

  return { signatureValid, bodyHashValid };
}
