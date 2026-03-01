import type { TradeFact } from "@prisma/client";
import { runWalkForward } from "@/lib/backtest-parser/walk-forward";
import type { ParsedDeal } from "@/lib/backtest-parser/types";

export interface DerivedIntermediateResults {
  monteCarlo: { tradePnls: number[]; initialBalance: number };
  walkForward: { sharpeDegradationPct: number; outOfSampleTradeCount: number };
}

/**
 * Reconstruct a ParsedDeal from a TradeFact for walk-forward analysis.
 */
function tradeFactToParsedDeal(fact: TradeFact): ParsedDeal {
  return {
    ticket: fact.sourceTicket,
    openTime: fact.executedAt.toISOString(),
    type: fact.direction.toLowerCase(), // "BUY" → "buy", "SELL" → "sell"
    volume: fact.volume,
    price: fact.openPrice,
    sl: fact.sl ?? undefined,
    tp: fact.tp ?? undefined,
    profit: fact.profit,
    symbol: fact.symbol,
    comment: fact.comment ?? undefined,
  };
}

/**
 * Derive MC + WF intermediate results from TradeFacts — server-side only.
 *
 * tradePnls: sorted by executedAt ASC, id ASC — same as buildTradeSnapshot.
 * WF: calls runWalkForward() with reconstructed ParsedDeals.
 *   - sharpeDegradationPct = average of windows[].degradation.sharpeRatio
 *   - outOfSampleTradeCount = minimum of windows[].outOfSample.totalTrades
 *     (conservative — ensures even smallest OOS window has enough trades)
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

  // Reconstruct ParsedDeals for walk-forward
  const reconstructedDeals = sorted.map(tradeFactToParsedDeal);

  const wfResult = runWalkForward(reconstructedDeals, initialBalance);

  let sharpeDegradationPct = 0;
  let outOfSampleTradeCount = 0;

  if (wfResult.windows.length > 0) {
    // Average Sharpe degradation across all windows
    sharpeDegradationPct =
      wfResult.windows.reduce((sum, w) => sum + w.degradation.sharpeRatio, 0) /
      wfResult.windows.length;

    // Minimum OOS trade count across windows (conservative)
    outOfSampleTradeCount = Math.min(...wfResult.windows.map((w) => w.outOfSample.totalTrades));
  }

  return {
    monteCarlo: { tradePnls, initialBalance },
    walkForward: { sharpeDegradationPct, outOfSampleTradeCount },
  };
}
