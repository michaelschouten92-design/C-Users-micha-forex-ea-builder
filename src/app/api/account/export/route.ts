import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  gdprExportRateLimiter,
  checkRateLimit,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";

/**
 * GET /api/account/export - GDPR data export
 * Returns all user data as a JSON download.
 */
export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 3 exports per hour
  const rateLimitResult = await checkRateLimit(
    gdprExportRateLimiter,
    `gdpr-export:${session.user.id}`
  );
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: formatRateLimitError(rateLimitResult) },
      { status: 429, headers: createRateLimitHeaders(rateLimitResult) }
    );
  }

  try {
    const userId = session.user.id;

    const [user, subscription, projects, exports, templates, auditLogs] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          emailVerified: true,
          emailVerifiedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.subscription.findUnique({
        where: { userId },
        select: {
          tier: true,
          status: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
        },
      }),
      prisma.project.findMany({
        where: { userId },
        include: {
          versions: {
            select: {
              versionNo: true,
              buildJson: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.exportJob.findMany({
        where: { userId },
        select: {
          exportType: true,
          status: true,
          outputName: true,
          createdAt: true,
        },
      }),
      prisma.userTemplate.findMany({
        where: { userId },
        select: {
          name: true,
          buildJson: true,
          createdAt: true,
        },
      }),
      prisma.auditLog.findMany({
        where: { userId },
        select: {
          eventType: true,
          resourceType: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      user,
      subscription,
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        deletedAt: p.deletedAt,
        versions: p.versions,
      })),
      exports,
      templates,
      auditLogs,
    };

    logger.info({ userId }, "GDPR data export completed");

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="algo-studio-data-export-${new Date().toISOString().split("T")[0]}.json"`,
        ...createRateLimitHeaders(rateLimitResult),
      },
    });
  } catch (error) {
    logger.error({ error, userId: session.user.id }, "GDPR data export failed");
    return NextResponse.json({ error: "Data export failed" }, { status: 500 });
  }
}
