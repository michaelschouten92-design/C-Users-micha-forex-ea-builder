import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateTelemetry } from "@/lib/telemetry-auth";
import { fireWebhook } from "@/lib/webhook";
import { checkNewTradeAlerts } from "@/lib/alerts";
import { z } from "zod";

const tradeSchema = z.object({
  ticket: z.union([z.string(), z.number()]).transform(String),
  symbol: z.string().max(32),
  type: z.string().max(16),
  openPrice: z.number().finite().min(0).max(1e8),
  closePrice: z.number().finite().min(0).max(1e8).nullable().optional(),
  lots: z.number().finite().min(0.01).max(1000),
  profit: z.number().finite().min(-1e8).max(1e8).default(0),
  openTime: z.string().or(z.number()),
  closeTime: z.string().or(z.number()).nullable().optional(),
  mode: z.string().max(16).optional(),
});

export async function POST(request: NextRequest) {
  const auth = await authenticateTelemetry(request);
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();
    const parsed = tradeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid trade data" }, { status: 400 });
    }

    const { ticket, symbol, type, openPrice, closePrice, lots, profit, openTime, closeTime } =
      parsed.data;

    // Security: auth.instanceId is derived from the API key (one key = one instance).
    // The request body has no instanceId field, preventing a leaked key from affecting other instances.
    // Upsert trade based on unique [instanceId, ticket]
    await prisma.eATrade.upsert({
      where: {
        instanceId_ticket: {
          instanceId: auth.instanceId,
          ticket,
        },
      },
      create: {
        instanceId: auth.instanceId,
        ticket,
        symbol,
        type,
        openPrice,
        closePrice: closePrice ?? null,
        lots,
        profit,
        openTime: new Date(openTime),
        closeTime: closeTime ? new Date(closeTime) : null,
        mode: parsed.data.mode ?? null,
      },
      update: {
        closePrice: closePrice != null ? closePrice : undefined,
        profit,
        closeTime: closeTime ? new Date(closeTime) : undefined,
        mode: parsed.data.mode ?? undefined,
      },
    });

    // Fire webhook notification (fire-and-forget)
    fireTradeWebhook(auth.instanceId, { symbol, type, profit, openPrice, closePrice }).catch(
      () => {}
    );

    // Check user-configured new trade alerts (fire-and-forget)
    fireNewTradeAlerts(auth.instanceId, auth.userId, { symbol, type, profit }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

async function fireTradeWebhook(
  instanceId: string,
  trade: {
    symbol: string;
    type: string;
    profit: number;
    openPrice: number;
    closePrice: number | null | undefined;
  }
): Promise<void> {
  const instance = await prisma.liveEAInstance.findUnique({
    where: { id: instanceId },
    select: { eaName: true, user: { select: { webhookUrl: true } } },
  });

  if (!instance?.user.webhookUrl) return;

  await fireWebhook(instance.user.webhookUrl, {
    event: "trade",
    data: {
      eaName: instance.eaName,
      symbol: trade.symbol,
      type: trade.type,
      profit: trade.profit,
      openPrice: trade.openPrice,
      closePrice: trade.closePrice ?? null,
    },
  });
}

async function fireNewTradeAlerts(
  instanceId: string,
  userId: string,
  trade: { symbol: string; type: string; profit: number }
): Promise<void> {
  const instance = await prisma.liveEAInstance.findUnique({
    where: { id: instanceId },
    select: { eaName: true },
  });

  if (!instance) return;

  await checkNewTradeAlerts(
    userId,
    instanceId,
    instance.eaName,
    trade.symbol,
    trade.type,
    trade.profit
  );
}
