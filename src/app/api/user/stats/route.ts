import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createApiLogger, extractErrorDetails } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";

// GET /api/user/stats - Aggregated user stats for the dashboard
export async function GET() {
  const session = await auth();
  const log = createApiLogger("/api/user/stats", "GET", session?.user?.id);

  if (!session?.user?.id) {
    return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
  }

  try {
    // Get start of current month (UTC)
    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);

    const [exportsThisMonth, totalProjects, liveEAs, templatesUsed, user] = await Promise.all([
      prisma.exportJob.count({
        where: {
          userId: session.user.id,
          createdAt: { gte: startOfMonth },
        },
      }),
      prisma.project.count({
        where: {
          userId: session.user.id,
          deletedAt: null,
        },
      }),
      prisma.liveEAInstance.count({
        where: {
          userId: session.user.id,
          status: "ONLINE",
        },
      }),
      prisma.userTemplate.count({
        where: {
          userId: session.user.id,
        },
      }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { createdAt: true },
      }),
    ]);

    return NextResponse.json({
      exportsThisMonth,
      totalProjects,
      liveEAs,
      templatesUsed,
      memberSince: user?.createdAt ?? null,
    });
  } catch (error) {
    log.error({ error: extractErrorDetails(error) }, "Failed to fetch user stats");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Failed to fetch user stats"), {
      status: 500,
    });
  }
}
