/**
 * POST /api/alerts/acknowledge-all — Acknowledge ALL unacknowledged alerts for the user.
 *
 * Sets acknowledgedAt on every unacknowledged alert in one query.
 * This ensures "Dismiss all" clears everything, not just the loaded page.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { apiError, ErrorCode } from "@/lib/error-codes";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
  }

  const result = await prisma.controlLayerAlert.updateMany({
    where: { userId: session.user.id, acknowledgedAt: null },
    data: { acknowledgedAt: new Date() },
  });

  return NextResponse.json({ success: true, acknowledged: result.count });
}
