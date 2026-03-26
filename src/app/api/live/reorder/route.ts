import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";

/**
 * PATCH /api/live/reorder — Update account card display order.
 *
 * Body: { order: string[] }
 *   Array of instance IDs in the desired display order.
 *   Each ID gets sortOrder = index + 1.
 */
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
    }

    const body = await request.json();
    const order: unknown = body.order;

    if (!Array.isArray(order) || order.length === 0 || !order.every((id) => typeof id === "string")) {
      return NextResponse.json(
        apiError(ErrorCode.VALIDATION_FAILED, "order must be a non-empty array of instance IDs"),
        { status: 400 }
      );
    }

    // Verify all IDs belong to this user
    const instances = await prisma.liveEAInstance.findMany({
      where: { id: { in: order as string[] }, userId: session.user.id, deletedAt: null },
      select: { id: true },
    });
    const ownedIds = new Set(instances.map((i) => i.id));
    const validOrder = (order as string[]).filter((id) => ownedIds.has(id));

    if (validOrder.length === 0) {
      return NextResponse.json(
        apiError(ErrorCode.NOT_FOUND, "No valid instances found"),
        { status: 404 }
      );
    }

    // Update sortOrder for each instance in a serializable transaction
    await prisma.$transaction(
      async (tx) => {
        for (let i = 0; i < validOrder.length; i++) {
          await tx.liveEAInstance.update({
            where: { id: validOrder[i] },
            data: { sortOrder: i + 1 },
          });
        }
      },
      { isolationLevel: "Serializable" }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Failed to reorder instances");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
