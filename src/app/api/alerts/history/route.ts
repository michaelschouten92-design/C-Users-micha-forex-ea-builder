import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "50"), 100);

  const [alerts, deliveries] = await Promise.all([
    // Control-layer alerts (governance events)
    prisma.controlLayerAlert.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: limit,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        alertType: true,
        summary: true,
        acknowledgedAt: true,
        createdAt: true,
        instance: {
          select: {
            eaName: true,
            symbol: true,
          },
        },
      },
    }),
    // Notification deliveries (outbox entries)
    prisma.notificationOutbox.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        channel: true,
        status: true,
        attempts: true,
        lastError: true,
        alertSourceId: true,
        createdAt: true,
      },
    }),
  ]);

  // Build a map of alertId → delivery statuses
  const deliveryMap = new Map<
    string,
    { channel: string; status: string; error: string | null }[]
  >();
  for (const d of deliveries) {
    if (!d.alertSourceId) continue;
    const list = deliveryMap.get(d.alertSourceId) ?? [];
    list.push({ channel: d.channel, status: d.status, error: d.lastError });
    deliveryMap.set(d.alertSourceId, list);
  }

  const items = alerts.map((a) => ({
    id: a.id,
    alertType: a.alertType,
    summary: a.summary,
    acknowledgedAt: a.acknowledgedAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
    instance: a.instance ? { eaName: a.instance.eaName, symbol: a.instance.symbol } : null,
    deliveries: deliveryMap.get(a.id) ?? [],
  }));

  const nextCursor = alerts.length === limit ? alerts[alerts.length - 1].id : null;

  return NextResponse.json({ items, nextCursor });
}
