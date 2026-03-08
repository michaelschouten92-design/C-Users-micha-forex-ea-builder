/**
 * GET /api/alerts — Control-layer alert feed for the authenticated user.
 *
 * Returns unacknowledged alerts ordered by recency, plus a total count.
 * Query params:
 *   ?limit=N   — max items to return (default 20, max 50)
 *   ?all=true  — include acknowledged alerts
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { apiError, ErrorCode } from "@/lib/error-codes";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || "20"), 50);
  const includeAll = url.searchParams.get("all") === "true";

  const where = {
    userId: session.user.id,
    ...(includeAll ? {} : { acknowledgedAt: null }),
  };

  const [alerts, total] = await Promise.all([
    prisma.controlLayerAlert.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        instanceId: true,
        alertType: true,
        summary: true,
        reasons: true,
        acknowledgedAt: true,
        webhookStatus: true,
        createdAt: true,
        instance: { select: { eaName: true } },
      },
    }),
    prisma.controlLayerAlert.count({ where }),
  ]);

  return NextResponse.json({ alerts, total });
}
