/**
 * Mirror TRADE_OPEN/TRADE_CLOSE events from TrackRecordEvent into EATrade.
 *
 * Why: the Monitor EA posts events into the track-record proof layer, but
 * edge-score + dashboard aggregates read from EATrade. Without this mirror,
 * externally-monitored EAs never populate EATrade and edge counters stay at 0.
 *
 * Runs fire-and-forget outside the ingest tx — TrackRecordEvent is the source
 * of truth, this is a denormalized read model. Backfill script reconciles
 * historical data that was ingested before this mirror was added.
 */
import type { PrismaClient } from "@prisma/client";

type TradeOpenPayload = {
  symbol?: string;
  direction?: "BUY" | "SELL";
  lots?: number;
  openPrice?: number;
  magicNumber?: number;
  ticket?: string | number;
};

type TradeClosePayload = {
  closePrice?: number;
  profit?: number;
  magicNumber?: number;
  ticket?: string | number;
};

export async function mirrorTradeEventToEATrade(
  prisma: Pick<PrismaClient, "eATrade">,
  args: {
    instanceId: string;
    eventType: "TRADE_OPEN" | "TRADE_CLOSE";
    payload: Record<string, unknown>;
    /** Event timestamp in seconds since epoch. */
    timestamp: number;
  }
): Promise<void> {
  const { instanceId, eventType, payload, timestamp } = args;
  const at = new Date(timestamp * 1000);

  if (eventType === "TRADE_OPEN") {
    const p = payload as TradeOpenPayload;
    const ticket = p.ticket != null ? String(p.ticket).trim() : "";
    if (!ticket || !p.symbol) return; // no usable row to write
    await prisma.eATrade.upsert({
      where: { instanceId_ticket: { instanceId, ticket } },
      create: {
        instanceId,
        ticket,
        symbol: p.symbol.toUpperCase(),
        type: p.direction ?? "BUY",
        openPrice: p.openPrice ?? 0,
        lots: p.lots ?? 0,
        profit: 0,
        openTime: at,
        magicNumber: p.magicNumber ?? null,
      },
      // Replay of the same TRADE_OPEN is a no-op — first write wins so any
      // TRADE_CLOSE that already landed (race on chain recovery) is preserved.
      update: {},
    });
    return;
  }

  // TRADE_CLOSE
  const p = payload as TradeClosePayload;
  const ticket = p.ticket != null ? String(p.ticket).trim() : "";
  if (!ticket) return;

  const existing = await prisma.eATrade.findUnique({
    where: { instanceId_ticket: { instanceId, ticket } },
    select: { id: true, openPrice: true },
  });
  if (existing) {
    // DB invariant (EATrade_closed_requires_price): a closed row must have
    // a closePrice. If the EA didn't send one, fall back to openPrice — the
    // P&L from the payload is authoritative anyway, so price-diff display
    // is the only consumer that cares and it's better than rejecting the
    // close (which would lose the P&L mirror entirely).
    await prisma.eATrade.update({
      where: { instanceId_ticket: { instanceId, ticket } },
      data: {
        closePrice: p.closePrice ?? existing.openPrice,
        profit: p.profit ?? 0,
        closeTime: at,
      },
    });
    return;
  }

  // Orphaned TRADE_CLOSE: no matching TRADE_OPEN (Monitor attached mid-trade,
  // so we don't know the symbol). Write a placeholder row marked with the
  // sentinel symbol "__ORPHAN__" so edge-score and P&L aggregates include
  // the closed P&L. UI surfaces that filter on real symbols must exclude
  // this sentinel (see isOrphanEATrade). The proof chain still has the
  // authoritative record in TrackRecordEvent.
  await prisma.eATrade.create({
    data: {
      instanceId,
      ticket,
      symbol: ORPHAN_EATRADE_SYMBOL,
      type: "BUY",
      openPrice: 0,
      closePrice: p.closePrice ?? null,
      lots: 0,
      profit: p.profit ?? 0,
      openTime: at,
      closeTime: at,
      magicNumber: p.magicNumber ?? null,
    },
  });
}

/**
 * Sentinel symbol used for orphaned TRADE_CLOSE rows. Aggregates include
 * these, card-per-strategy UI filters must exclude them.
 */
export const ORPHAN_EATRADE_SYMBOL = "__ORPHAN__";

/** True when an EATrade row is a mirror-created orphan (no matching open). */
export function isOrphanEATrade(row: { symbol: string }): boolean {
  return row.symbol === ORPHAN_EATRADE_SYMBOL;
}
