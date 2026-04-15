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

    // Limit audit logs to last 12 months to prevent OOM on large accounts
    const auditLogCutoff = new Date();
    auditLogCutoff.setMonth(auditLogCutoff.getMonth() - 12);

    const [user, subscription, projects, exports, templates, auditLogs, liveInstances] =
      await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            emailVerified: true,
            emailVerifiedAt: true,
            createdAt: true,
            updatedAt: true,
            // Third-party identifiers — required for Art. 15 (right to access).
            // The user must be able to verify which external accounts /
            // notification channels we have on file for them.
            referralCode: true,
            referredBy: true,
            discordId: true,
            telegramChatId: true,
            slackWebhookUrl: true,
            webhookUrl: true,
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
              orderBy: { versionNo: "desc" },
              take: 20, // Limit versions per project to prevent OOM
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
          take: 1000, // Cap exports in GDPR data
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
          where: { userId, createdAt: { gte: auditLogCutoff } },
          take: 5000,
          select: {
            eventType: true,
            resourceType: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.liveEAInstance.findMany({
          where: { userId, deletedAt: null },
          take: 500,
          select: {
            id: true,
            eaName: true,
            symbol: true,
            broker: true,
            accountNumber: true,
            mode: true,
            status: true,
            totalTrades: true,
            totalProfit: true,
            balance: true,
            lifecycleState: true,
            createdAt: true,
          },
        }),
      ]);

    // Partner record (if any). IBAN is masked to last 4 chars — the user
    // already knows their own IBAN; the export is for verification of what
    // we hold, not a replay of secrets.
    const referralPartner = await prisma.referralPartner.findUnique({
      where: { userId },
      select: {
        commissionBps: true,
        status: true,
        payoutEmail: true,
        payoutIban: true,
        payoutAccountHolder: true,
        createdAt: true,
      },
    });
    const referralPartnerExport = referralPartner
      ? {
          ...referralPartner,
          payoutIban: referralPartner.payoutIban
            ? `****${referralPartner.payoutIban.slice(-4)}`
            : null,
        }
      : null;

    const exportData = {
      exportedAt: new Date().toISOString(),
      user,
      subscription,
      referralPartner: referralPartnerExport,
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
      monitoredAccounts: liveInstances,
    };

    logger.info({ userId }, "GDPR data export completed");

    return new NextResponse(JSON.stringify(exportData), {
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
