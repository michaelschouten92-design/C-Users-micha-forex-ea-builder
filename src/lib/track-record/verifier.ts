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
  L3Result,
  VerificationLevel,
} from "./types";
import { GENESIS_HASH } from "./types";
import { buildCanonicalEvent, computeEventHash, sha256 } from "./canonical";
import {
  canonicalizeReportBody,
  verifyReportSignature,
  computeLedgerRootHash,
  getTrustedPublicKeys,
  keyFingerprint,
} from "./manifest";
import { verifyCommitment } from "./ledger-commitment";
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

  const l3 =
    bundle.commitments && bundle.commitments.length > 0
      ? verifyLevel3(bundle)
      : (bundle.verification.l3 ?? null);

  // Determine highest achieved level
  let level: VerificationLevel = "L0_NONE";
  if (l1.chainValid && l1.reportReproducible && l1.signatureValid) {
    level = "L1_LEDGER";
  }
  if (level === "L1_LEDGER" && l2 && l2.mismatchedCount === 0 && l2.matchedCount > 0) {
    level = "L2_BROKER";
  }
  // L3 requires at least L1 + notarized commitments
  const l3Eligible = level === "L2_BROKER" || (level === "L1_LEDGER" && !l2);
  if (l3Eligible && l3?.notarized) {
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

  // 2. Verify Ed25519 signature + signing key version
  const signatureValid = verifyReportSignature(
    report.manifest.reportBodyHash,
    report.manifest.signature,
    report.manifest.publicKey
  );
  if (!signatureValid) {
    errors.push("Ed25519 signature verification failed");
  }

  // 2b. Verify signingKeyVersion matches the public key fingerprint
  if (report.manifest.signingKeyVersion) {
    const computedVersion = keyFingerprint(report.manifest.publicKey);
    if (computedVersion !== report.manifest.signingKeyVersion) {
      errors.push(
        `signingKeyVersion mismatch: manifest claims ${report.manifest.signingKeyVersion}, ` +
          `but publicKey fingerprint is ${computedVersion}`
      );
    }

    // 2c. Check if the signing key is in our trusted key registry
    const trustedKeys = getTrustedPublicKeys();
    if (trustedKeys.length > 0) {
      const isTrusted = trustedKeys.some((k) => k.version === report.manifest.signingKeyVersion);
      if (!isTrusted) {
        errors.push(
          `Signing key version ${report.manifest.signingKeyVersion} is not in the trusted key registry. ` +
            `The report may have been signed with a revoked or unknown key.`
        );
      }
    }
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

  // 6. Verify checkpoints: replay state at each checkpoint's seqNo must match
  let checkpointsValid = bundle.checkpoints.length === 0; // vacuously true if none
  if (bundle.checkpoints.length > 0) {
    checkpointsValid = true;
    for (const cp of bundle.checkpoints) {
      const eventsUpToCheckpoint = replayEvents.filter((e) => e.seqNo <= cp.seqNo);
      if (eventsUpToCheckpoint.length === 0) {
        checkpointsValid = false;
        errors.push(`Checkpoint at seqNo ${cp.seqNo}: no events found up to this point`);
        continue;
      }
      const replayStateAtSeq = replayAll(eventsUpToCheckpoint);
      if (
        moneyStr(replayStateAtSeq.balance) !== cp.balance ||
        moneyStr(replayStateAtSeq.equity) !== cp.equity ||
        moneyStr(replayStateAtSeq.highWaterMark) !== cp.highWaterMark
      ) {
        checkpointsValid = false;
        errors.push(`Checkpoint at seqNo ${cp.seqNo}: state mismatch`);
      }
    }
  }

  // Build caveats for data provenance
  const caveats: string[] = [];

  // Mode field is self-reported by the EA and unverifiable at L1
  const sessionEvents = events.filter((e) => e.eventType === "SESSION_START");
  if (sessionEvents.length > 0) {
    const modes = sessionEvents.map((e) => (e.payload as Record<string, unknown>).mode);
    const hasLive = modes.includes("LIVE");
    if (hasLive) {
      caveats.push(
        "Trading mode (LIVE) is self-reported by the EA and cannot be independently verified at L1. " +
          "L2 broker evidence is required to confirm live trading."
      );
    }
  }

  return {
    chainValid,
    chainLength: events.length,
    checkpointsValid,
    checkpointCount: bundle.checkpoints.length,
    signatureValid,
    reportReproducible,
    errors,
    caveats,
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

  // Verify broker history digests: check they are present in the event chain
  let digestValid = digests.length > 0;
  for (const d of digests) {
    const digestEvent = bundle.events.find(
      (e) =>
        e.eventType === "BROKER_HISTORY_DIGEST" &&
        (e.payload as Record<string, unknown>).historyHash === d.historyHash
    );
    if (!digestEvent) {
      digestValid = false;
      mismatches.push(`Digest ${d.historyHash.slice(0, 16)}...: not found in event chain`);
    }
  }

  return {
    brokerEvidenceCount: evidence.length,
    matchedCount,
    mismatchedCount,
    mismatches,
    digestValid,
    digestCount: digests.length,
  };
}

// ============================================
// LEVEL 3 — NOTARIZED COMMITMENTS
// ============================================

function verifyLevel3(bundle: ProofBundle): L3Result {
  const commitments = bundle.commitments;
  if (!commitments || commitments.length === 0) {
    return {
      notarized: false,
      notarizationTimestamp: null,
      notarizationProof: null,
      provider: null,
    };
  }

  // Verify each commitment hash is correctly computed
  let allValid = true;
  let hasNotarized = false;
  let latestNotarization: string | null = null;
  let latestProof: string | null = null;
  let provider: string | null = null;

  for (const c of commitments) {
    // Find the event at this commitment's seqNo to get lastEventHash
    const event = bundle.events.find((e) => e.seqNo === c.seqNo);
    if (!event) {
      allValid = false;
      continue;
    }

    // Verify the commitment hash is correctly derived
    const valid = verifyCommitment(
      bundle.report.manifest.instanceId,
      c.seqNo,
      c.lastEventHash,
      c.stateHmac,
      c.commitmentHash
    );

    if (!valid) {
      allValid = false;
    }

    // Check that the lastEventHash matches the event at that seqNo
    if (c.lastEventHash !== event.eventHash) {
      allValid = false;
    }

    // Track notarization status
    if (c.notarizedAt) {
      hasNotarized = true;
      if (!latestNotarization || c.notarizedAt > latestNotarization) {
        latestNotarization = c.notarizedAt;
        latestProof = c.proof;
        provider = c.provider;
      }
    }
  }

  return {
    notarized: allValid && hasNotarized,
    notarizationTimestamp: latestNotarization,
    notarizationProof: latestProof,
    provider,
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
