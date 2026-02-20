import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createApiLogger, extractErrorDetails } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";

// GET /api/notifications - Fetch user's notifications (alerts from their EA instances)
// DEPRECATED: This reads from the legacy EAAlert table (tied to EAAlertRule).
// The new alert system uses EAAlertConfig. This endpoint remains for reading
// existing legacy alert data. TODO: Migrate to a new notification system.
export async function GET() {
  const session = await auth();
  const log = createApiLogger("/api/notifications", "GET", session?.user?.id);

  if (!session?.user?.id) {
    return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
  }

  try {
    // Fetch alerts for EA instances belonging to this user
    const [alerts, unreadCount] = await Promise.all([
      prisma.eAAlert.findMany({
        where: {
          instance: { userId: session.user.id },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          rule: { select: { type: true, threshold: true } },
          instance: { select: { eaName: true, symbol: true } },
        },
      }),
      prisma.eAAlert.count({
        where: {
          instance: { userId: session.user.id },
          acknowledged: false,
        },
      }),
    ]);

    return NextResponse.json({ alerts, unreadCount });
  } catch (error) {
    log.error({ error: extractErrorDetails(error) }, "Failed to fetch notifications");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Failed to fetch notifications"), {
      status: 500,
    });
  }
}
