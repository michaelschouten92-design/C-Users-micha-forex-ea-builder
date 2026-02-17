import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateTelemetry } from "@/lib/telemetry-auth";

export async function POST(request: NextRequest) {
  const auth = await authenticateTelemetry(request);
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();
    const { ticket, symbol, type, openPrice, closePrice, lots, profit, openTime, closeTime } = body;

    if (!ticket || !symbol || !type || openPrice == null || lots == null || !openTime) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Upsert trade based on unique [instanceId, ticket]
    await prisma.eATrade.upsert({
      where: {
        instanceId_ticket: {
          instanceId: auth.instanceId,
          ticket: String(ticket),
        },
      },
      create: {
        instanceId: auth.instanceId,
        ticket: String(ticket),
        symbol: String(symbol),
        type: String(type),
        openPrice: Number(openPrice),
        closePrice: closePrice != null ? Number(closePrice) : null,
        lots: Number(lots),
        profit: Number(profit) || 0,
        openTime: new Date(openTime),
        closeTime: closeTime ? new Date(closeTime) : null,
      },
      update: {
        closePrice: closePrice != null ? Number(closePrice) : undefined,
        profit: Number(profit) || 0,
        closeTime: closeTime ? new Date(closeTime) : undefined,
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
