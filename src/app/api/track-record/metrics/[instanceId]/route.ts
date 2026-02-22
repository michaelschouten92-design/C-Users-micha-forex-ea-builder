import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeMetrics } from "@/lib/track-record/metrics";

type Props = {
  params: Promise<{ instanceId: string }>;
};

// GET /api/track-record/metrics/[instanceId] — risk-adjusted metrics for dashboard
export async function GET(request: NextRequest, { params }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { instanceId } = await params;

  // Verify ownership
  const instance = await prisma.liveEAInstance.findFirst({
    where: { id: instanceId, userId: session.user.id, deletedAt: null },
    select: { id: true },
  });

  if (!instance) {
    return NextResponse.json({ error: "Instance not found" }, { status: 404 });
  }

  // Load TRADE_CLOSE events for trade results
  const tradeCloseEvents = await prisma.trackRecordEvent.findMany({
    where: { instanceId, eventType: "TRADE_CLOSE" },
    orderBy: { seqNo: "asc" },
    select: { payload: true },
    take: 5000,
  });

  // Load SNAPSHOT events for equity curve
  const snapshotEvents = await prisma.trackRecordEvent.findMany({
    where: { instanceId, eventType: "SNAPSHOT" },
    orderBy: { seqNo: "asc" },
    select: { payload: true, timestamp: true },
    take: 5000,
  });

  const tradeResults = tradeCloseEvents.map((e) => {
    const p = e.payload as Record<string, unknown>;
    return (p.profit as number) ?? 0;
  });

  const equityCurve = snapshotEvents.map((e) => {
    const p = e.payload as Record<string, unknown>;
    return {
      t: e.timestamp.toISOString(),
      b: (p.balance as number) ?? 0,
      e: (p.equity as number) ?? 0,
      dd: (p.drawdownPct as number) ?? 0,
    };
  });

  const metrics = computeMetrics(tradeResults, equityCurve);

  // Get drawdown duration from state
  const state = await prisma.trackRecordState.findUnique({
    where: { instanceId },
    select: { maxDrawdownDurationSec: true },
  });

  return NextResponse.json({
    ...metrics,
    drawdownDuration: state?.maxDrawdownDurationSec ?? 0,
  });
}
