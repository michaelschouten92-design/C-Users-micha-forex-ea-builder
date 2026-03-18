/**
 * POST /api/live/[instanceId]/track-record-share
 *
 * Creates or toggles the public track record share for a base (account-wide) instance.
 * Only the owning user can publish/unpublish.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, ErrorCode } from "@/lib/error-codes";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ instanceId: string }> }
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
  }

  const { instanceId } = await params;

  // Verify instance exists, belongs to user, and is a base (account-wide) instance
  const instance = await prisma.liveEAInstance.findFirst({
    where: { id: instanceId, userId: session.user.id, deletedAt: null, parentInstanceId: null },
    select: { id: true },
  });

  if (!instance) {
    return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "Base instance not found"), {
      status: 404,
    });
  }

  // Check for existing share
  const existing = await prisma.accountTrackRecordShare.findUnique({
    where: { baseInstanceId: instanceId },
    select: { id: true, token: true, isPublic: true },
  });

  if (existing) {
    // Toggle isPublic
    const updated = await prisma.accountTrackRecordShare.update({
      where: { id: existing.id },
      data: { isPublic: !existing.isPublic },
      select: { token: true, isPublic: true },
    });

    return NextResponse.json({
      token: updated.token,
      isPublic: updated.isPublic,
      url: updated.isPublic ? `/track-record/${updated.token}` : null,
    });
  }

  // Create new share
  const share = await prisma.accountTrackRecordShare.create({
    data: {
      baseInstanceId: instanceId,
      userId: session.user.id,
    },
    select: { token: true, isPublic: true },
  });

  return NextResponse.json({
    token: share.token,
    isPublic: share.isPublic,
    url: `/track-record/${share.token}`,
  });
}
