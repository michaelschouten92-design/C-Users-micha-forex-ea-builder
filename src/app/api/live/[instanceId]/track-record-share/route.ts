/**
 * POST /api/live/[instanceId]/track-record-share
 *
 * Publishes or unpublishes the account-level track record for a base instance.
 * Requires explicit action: "publish" or "unpublish".
 * Republishing generates a new token (old URLs stay dead).
 * Only the owning user can manage the share.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, ErrorCode } from "@/lib/error-codes";

const bodySchema = z.object({
  action: z.enum(["publish", "unpublish"]),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ instanceId: string }> }
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(apiError(ErrorCode.INVALID_JSON, "Invalid JSON"), { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      apiError(ErrorCode.VALIDATION_FAILED, 'action must be "publish" or "unpublish"'),
      { status: 400 }
    );
  }

  const { action } = parsed.data;
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

  const existing = await prisma.accountTrackRecordShare.findUnique({
    where: { baseInstanceId: instanceId },
    select: { id: true, token: true, isPublic: true },
  });

  if (action === "unpublish") {
    if (existing && existing.isPublic) {
      await prisma.accountTrackRecordShare.update({
        where: { id: existing.id },
        data: { isPublic: false },
      });
    }
    return NextResponse.json({ token: null, isPublic: false, url: null });
  }

  // action === "publish"
  if (existing) {
    // Republish: generate new token so old URLs stay dead
    const newToken = randomBytes(16).toString("hex");
    const updated = await prisma.accountTrackRecordShare.update({
      where: { id: existing.id },
      data: { isPublic: true, token: newToken },
      select: { token: true },
    });
    return NextResponse.json({
      token: updated.token,
      isPublic: true,
      url: `/track-record/${updated.token}`,
    });
  }

  // First publish
  const share = await prisma.accountTrackRecordShare.create({
    data: {
      baseInstanceId: instanceId,
      userId: session.user.id,
    },
    select: { token: true },
  });

  return NextResponse.json({
    token: share.token,
    isPublic: true,
    url: `/track-record/${share.token}`,
  });
}
