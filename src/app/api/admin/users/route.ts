import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { checkAdmin } from "@/lib/admin";

// GET /api/admin/users - List all users with subscription info (admin only)
export async function GET() {
  try {
    const adminCheck = await checkAdmin();
    if (!adminCheck.authorized) return adminCheck.response;

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
        role: true,
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
      role: user.role,
      subscription: user.subscription
        ? { tier: user.subscription.tier, status: user.subscription.status }
        : { tier: "FREE", status: "active" },
      projectCount: user._count.projects,
      exportCount: user._count.exports,
    }));

    return NextResponse.json({ data, adminEmail: adminCheck.adminEmail });
  } catch (error) {
    logger.error({ error }, "Failed to list users (admin)");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
