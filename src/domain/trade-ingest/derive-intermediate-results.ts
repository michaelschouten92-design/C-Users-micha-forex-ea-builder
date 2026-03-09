import type { TradeFact } from "@prisma/client";

export interface DerivedIntermediateResults {
  monteCarlo: { tradePnls: number[]; initialBalance: number };
}

/**
 * Derive Monte Carlo intermediate results from TradeFacts — server-side only.
 *
 * tradePnls: sorted by executedAt ASC, id ASC — same as buildTradeSnapshot.
 */
export function deriveIntermediateResults(
  facts: TradeFact[],
  initialBalance: number
): DerivedIntermediateResults {
  // Sort deterministically — same order as buildTradeSnapshot
  const sorted = [...facts].sort((a, b) => {
    const timeDiff = a.executedAt.getTime() - b.executedAt.getTime();
    if (timeDiff !== 0) return timeDiff;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  const tradePnls = sorted.map((f) => f.profit);

  return {
    monteCarlo: { tradePnls, initialBalance },
  };
}
