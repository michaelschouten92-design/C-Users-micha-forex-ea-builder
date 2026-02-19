import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateTelemetry } from "@/lib/telemetry-auth";
import { z } from "zod";

const heartbeatSchema = z.object({
  symbol: z.string().max(32).optional(),
  timeframe: z.string().max(8).optional(),
  broker: z.string().max(128).optional(),
  accountNumber: z.union([z.string(), z.number()]).transform(String).optional(),
  balance: z.number().finite().min(0).max(1e12).default(0),
  equity: z.number().finite().min(0).max(1e12).default(0),
  openTrades: z.number().int().min(0).max(10000).default(0),
  totalTrades: z.number().int().min(0).max(1e8).default(0),
  totalProfit: z.number().finite().default(0),
  drawdown: z.number().finite().min(0).max(100).default(0),
  spread: z.number().finite().min(0).max(10000).default(0),
});

export async function POST(request: NextRequest) {
  const auth = await authenticateTelemetry(request);
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();
    const parsed = heartbeatSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid heartbeat data" }, { status: 400 });
    }

    const data = parsed.data;

    // Atomically update instance + insert heartbeat record
    await prisma.$transaction([
      prisma.liveEAInstance.update({
        where: { id: auth.instanceId },
        data: {
          status: "ONLINE",
          lastHeartbeat: new Date(),
          symbol: data.symbol ?? undefined,
          timeframe: data.timeframe ?? undefined,
          broker: data.broker ?? undefined,
          accountNumber: data.accountNumber ?? undefined,
          balance: data.balance,
          equity: data.equity,
          openTrades: data.openTrades,
          totalTrades: data.totalTrades,
          totalProfit: data.totalProfit,
        },
      }),
      prisma.eAHeartbeat.create({
        data: {
          instanceId: auth.instanceId,
          balance: data.balance,
          equity: data.equity,
          openTrades: data.openTrades,
          totalTrades: data.totalTrades,
          totalProfit: data.totalProfit,
          drawdown: data.drawdown,
          spread: data.spread,
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
