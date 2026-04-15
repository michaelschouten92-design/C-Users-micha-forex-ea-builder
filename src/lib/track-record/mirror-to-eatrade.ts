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
    select: { id: true },
  });
  if (existing) {
    await prisma.eATrade.update({
      where: { instanceId_ticket: { instanceId, ticket } },
      data: {
        closePrice: p.closePrice ?? null,
        profit: p.profit ?? 0,
        closeTime: at,
      },
    });
    return;
  }

  // No matching TRADE_OPEN (e.g. trade opened before monitor was attached) —
  // create a minimal row so edge-score still counts this trade. Per-trade
  // duration/entry fidelity is lost; aggregate profit/win-loss is correct.
  await prisma.eATrade.create({
    data: {
      instanceId,
      ticket,
      symbol: "UNKNOWN",
      type: "BUY",
      openPrice: p.closePrice ?? 0,
      lots: 0,
      profit: p.profit ?? 0,
      openTime: at,
      closeTime: at,
      magicNumber: p.magicNumber ?? null,
    },
  });
}
