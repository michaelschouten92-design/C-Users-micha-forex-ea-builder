/**
 * Per-event-type payload validation schemas.
 *
 * Ensures each event type has the required fields with correct types.
 * Rejects events with missing or invalid payload fields at ingestion time.
 */

import { z } from "zod";

const tradeOpenPayload = z.object({
  ticket: z.string().min(1),
  symbol: z.string().min(1),
  direction: z.enum(["BUY", "SELL"]),
  lots: z.number().positive(),
  openPrice: z.number().nonnegative(),
  sl: z.number().nonnegative(),
  tp: z.number().nonnegative(),
});

const tradeClosePayload = z.object({
  ticket: z.string().min(1),
  closePrice: z.number().nonnegative(),
  profit: z.number(),
  swap: z.number(),
  commission: z.number(),
  closeReason: z.string().min(1),
});

const tradeModifyPayload = z.object({
  ticket: z.string().min(1),
  newSL: z.number().nonnegative(),
  newTP: z.number().nonnegative(),
  oldSL: z.number().nonnegative(),
  oldTP: z.number().nonnegative(),
});

const partialClosePayload = z.object({
  ticket: z.string().min(1),
  closedLots: z.number().positive(),
  remainingLots: z.number().nonnegative(),
  profit: z.number(),
  closePrice: z.number().nonnegative(),
});

const snapshotPayload = z.object({
  balance: z.number(),
  equity: z.number(),
  openTrades: z.number().int().nonnegative(),
  unrealizedPnL: z.number(),
  drawdown: z.number().nonnegative(),
});

const sessionStartPayload = z.object({
  broker: z.string(),
  account: z.string(),
  symbol: z.string(),
  timeframe: z.string(),
  eaVersion: z.string(),
  mode: z.enum(["LIVE", "PAPER"]),
  balance: z.number().optional(),
  recoveryMode: z.boolean().optional(),
});

const sessionEndPayload = z.object({
  reason: z.string().min(1),
  finalBalance: z.number(),
  finalEquity: z.number(),
  uptimeSeconds: z.number().int().nonnegative(),
});

const chainRecoveryPayload = z.object({
  previousSeqNo: z.number().int().nonnegative(),
  previousHash: z.string().length(64),
  recoveredFromSeqNo: z.number().int().nonnegative(),
  recoveredFromHash: z.string().length(64),
  reason: z.string().min(1),
});

const cashflowPayload = z.object({
  type: z.enum(["DEPOSIT", "WITHDRAWAL"]),
  amount: z.number().positive(),
  balanceBefore: z.number(),
  balanceAfter: z.number(),
  note: z.string(),
});

const brokerEvidencePayload = z.object({
  brokerTicket: z.string().min(1),
  executionTimestamp: z.number().int().positive(),
  symbol: z.string().min(1),
  volume: z.number().positive(),
  executionPrice: z.number().nonnegative(),
  action: z.enum(["OPEN", "CLOSE"]),
  linkedTicket: z.string().min(1),
});

const brokerHistoryDigestPayload = z.object({
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
  tradeCount: z.number().int().nonnegative(),
  historyHash: z.string().length(64),
  firstTicket: z.string().min(1),
  lastTicket: z.string().min(1),
  exportFormat: z.string().min(1),
});

const payloadSchemas: Record<string, z.ZodType> = {
  TRADE_OPEN: tradeOpenPayload,
  TRADE_CLOSE: tradeClosePayload,
  TRADE_MODIFY: tradeModifyPayload,
  PARTIAL_CLOSE: partialClosePayload,
  SNAPSHOT: snapshotPayload,
  SESSION_START: sessionStartPayload,
  SESSION_END: sessionEndPayload,
  CHAIN_RECOVERY: chainRecoveryPayload,
  CASHFLOW: cashflowPayload,
  BROKER_EVIDENCE: brokerEvidencePayload,
  BROKER_HISTORY_DIGEST: brokerHistoryDigestPayload,
};

/**
 * Validate a payload against the schema for the given event type.
 * Returns null on success, or an error message string on failure.
 */
export function validatePayload(
  eventType: string,
  payload: Record<string, unknown>
): string | null {
  const schema = payloadSchemas[eventType];
  if (!schema) {
    return `Unknown event type: ${eventType}`;
  }

  const result = schema.safeParse(payload);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    return `Invalid ${eventType} payload: ${issues.join(", ")}`;
  }

  return null;
}
