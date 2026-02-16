import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { checkAdmin } from "@/lib/admin";

// GET /api/admin/users/export-csv - Export all users as CSV
export async function GET() {
  try {
    const adminCheck = await checkAdmin();
    if (!adminCheck.authorized) return adminCheck.response;

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        email: true,
        emailVerified: true,
        createdAt: true,
        referralCode: true,
        referredBy: true,
        subscription: { select: { tier: true, status: true } },
        _count: {
          select: {
            projects: { where: { deletedAt: null } },
            exports: true,
          },
        },
      },
    });

    const header = "Email,Tier,Status,Projects,Exports,Verified,Joined,ReferralCode,ReferredBy";
    const rows = users.map((u) => {
      const tier = u.subscription?.tier || "FREE";
      const status = u.subscription?.status || "active";
      return [
        u.email,
        tier,
        status,
        u._count.projects,
        u._count.exports,
        u.emailVerified,
        u.createdAt.toISOString().split("T")[0],
        u.referralCode || "",
        u.referredBy || "",
      ].join(",");
    });

    const csv = [header, ...rows].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="users-export-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    logger.error({ error }, "Failed to export users CSV");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
