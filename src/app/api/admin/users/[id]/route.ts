import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { checkAdmin } from "@/lib/admin";

// GET /api/admin/users/[id] - Detailed user info with full history
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminCheck = await checkAdmin();
    if (!adminCheck.authorized) return adminCheck.response;

    const { id } = await params;

    const [user, auditLogs] = await Promise.all([
      prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          emailVerified: true,
          createdAt: true,
          role: true,
          referralCode: true,
          referredBy: true,
          subscription: true,
          projects: {
            where: { deletedAt: null },
            select: {
              id: true,
              name: true,
              updatedAt: true,
              _count: { select: { versions: true, exports: true } },
            },
            orderBy: { updatedAt: "desc" },
          },
          exports: {
            select: {
              id: true,
              exportType: true,
              status: true,
              createdAt: true,
              errorMessage: true,
              project: { select: { name: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 20,
          },
        },
      }),
      prisma.auditLog.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

    if (!user) {
      return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "User not found"), { status: 404 });
    }

    return NextResponse.json({ ...user, auditLogs });
  } catch (error) {
    logger.error({ error }, "Failed to fetch user detail");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
