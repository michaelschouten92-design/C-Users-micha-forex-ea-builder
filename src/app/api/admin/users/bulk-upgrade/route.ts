import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { invalidateSubscriptionCache } from "@/lib/plan-limits";
import { checkAdmin } from "@/lib/admin";

const bulkUpgradeSchema = z.object({
  emails: z.array(z.string().email()).min(1).max(500),
  tier: z.enum(["FREE", "PRO", "ELITE"]),
});

// POST /api/admin/users/bulk-upgrade - Bulk change tier for multiple users
export async function POST(request: Request) {
  try {
    const adminCheck = await checkAdmin();
    if (!adminCheck.authorized) return adminCheck.response;

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(apiError(ErrorCode.INVALID_JSON, "Invalid JSON body"), {
        status: 400,
      });
    }

    const validation = bulkUpgradeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        apiError(
          ErrorCode.VALIDATION_FAILED,
          "Validation failed",
          validation.error.errors.map((e) => e.message)
        ),
        { status: 400 }
      );
    }

    const { emails, tier } = validation.data;
    let updated = 0;
    const failed: string[] = [];

    for (const email of emails) {
      try {
        const user = await prisma.user.findUnique({
          where: { email },
          select: { id: true },
        });

        if (!user) {
          failed.push(email);
          continue;
        }

        await prisma.subscription.upsert({
          where: { userId: user.id },
          create: { userId: user.id, tier, status: "active" },
          update: { tier, status: "active" },
        });

        invalidateSubscriptionCache(user.id);
        updated++;
      } catch {
        failed.push(email);
      }
    }

    return NextResponse.json({ success: true, updated, failed });
  } catch (error) {
    logger.error({ error }, "Failed to bulk upgrade users");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
