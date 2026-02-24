import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdmin } from "@/lib/admin";

type Props = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: Props) {
  const adminCheck = await checkAdmin();
  if (!adminCheck.authorized) return adminCheck.response;

  const { id } = await params;

  const instance = await prisma.liveEAInstance.findUnique({
    where: { id },
    include: {
      user: { select: { email: true } },
      exportJob: { select: { createdAt: true, exportType: true, projectId: true } },
      heartbeats: {
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          balance: true,
          equity: true,
          openTrades: true,
          totalTrades: true,
          totalProfit: true,
          drawdown: true,
          spread: true,
          createdAt: true,
        },
      },
      trades: {
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          ticket: true,
          symbol: true,
          type: true,
          openPrice: true,
          closePrice: true,
          lots: true,
          profit: true,
          openTime: true,
          closeTime: true,
          createdAt: true,
        },
      },
      errors: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          errorCode: true,
          message: true,
          context: true,
          createdAt: true,
        },
      },
    },
  });

  if (!instance) {
    return NextResponse.json({ error: "Instance not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: instance.id,
    eaName: instance.eaName,
    status: instance.status,
    symbol: instance.symbol,
    timeframe: instance.timeframe,
    broker: instance.broker,
    accountNumber: instance.accountNumber,
    balance: instance.balance,
    equity: instance.equity,
    openTrades: instance.openTrades,
    totalTrades: instance.totalTrades,
    totalProfit: instance.totalProfit,
    lastHeartbeat: instance.lastHeartbeat,
    lastError: instance.lastError,
    createdAt: instance.createdAt,
    userEmail: instance.user.email,
    exportType: instance.exportJob?.exportType ?? null,
    exportDate: instance.exportJob?.createdAt ?? null,
    projectId: instance.exportJob?.projectId ?? null,
    heartbeats: instance.heartbeats,
    trades: instance.trades,
    errors: instance.errors,
  });
}
