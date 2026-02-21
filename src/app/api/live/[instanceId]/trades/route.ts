import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { NextRequest, NextResponse } from "next/server";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ instanceId: string }> }
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
  }

  const { instanceId } = await params;

  // Verify the user owns this instance
  const instance = await prisma.liveEAInstance.findFirst({
    where: { id: instanceId, userId: session.user.id, deletedAt: null },
    select: { id: true },
  });

  if (!instance) {
    return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "Instance not found"), {
      status: 404,
    });
  }

  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(
      1,
      parseInt(searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE
    )
  );
  const skip = (page - 1) * pageSize;

  const [trades, totalCount] = await Promise.all([
    prisma.eATrade.findMany({
      where: { instanceId },
      orderBy: { openTime: "desc" },
      skip,
      take: pageSize,
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
        mode: true,
      },
    }),
    prisma.eATrade.count({ where: { instanceId } }),
  ]);

  const data = trades.map((t) => ({
    id: t.id,
    ticket: t.ticket,
    symbol: t.symbol,
    type: t.type,
    openPrice: t.openPrice,
    closePrice: t.closePrice,
    lots: t.lots,
    profit: t.profit,
    openTime: t.openTime.toISOString(),
    closeTime: t.closeTime?.toISOString() ?? null,
    mode: t.mode,
  }));

  return NextResponse.json({
    data,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  });
}
