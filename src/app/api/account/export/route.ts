import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  apiRateLimiter,
  checkRateLimit,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";

/**
 * GET /api/account/export - GDPR data export
 * Returns all user data as JSON download.
 */
export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 3 exports per hour
  const rateLimitResult = await checkRateLimit(apiRateLimiter, `gdpr-export:${session.user.id}`);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: formatRateLimitError(rateLimitResult) },
      { status: 429, headers: createRateLimitHeaders(rateLimitResult) }
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        subscription: {
          select: {
            tier: true,
            status: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
          },
        },
        projects: {
          select: {
            id: true,
            name: true,
            description: true,
            createdAt: true,
            updatedAt: true,
            deletedAt: true,
            versions: {
              select: {
                id: true,
                versionNo: true,
                createdAt: true,
                buildJson: true,
              },
              orderBy: { versionNo: "desc" },
            },
          },
        },
        exports: {
          select: {
            id: true,
            exportType: true,
            status: true,
            outputName: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const exportData = {
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        authProvider: user.authProviderId?.split("_")[0] || "unknown",
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      subscription: user.subscription,
      projects: user.projects,
      exports: user.exports,
    };

    logger.info({ userId: session.user.id }, "GDPR data export requested");

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="algostudio-data-export-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error) {
    logger.error({ error, userId: session.user.id }, "GDPR export failed");
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
