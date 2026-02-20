import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateTelemetry } from "@/lib/telemetry-auth";

type Props = {
  params: Promise<{ instanceId: string }>;
};

// GET /api/track-record/state/[instanceId] — return current chain state for EA recovery
export async function GET(request: NextRequest, { params }: Props) {
  const auth = await authenticateTelemetry(request);
  if (!auth.success) return auth.response;

  const { instanceId: authInstanceId } = auth;
  const { instanceId } = await params;

  // Ensure the authenticated instance matches the requested one
  if (authInstanceId !== instanceId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const state = await prisma.trackRecordState.findUnique({
    where: { instanceId },
    select: {
      lastSeqNo: true,
      lastEventHash: true,
      balance: true,
      equity: true,
      highWaterMark: true,
      maxDrawdown: true,
      maxDrawdownPct: true,
      totalTrades: true,
      totalProfit: true,
      winCount: true,
      lossCount: true,
    },
  });

  if (!state) {
    return NextResponse.json({
      lastSeqNo: 0,
      lastEventHash: "0000000000000000000000000000000000000000000000000000000000000000",
    });
  }

  return NextResponse.json(state);
}
