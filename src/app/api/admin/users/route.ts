import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";

// GET /api/admin/users - List all users with subscription info (admin only)
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
    }

    if (session.user.email !== process.env.ADMIN_EMAIL) {
      return NextResponse.json(apiError(ErrorCode.FORBIDDEN, "Access denied"), { status: 403 });
    }

    // Start of current month (UTC) for export count
    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        createdAt: true,
        subscription: {
          select: {
            tier: true,
            status: true,
          },
        },
        _count: {
          select: {
            projects: { where: { deletedAt: null } },
            exports: {
              where: { createdAt: { gte: startOfMonth } },
            },
          },
        },
      },
    });

    const data = users.map((user) => ({
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      subscription: user.subscription
        ? { tier: user.subscription.tier, status: user.subscription.status }
        : { tier: "FREE", status: "active" },
      projectCount: user._count.projects,
      exportCount: user._count.exports,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    logger.error({ error }, "Failed to list users (admin)");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
