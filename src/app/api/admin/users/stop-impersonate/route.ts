import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { audit } from "@/lib/audit";

// POST /api/admin/users/stop-impersonate - Stop impersonating a user
export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
    }

    // Must be currently impersonating
    if (!session.user.impersonatorId) {
      return NextResponse.json(apiError(ErrorCode.FORBIDDEN, "Not currently impersonating"), {
        status: 403,
      });
    }

    const targetUserId = session.user.id;
    const adminId = session.user.impersonatorId;
    const targetEmail = session.user.impersonatingEmail || "unknown";

    // Look up admin and verify they still have ADMIN role
    const adminUser = await prisma.user.findUnique({
      where: { id: adminId },
      select: { email: true, role: true },
    });

    if (!adminUser || adminUser.role !== "ADMIN") {
      return NextResponse.json(
        apiError(ErrorCode.FORBIDDEN, "Admin user not found or no longer admin"),
        {
          status: 403,
        }
      );
    }

    // Audit log
    await audit.impersonationStop(adminId, targetUserId, targetEmail);

    logger.info({ adminId, targetUserId, targetEmail }, "Admin stopped impersonation");

    return NextResponse.json({ stopImpersonation: true });
  } catch (error) {
    logger.error({ error }, "Failed to stop impersonation");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
