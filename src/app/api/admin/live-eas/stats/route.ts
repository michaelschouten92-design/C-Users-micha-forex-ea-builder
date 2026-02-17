import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdmin } from "@/lib/admin";

export async function GET() {
  const adminCheck = await checkAdmin();
  if (!adminCheck.authorized) return adminCheck.response;

  const [
    totalInstances,
    onlineCount,
    offlineCount,
    errorCount,
    totalTradesAllTime,
    topSymbols,
    topBrokers,
  ] = await Promise.all([
    prisma.liveEAInstance.count(),
    prisma.liveEAInstance.count({ where: { status: "ONLINE" } }),
    prisma.liveEAInstance.count({ where: { status: "OFFLINE" } }),
    prisma.liveEAInstance.count({ where: { status: "ERROR" } }),
    prisma.eATrade.count(),
    prisma.liveEAInstance.groupBy({
      by: ["symbol"],
      where: { symbol: { not: null } },
      _count: { symbol: true },
      orderBy: { _count: { symbol: "desc" } },
      take: 10,
    }),
    prisma.liveEAInstance.groupBy({
      by: ["broker"],
      where: { broker: { not: null } },
      _count: { broker: true },
      orderBy: { _count: { broker: "desc" } },
      take: 10,
    }),
  ]);

  return NextResponse.json({
    totalInstances,
    onlineCount,
    offlineCount,
    errorCount,
    totalTradesAllTime,
    topSymbols: topSymbols.map((s) => ({
      symbol: s.symbol,
      count: s._count.symbol,
    })),
    topBrokers: topBrokers.map((b) => ({
      broker: b.broker,
      count: b._count.broker,
    })),
  });
}
