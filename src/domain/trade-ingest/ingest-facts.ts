import { prisma } from "@/lib/prisma";
import type { ParsedDeal } from "@/lib/backtest-parser/types";
import { validateAndNormalizeDeal } from "./validate-deal";

export interface IngestResult {
  inserted: number;
  skippedDuplicates: number;
}

/**
 * Ingest ParsedDeals as TradeFacts — append-only, idempotent.
 *
 * 1. Filters out balance-type deals (not trade facts)
 * 2. Validates all remaining deals — any failure aborts the entire batch (fail-closed)
 * 3. Uses createMany with skipDuplicates for idempotent replay
 */
export async function ingestTradeFactsFromDeals(params: {
  strategyId: string;
  source: "BACKTEST" | "LIVE";
  sourceRunId: string;
  deals: ParsedDeal[];
  symbolFallback: string;
}): Promise<IngestResult> {
  const { strategyId, source, sourceRunId, deals, symbolFallback } = params;

  // Step 1: Filter balance deals
  const tradingDeals = deals.filter((d) => d.type !== "balance");

  if (tradingDeals.length === 0) {
    return { inserted: 0, skippedDuplicates: 0 };
  }

  // Step 2: Validate ALL deals first — fail-closed, no partial ingest
  const candidates = tradingDeals.map((deal) => validateAndNormalizeDeal(deal, symbolFallback));

  // Step 3: Batch insert with skipDuplicates
  const result = await prisma.tradeFact.createMany({
    data: candidates.map((c) => ({
      strategyId,
      source,
      sourceRunId,
      sourceTicket: c.sourceTicket,
      symbol: c.symbol,
      direction: c.direction,
      volume: c.volume,
      openPrice: c.openPrice,
      closePrice: c.closePrice,
      sl: c.sl,
      tp: c.tp,
      profit: c.profit,
      executedAt: c.executedAt,
      comment: c.comment,
    })),
    skipDuplicates: true,
  });

  return {
    inserted: result.count,
    skippedDuplicates: candidates.length - result.count,
  };
}
