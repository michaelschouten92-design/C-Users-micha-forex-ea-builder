import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateTelemetry } from "@/lib/telemetry-auth";
import { z } from "zod";

const tradeSchema = z.object({
  ticket: z.union([z.string(), z.number()]).transform(String),
  symbol: z.string().max(32),
  type: z.string().max(16),
  openPrice: z.number().finite(),
  closePrice: z.number().finite().nullable().optional(),
  lots: z.number().finite().min(0),
  profit: z.number().finite().default(0),
  openTime: z.string().or(z.number()),
  closeTime: z.string().or(z.number()).nullable().optional(),
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
      },
      update: {
        closePrice: closePrice != null ? closePrice : undefined,
        profit,
        closeTime: closeTime ? new Date(closeTime) : undefined,
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
