/**
 * POST /api/alerts/[id]/acknowledge — Dismiss a control-layer alert.
 *
 * Deletes the alert row, freeing the dedupeKey so the same condition can
 * re-alert on the next monitoring cycle if it still persists. This is
 * correct governance behavior: dismissing without fixing should re-alert.
 *
 * Idempotent — dismissing an already-deleted alert returns success.
 * Only the alert owner can dismiss.
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
    select: { userId: true },
  });

  if (!alert) {
    // Already deleted — idempotent success
    return NextResponse.json({ success: true });
  }

  if (alert.userId !== session.user.id) {
    return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "Alert not found"), { status: 404 });
  }

  await prisma.controlLayerAlert.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
