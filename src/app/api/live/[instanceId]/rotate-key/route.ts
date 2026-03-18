import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { logAuditEvent } from "@/lib/audit";
import { logger } from "@/lib/logger";

/**
 * POST /api/live/[instanceId]/rotate-key
 * Regenerates the API key for an EA instance.
 * The old key is invalidated immediately (no grace period).
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ instanceId: string }> }
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
  }

  const { instanceId } = await params;

  // Verify instance exists and belongs to user
  const instance = await prisma.liveEAInstance.findFirst({
    where: { id: instanceId, userId: session.user.id, deletedAt: null },
    select: { id: true, apiKeyHash: true, eaName: true },
  });

  if (!instance) {
    return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "Instance not found"), { status: 404 });
  }

  // Generate new key
  const newApiKey = randomBytes(32).toString("hex");
  const newHash = createHash("sha256").update(newApiKey).digest("hex");
  const now = new Date();

  await prisma.liveEAInstance.update({
    where: { id: instanceId },
    data: {
      apiKeyHashPrev: null,
      apiKeyHash: newHash,
      apiKeySuffix: newApiKey.slice(-4),
      keyRotatedAt: now,
      keyGracePeriodEnd: null,
    },
  });

  logAuditEvent({
    userId: session.user.id,
    eventType: "live.api_key_rotated",
    resourceType: "live_ea_instance",
    resourceId: instanceId,
    metadata: { action: "key_regenerated", eaName: instance.eaName },
  }).catch((err) => {
    logger.error({ err, instanceId }, "Audit log failed: key_regenerated");
  });

  return NextResponse.json({ apiKey: newApiKey });
}
