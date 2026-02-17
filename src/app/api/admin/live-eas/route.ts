import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdmin } from "@/lib/admin";

export async function GET(request: NextRequest) {
  const adminCheck = await checkAdmin();
  if (!adminCheck.authorized) return adminCheck.response;

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    50,
    Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10) || 20)
  );
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};

  if (status && ["ONLINE", "OFFLINE", "ERROR"].includes(status)) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { eaName: { contains: search, mode: "insensitive" } },
      { symbol: { contains: search, mode: "insensitive" } },
      { broker: { contains: search, mode: "insensitive" } },
      { user: { email: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [instances, total] = await Promise.all([
    prisma.liveEAInstance.findMany({
      where,
      include: {
        user: { select: { email: true } },
        exportJob: { select: { createdAt: true, exportType: true } },
      },
      orderBy: { lastHeartbeat: { sort: "desc", nulls: "last" } },
      skip,
      take: pageSize,
    }),
    prisma.liveEAInstance.count({ where }),
  ]);

  return NextResponse.json({
    data: instances.map((inst) => ({
      id: inst.id,
      eaName: inst.eaName,
      status: inst.status,
      symbol: inst.symbol,
      timeframe: inst.timeframe,
      broker: inst.broker,
      accountNumber: inst.accountNumber,
      balance: inst.balance,
      equity: inst.equity,
      openTrades: inst.openTrades,
      totalTrades: inst.totalTrades,
      totalProfit: inst.totalProfit,
      lastHeartbeat: inst.lastHeartbeat,
      lastError: inst.lastError,
      createdAt: inst.createdAt,
      userEmail: inst.user.email,
      exportType: inst.exportJob.exportType,
      exportDate: inst.exportJob.createdAt,
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}
