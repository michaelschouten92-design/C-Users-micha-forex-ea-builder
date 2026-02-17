import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { checkAdmin } from "@/lib/admin";

// GET /api/admin/users - List all users with subscription info (admin only, paginated)
export async function GET(request: Request) {
  try {
    const adminCheck = await checkAdmin();
    if (!adminCheck.authorized) return adminCheck.response;

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
    const limit = Math.min(
      1000,
      Math.max(1, parseInt(url.searchParams.get("limit") ?? "500", 10) || 500)
    );
    const skip = (page - 1) * limit;

    // Start of current month (UTC) for export count
    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          emailVerified: true,
          createdAt: true,
          role: true,
          referredBy: true,
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
      }),
      prisma.user.count(),
    ]);

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
      referredBy: user.referredBy ?? null,
    }));

    return NextResponse.json({
      data,
      adminEmail: adminCheck.adminEmail,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error({ error }, "Failed to list users (admin)");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
