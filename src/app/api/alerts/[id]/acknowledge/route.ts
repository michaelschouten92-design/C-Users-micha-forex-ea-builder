/**
 * POST /api/alerts/[id]/acknowledge — Acknowledge a control-layer alert.
 *
 * Sets acknowledgedAt timestamp. Idempotent — re-acknowledging is a no-op.
 * Only the alert owner can acknowledge.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { apiError, ErrorCode } from "@/lib/error-codes";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
  }

  const { id } = await params;

  const alert = await prisma.controlLayerAlert.findUnique({
    where: { id },
    select: { userId: true, acknowledgedAt: true },
  });

  if (!alert || alert.userId !== session.user.id) {
    return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "Alert not found"), { status: 404 });
  }

  // Idempotent
  if (alert.acknowledgedAt) {
    return NextResponse.json({ success: true });
  }

  await prisma.controlLayerAlert.update({
    where: { id },
    data: { acknowledgedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
