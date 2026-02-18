import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { checkAdmin } from "@/lib/admin";

const BATCH_SIZE = 1000;

const USER_SELECT = {
  id: true,
  email: true,
  emailVerified: true,
  createdAt: true,
  lastLoginAt: true,
  referralCode: true,
  referredBy: true,
  subscription: { select: { tier: true, status: true } },
  _count: {
    select: {
      projects: { where: { deletedAt: null } },
      exports: true,
    },
  },
} as const;

// Escape CSV fields to prevent formula injection (=, +, -, @, tab, CR)
function escapeCsv(value: unknown): string {
  const str = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(str) || str.includes(",") || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function userToCsvRow(
  u: Awaited<ReturnType<typeof prisma.user.findMany<{ select: typeof USER_SELECT }>>>[number]
): string {
  const tier = u.subscription?.tier || "FREE";
  const status = u.subscription?.status || "active";
  return [
    escapeCsv(u.email),
    escapeCsv(tier),
    escapeCsv(status),
    u._count.projects,
    u._count.exports,
    u.emailVerified,
    u.createdAt.toISOString().split("T")[0],
    u.lastLoginAt ? u.lastLoginAt.toISOString().split("T")[0] : "Never",
    escapeCsv(u.referralCode || ""),
    escapeCsv(u.referredBy || ""),
  ].join(",");
}

// GET /api/admin/users/export-csv - Export all users as streaming CSV
export async function GET() {
  try {
    const adminCheck = await checkAdmin();
    if (!adminCheck.authorized) return adminCheck.response;

    const encoder = new TextEncoder();
    const header =
      "Email,Tier,Status,Projects,Exports,Verified,Joined,LastLogin,ReferralCode,ReferredBy";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(encoder.encode(header + "\n"));

          let cursor: string | undefined;
          while (true) {
            const batch = await prisma.user.findMany({
              orderBy: { createdAt: "desc" },
              take: BATCH_SIZE,
              ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
              select: USER_SELECT,
            });

            if (batch.length === 0) break;

            for (const user of batch) {
              controller.enqueue(encoder.encode(userToCsvRow(user) + "\n"));
            }

            cursor = batch[batch.length - 1].id;
            if (batch.length < BATCH_SIZE) break;
          }

          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
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
