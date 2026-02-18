import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { checkAdmin } from "@/lib/admin";

// GET /api/admin/funnel - Conversion funnel data
export async function GET() {
  try {
    const adminCheck = await checkAdmin();
    if (!adminCheck.authorized) return adminCheck.response;

    const [totalSignups, emailVerified, createdProject, firstExport, paidUsers] = await Promise.all(
      [
        prisma.user.count(),
        prisma.user.count({ where: { emailVerified: true } }),
        prisma.user.count({
          where: { projects: { some: { deletedAt: null } } },
        }),
        prisma.user.count({
          where: { exports: { some: {} } },
        }),
        prisma.subscription.count({
          where: { tier: { not: "FREE" } },
        }),
      ]
    );

    return NextResponse.json({
      funnel: [
        { label: "Total Signups", count: totalSignups },
        { label: "Email Verified", count: emailVerified },
        { label: "Created Project", count: createdProject },
        { label: "First Export", count: firstExport },
        { label: "Paid", count: paidUsers },
      ],
    });
  } catch (error) {
    logger.error({ error }, "Failed to fetch funnel data");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
