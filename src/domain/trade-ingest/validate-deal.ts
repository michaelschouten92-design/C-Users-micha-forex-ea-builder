import type { ParsedDeal } from "@/lib/backtest-parser/types";

export interface TradeFactCandidate {
  sourceTicket: number;
  symbol: string;
  direction: "BUY" | "SELL";
  volume: number;
  openPrice: number;
  closePrice: number | null;
  sl: number | null;
  tp: number | null;
  profit: number;
  executedAt: Date;
  comment: string | null;
}

export class TradeFactValidationError extends Error {
  constructor(
    message: string,
    public readonly ticket: number,
    public readonly violations: string[]
  ) {
    super(message);
    this.name = "TradeFactValidationError";
  }
}

const VALID_DIRECTIONS = new Set(["buy", "sell"]);

/**
 * Validate and normalize a ParsedDeal into a TradeFactCandidate.
 * Fails-closed: any violation throws TradeFactValidationError.
 */
export function validateAndNormalizeDeal(
  deal: ParsedDeal,
  symbolFallback: string
): TradeFactCandidate {
  const violations: string[] = [];

  // Direction: must be buy or sell (balance filtered upstream, validated here defense-in-depth)
  if (!VALID_DIRECTIONS.has(deal.type)) {
    violations.push(`invalid type "${deal.type}" — must be "buy" or "sell"`);
  }

  // Ticket: positive integer
  if (!Number.isInteger(deal.ticket) || deal.ticket <= 0) {
    violations.push(`invalid ticket ${deal.ticket} — must be a positive integer`);
  }

  // Volume: positive and finite
  if (!Number.isFinite(deal.volume) || deal.volume <= 0) {
    violations.push(`invalid volume ${deal.volume} — must be > 0 and finite`);
  }

  // Price: non-negative and finite
  if (!Number.isFinite(deal.price) || deal.price < 0) {
    violations.push(`invalid price ${deal.price} — must be >= 0 and finite`);
  }

  // Profit: finite (can be negative)
  if (!Number.isFinite(deal.profit)) {
    violations.push(`invalid profit ${deal.profit} — must be finite`);
  }

  // OpenTime: must parse to valid Date
  const executedAt = new Date(deal.openTime);
  if (isNaN(executedAt.getTime())) {
    violations.push(`invalid openTime "${deal.openTime}" — must parse to valid Date`);
  }

  // Symbol: deal.symbol or fallback must be non-empty
  const symbol = deal.symbol || symbolFallback;
  if (!symbol) {
    violations.push("missing symbol — deal.symbol and symbolFallback are both empty");
  }

  if (violations.length > 0) {
    throw new TradeFactValidationError(
      `TradeFact validation failed for ticket ${deal.ticket}: ${violations.join("; ")}`,
      deal.ticket,
      violations
    );
  }

  return {
    sourceTicket: deal.ticket,
    symbol,
    direction: deal.type.toUpperCase() as "BUY" | "SELL",
    volume: deal.volume,
    openPrice: deal.price,
    closePrice: null, // Backtest deals are closed — but ParsedDeal doesn't have closePrice
    sl: deal.sl ?? null,
    tp: deal.tp ?? null,
    profit: deal.profit,
    executedAt,
    comment: deal.comment ?? null,
  };
}
