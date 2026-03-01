import { createHash } from "node:crypto";

export interface TradeSnapshot {
  snapshotHash: string;
  tradePnls: number[];
  initialBalance: number;
  factCount: number;
  range: { earliest: string; latest: string };
  dataSources: string[];
}

interface SnapshotFact {
  id: string;
  profit: number;
  executedAt: Date;
  source: string;
}

/**
 * Deterministic JSON — keys sorted alphabetically, compact.
 * Matches the pattern from config-snapshot.ts.
 */
function canonicalJSON(obj: Record<string, unknown>): string {
  return JSON.stringify(obj, Object.keys(obj).sort());
}

/**
 * Build a deterministic trade snapshot from TradeFacts.
 * Same facts + same initialBalance → identical snapshotHash, always.
 *
 * Sort order: executedAt ASC, then id ASC (cuid is lexicographically sortable).
 * tradePnls: profit extracted from each sorted fact — no rounding.
 */
export function buildTradeSnapshot(facts: SnapshotFact[], initialBalance: number): TradeSnapshot {
  if (facts.length === 0) {
    throw new Error("Cannot build snapshot from empty facts array");
  }

  // Sort deterministically: executedAt ASC, then id ASC
  const sorted = [...facts].sort((a, b) => {
    const timeDiff = a.executedAt.getTime() - b.executedAt.getTime();
    if (timeDiff !== 0) return timeDiff;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  const tradePnls = sorted.map((f) => f.profit);

  // Compute hash preimage
  const preimage: Record<string, unknown> = {
    factCount: sorted.length,
    initialBalance,
    tradePnls,
  };

  const snapshotHash = createHash("sha256").update(canonicalJSON(preimage), "utf8").digest("hex");

  // Date range
  const earliest = sorted[0].executedAt.toISOString();
  const latest = sorted[sorted.length - 1].executedAt.toISOString();

  // Unique data sources
  const dataSources = [...new Set(sorted.map((f) => f.source))].sort();

  return {
    snapshotHash,
    tradePnls,
    initialBalance,
    factCount: sorted.length,
    range: { earliest, latest },
    dataSources,
  };
}
