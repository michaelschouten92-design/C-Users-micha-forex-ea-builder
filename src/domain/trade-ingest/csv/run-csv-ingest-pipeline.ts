/**
 * Shared CSV ingest pipeline — used by both import-csv and webhook-ingest routes.
 *
 * Steps:
 *   1. Parse CSV → ParsedDeal[]
 *   2. Validate + ingest deals → TradeFact rows (skipDuplicates)
 *   3. Build deterministic trade snapshot
 *   4. Append proof event (fail-closed)
 *   5. Return result with recordId
 */

import { parseCsvDeals, CsvParseError } from "./parse-csv-deals";
import {
  ingestTradeFactsFromDeals,
  buildTradeSnapshot,
  TradeFactValidationError,
} from "@/domain/trade-ingest";
import { prisma } from "@/lib/prisma";
import { appendProofEvent } from "@/lib/proof/events";
import { logger } from "@/lib/logger";

const log = logger.child({ service: "csv-ingest-pipeline" });

// Re-export error types so callers can import from one place
export { CsvParseError } from "./parse-csv-deals";
export { TradeFactValidationError } from "@/domain/trade-ingest";

export interface CsvIngestParams {
  strategyId: string;
  source: "BACKTEST" | "LIVE";
  csv: string;
  backtestRunId?: string;
  symbolFallback?: string;
  initialBalance: number;
  proofPayloadExtras?: Record<string, unknown>;
}

export interface CsvIngestResult {
  insertedCount: number;
  skippedCount: number;
  tradeFactCount: number;
  tradeSnapshotHash: string;
  recordId: string;
}

export async function runCsvIngestPipeline(params: CsvIngestParams): Promise<CsvIngestResult> {
  const {
    strategyId,
    source,
    csv,
    backtestRunId,
    symbolFallback,
    initialBalance,
    proofPayloadExtras,
  } = params;

  // Step 1: Parse CSV → ParsedDeal[]
  const deals = parseCsvDeals(csv);

  // Step 2: Validate + ingest (fail-closed)
  const ingestResult = await ingestTradeFactsFromDeals({
    strategyId,
    source,
    sourceRunId: backtestRunId ?? `csv-import-${Date.now()}`,
    deals,
    symbolFallback: symbolFallback ?? "",
  });

  // Step 3: Build snapshot from all facts for this strategy
  const facts = await prisma.tradeFact.findMany({
    where: { strategyId },
    orderBy: [{ executedAt: "asc" }, { id: "asc" }],
  });

  if (facts.length === 0) {
    throw new Error("No trade facts found after ingest");
  }

  const snapshot = buildTradeSnapshot(facts, initialBalance);

  // Step 4: Write proof ledger event (fail-closed)
  const recordId = crypto.randomUUID();
  try {
    await appendProofEvent(strategyId, "TRADE_FACTS_INGESTED", {
      recordId,
      strategyId,
      source,
      backtestRunId: backtestRunId ?? null,
      insertedCount: ingestResult.inserted,
      skippedCount: ingestResult.skippedDuplicates,
      tradeFactCount: snapshot.factCount,
      tradeSnapshotHash: snapshot.snapshotHash,
      timestamp: new Date().toISOString(),
      ...proofPayloadExtras,
    });
  } catch (err) {
    log.error({ err, strategyId, recordId }, "Failed to persist proof event for trade ingest");
    throw err;
  }

  return {
    insertedCount: ingestResult.inserted,
    skippedCount: ingestResult.skippedDuplicates,
    tradeFactCount: snapshot.factCount,
    tradeSnapshotHash: snapshot.snapshotHash,
    recordId,
  };
}
