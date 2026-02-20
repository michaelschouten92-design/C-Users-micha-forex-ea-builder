/**
 * Broker Corroboration — Level 2 Verification
 *
 * Provides tools for matching broker-reported trade history against
 * the track record ledger. This is the key differentiator vs Myfxbook:
 * we don't just read from the broker — we cryptographically bind
 * broker evidence to the append-only ledger.
 *
 * Three components:
 *
 * 1. BrokerEvidence events — individual trade confirmations from broker
 *    Submitted by the EA alongside regular trade events.
 *
 * 2. BrokerHistoryDigest — periodic hash of the broker's exported history
 *    Created by exporting the account history from MT4/MT5 and hashing it.
 *
 * 3. Verification procedure — how a third party reproduces the digest
 *
 * ═══════════════════════════════════════════════════
 * BROKER HISTORY EXPORT PROCEDURE
 * ═══════════════════════════════════════════════════
 *
 * For MT5:
 * 1. Open Terminal → Trade tab → right-click → "All History"
 * 2. Select date range matching the digest period
 * 3. Right-click → "Report" → Save as CSV (or HTML)
 * 4. The exported file is the canonical broker record
 *
 * For MT4:
 * 1. Open Terminal → Account History tab
 * 2. Right-click → "All History" or select custom range
 * 3. Right-click → "Save as Report (CSV)"
 *
 * Digest computation:
 * 1. Read file as UTF-8
 * 2. Normalize: trim whitespace, normalize line endings to \n
 * 3. SHA-256 hash the normalized content
 * 4. This is the historyHash in BrokerHistoryDigest
 *
 * Third-party reproduction:
 * 1. Request the user's broker export file
 * 2. Compute SHA-256 the same way
 * 3. Compare with the historyHash in the digest event
 * 4. If match → broker data has not been tampered with
 * ═══════════════════════════════════════════════════
 */

import { sha256 } from "./canonical";

/**
 * Compute a broker history digest from raw export content.
 * Normalizes the content before hashing for cross-platform consistency.
 */
export function computeBrokerHistoryHash(rawContent: string): string {
  // Normalize: trim, normalize line endings, collapse multiple spaces
  const normalized = rawContent.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  return sha256(normalized);
}

/**
 * Parse basic trade info from MT5 CSV export.
 * Returns ticket count and first/last tickets for the digest.
 */
export function parseMT5CsvSummary(csvContent: string): {
  tradeCount: number;
  firstTicket: string;
  lastTicket: string;
} {
  const lines = csvContent.split("\n").filter((l) => l.trim().length > 0);
  // MT5 CSV: first column is usually ticket/deal number
  const tickets: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    // Skip header
    const cols = lines[i].split("\t"); // MT5 uses tab-separated
    if (cols.length > 0) {
      const ticket = cols[0].trim();
      if (ticket && /^\d+$/.test(ticket)) {
        tickets.push(ticket);
      }
    }
  }

  return {
    tradeCount: tickets.length,
    firstTicket: tickets[0] ?? "",
    lastTicket: tickets[tickets.length - 1] ?? "",
  };
}

/**
 * Build a BrokerHistoryDigest payload from broker export content.
 */
export function buildBrokerDigestPayload(
  rawContent: string,
  periodStart: string,
  periodEnd: string,
  exportFormat: string
) {
  const hash = computeBrokerHistoryHash(rawContent);
  const summary = parseMT5CsvSummary(rawContent);

  return {
    periodStart,
    periodEnd,
    tradeCount: summary.tradeCount,
    historyHash: hash,
    firstTicket: summary.firstTicket,
    lastTicket: summary.lastTicket,
    exportFormat,
  };
}

/**
 * Match broker evidence against ledger events.
 * Returns match quality analysis.
 */
export function analyzeBrokerCorroboration(
  ledgerTrades: {
    ticket: string;
    timestamp: number;
    price: number;
    symbol: string;
    action: string;
  }[],
  brokerEvidence: {
    brokerTicket: string;
    executionTimestamp: number;
    executionPrice: number;
    symbol: string;
    linkedTicket: string;
    action: string;
  }[]
): {
  total: number;
  matched: number;
  priceMatched: number;
  timeMatched: number;
  unmatched: string[];
  matchRate: number;
} {
  let matched = 0;
  let priceMatched = 0;
  let timeMatched = 0;
  const unmatched: string[] = [];

  for (const be of brokerEvidence) {
    const ledgerTrade = ledgerTrades.find(
      (lt) => lt.ticket === be.linkedTicket && lt.action === be.action
    );

    if (!ledgerTrade) {
      unmatched.push(be.brokerTicket);
      continue;
    }

    matched++;

    // Price within 1 pip tolerance
    if (Math.abs(ledgerTrade.price - be.executionPrice) < 0.0001) {
      priceMatched++;
    }

    // Timestamp within 60 seconds
    if (Math.abs(ledgerTrade.timestamp - be.executionTimestamp) < 60) {
      timeMatched++;
    }
  }

  const total = brokerEvidence.length;
  return {
    total,
    matched,
    priceMatched,
    timeMatched,
    unmatched,
    matchRate: total > 0 ? (matched / total) * 100 : 0,
  };
}
