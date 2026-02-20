import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createApiLogger, extractErrorDetails } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";

type Props = {
  params: Promise<{ id: string }>;
};

// POST /api/notifications/[id]/acknowledge - Mark a notification as read
// DEPRECATED: This operates on the legacy EAAlert table. See notifications/route.ts.
export async function POST(_request: NextRequest, { params }: Props) {
  const session = await auth();
  const { id } = await params;
  const log = createApiLogger("/api/notifications/[id]/acknowledge", "POST", session?.user?.id);

  if (!session?.user?.id) {
    return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
  }

  try {
    // Verify the alert belongs to the user before acknowledging
    const alert = await prisma.eAAlert.findFirst({
      where: {
        id,
        instance: { userId: session.user.id },
      },
    });

    if (!alert) {
      return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "Notification not found"), {
        status: 404,
      });
    }

    const updated = await prisma.eAAlert.update({
      where: { id },
      data: { acknowledged: true },
    });

    return NextResponse.json({ success: true, alert: updated });
  } catch (error) {
    log.error(
      { error: extractErrorDetails(error), alertId: id },
      "Failed to acknowledge notification"
    );
    return NextResponse.json(
      apiError(ErrorCode.INTERNAL_ERROR, "Failed to acknowledge notification"),
      { status: 500 }
    );
  }
}
