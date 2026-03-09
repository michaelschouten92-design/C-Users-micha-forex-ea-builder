import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, ErrorCode } from "@/lib/error-codes";

/**
 * GET /api/live/terminals/linkable-instances?terminalId=xxx
 *
 * Returns instances eligible for linking to a deployment on the given terminal.
 * An instance is eligible if it is:
 * - owned by the user
 * - not soft-deleted
 * - not already associated with a different terminal
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
  }

  const terminalId = request.nextUrl.searchParams.get("terminalId");
  if (!terminalId) {
    return NextResponse.json(
      apiError(ErrorCode.VALIDATION_FAILED, "terminalId query parameter is required"),
      { status: 400 }
    );
  }

  const instances = await prisma.liveEAInstance.findMany({
    where: {
      userId: session.user.id,
      deletedAt: null,
      OR: [{ terminalConnectionId: null }, { terminalConnectionId: terminalId }],
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      eaName: true,
      symbol: true,
      timeframe: true,
      status: true,
      strategyVersionId: true,
      terminalConnectionId: true,
    },
  });

  return NextResponse.json({
    instances: instances.map((i) => ({
      id: i.id,
      eaName: i.eaName,
      symbol: i.symbol,
      timeframe: i.timeframe,
      status: i.status,
      hasBaseline: i.strategyVersionId !== null,
      terminalConnectionId: i.terminalConnectionId,
    })),
  });
}
