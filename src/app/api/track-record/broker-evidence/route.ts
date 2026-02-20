import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buildBrokerDigestPayload,
  analyzeBrokerCorroboration,
} from "@/lib/track-record/broker-corroboration";
import { appendChainEvent } from "@/lib/track-record/chain-append";

const digestSchema = z.object({
  instanceId: z.string().min(1),
  rawContent: z.string().min(1),
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
  exportFormat: z.string().min(1),
});

// POST /api/track-record/broker-evidence — submit broker history for digest creation
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validation = digestSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.issues.map((i) => i.message) },
      { status: 400 }
    );
  }

  const { instanceId, rawContent, periodStart, periodEnd, exportFormat } = validation.data;

  // Verify the user owns this instance
  const instance = await prisma.liveEAInstance.findFirst({
    where: { id: instanceId, userId: session.user.id, deletedAt: null },
    select: { id: true },
  });

  if (!instance) {
    return NextResponse.json({ error: "Instance not found" }, { status: 404 });
  }

  try {
    const digest = buildBrokerDigestPayload(rawContent, periodStart, periodEnd, exportFormat);

    // Insert BROKER_HISTORY_DIGEST into the event chain
    const chainEvent = await appendChainEvent(instanceId, "BROKER_HISTORY_DIGEST", {
      historyHash: digest.historyHash,
      periodStart: digest.periodStart,
      periodEnd: digest.periodEnd,
      tradeCount: digest.tradeCount,
      exportFormat: digest.exportFormat,
    });

    return NextResponse.json({
      success: true,
      digest,
      historyHash: digest.historyHash,
      chainEvent: { seqNo: chainEvent.seqNo, eventHash: chainEvent.eventHash },
    });
  } catch (error) {
    console.error("Broker evidence error:", error);
    return NextResponse.json({ error: "Failed to process broker evidence" }, { status: 500 });
  }
}

// GET /api/track-record/broker-evidence?instanceId=... — analyze broker corroboration
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const instanceId = request.nextUrl.searchParams.get("instanceId");
  if (!instanceId) {
    return NextResponse.json({ error: "instanceId is required" }, { status: 400 });
  }

  // Verify the user owns this instance
  const instance = await prisma.liveEAInstance.findFirst({
    where: { id: instanceId, userId: session.user.id, deletedAt: null },
    select: { id: true },
  });

  if (!instance) {
    return NextResponse.json({ error: "Instance not found" }, { status: 404 });
  }

  try {
    // Load trade events and broker evidence events
    const events = await prisma.trackRecordEvent.findMany({
      where: { instanceId },
      orderBy: { seqNo: "asc" },
    });

    const tradeEvents = events.filter(
      (e) => e.eventType === "TRADE_OPEN" || e.eventType === "TRADE_CLOSE"
    );
    const brokerEvidenceEvents = events.filter((e) => e.eventType === "BROKER_EVIDENCE");
    const digestEvents = events.filter((e) => e.eventType === "BROKER_HISTORY_DIGEST");

    const ledgerTrades = tradeEvents.map((e) => {
      const p = e.payload as Record<string, unknown>;
      return {
        ticket: (p.ticket as string) ?? "",
        timestamp: Math.floor(e.timestamp.getTime() / 1000),
        price:
          e.eventType === "TRADE_OPEN"
            ? ((p.openPrice as number) ?? 0)
            : ((p.closePrice as number) ?? 0),
        symbol: (p.symbol as string) ?? "",
        action: e.eventType === "TRADE_OPEN" ? "OPEN" : "CLOSE",
      };
    });

    const brokerEvidence = brokerEvidenceEvents.map((e) => {
      const p = e.payload as Record<string, unknown>;
      return {
        brokerTicket: (p.brokerTicket as string) ?? "",
        executionTimestamp: (p.executionTimestamp as number) ?? 0,
        executionPrice: (p.executionPrice as number) ?? 0,
        symbol: (p.symbol as string) ?? "",
        linkedTicket: (p.linkedTicket as string) ?? "",
        action: (p.action as string) ?? "",
      };
    });

    const analysis = analyzeBrokerCorroboration(ledgerTrades, brokerEvidence);

    return NextResponse.json({
      instanceId,
      brokerEvidenceCount: brokerEvidenceEvents.length,
      brokerDigestCount: digestEvents.length,
      corroboration: analysis,
    });
  } catch (error) {
    console.error("Broker evidence analysis error:", error);
    return NextResponse.json({ error: "Failed to analyze broker corroboration" }, { status: 500 });
  }
}
