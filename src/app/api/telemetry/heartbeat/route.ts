import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateTelemetry } from "@/lib/telemetry-auth";

export async function POST(request: NextRequest) {
  const auth = await authenticateTelemetry(request);
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();
    const {
      symbol,
      timeframe,
      broker,
      accountNumber,
      balance,
      equity,
      openTrades,
      totalTrades,
      totalProfit,
      drawdown,
      spread,
    } = body;

    // Update instance status and data
    await prisma.liveEAInstance.update({
      where: { id: auth.instanceId },
      data: {
        status: "ONLINE",
        lastHeartbeat: new Date(),
        symbol: symbol ?? undefined,
        timeframe: timeframe ?? undefined,
        broker: broker ?? undefined,
        accountNumber: accountNumber != null ? String(accountNumber) : undefined,
        balance: balance != null ? Number(balance) : undefined,
        equity: equity != null ? Number(equity) : undefined,
        openTrades: openTrades != null ? Number(openTrades) : undefined,
        totalTrades: totalTrades != null ? Number(totalTrades) : undefined,
        totalProfit: totalProfit != null ? Number(totalProfit) : undefined,
      },
    });

    // Insert heartbeat record
    await prisma.eAHeartbeat.create({
      data: {
        instanceId: auth.instanceId,
        balance: Number(balance) || 0,
        equity: Number(equity) || 0,
        openTrades: Number(openTrades) || 0,
        totalTrades: Number(totalTrades) || 0,
        totalProfit: Number(totalProfit) || 0,
        drawdown: Number(drawdown) || 0,
        spread: Number(spread) || 0,
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
