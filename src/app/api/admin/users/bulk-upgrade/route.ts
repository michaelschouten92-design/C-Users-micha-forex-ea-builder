import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { invalidateSubscriptionCache } from "@/lib/plan-limits";
import { checkAdmin } from "@/lib/admin";
import { audit } from "@/lib/audit";
import { checkContentType, safeReadJson } from "@/lib/validations";
import {
  adminBulkRateLimiter,
  checkRateLimit,
  formatRateLimitError,
  createRateLimitHeaders,
} from "@/lib/rate-limit";

const bulkUpgradeSchema = z.object({
  emails: z.array(z.string().email()).min(1).max(500),
  tier: z.enum(["FREE", "PRO", "ELITE"]),
});

// POST /api/admin/users/bulk-upgrade - Bulk change tier for multiple users
export async function POST(request: Request) {
  try {
    const adminCheck = await checkAdmin();
    if (!adminCheck.authorized) return adminCheck.response;

    const contentTypeError = checkContentType(request);
    if (contentTypeError) return contentTypeError;

    const result = await safeReadJson(request);
    if ("error" in result) return result.error;
    const body = result.data;

    const rl = await checkRateLimit(
      adminBulkRateLimiter,
      `admin-bulk:${adminCheck.session.user.id}`
    );
    if (!rl.success) {
      return NextResponse.json(
        { error: formatRateLimitError(rl) },
        { status: 429, headers: createRateLimitHeaders(rl) }
      );
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

    // Process in chunks, batch-fetching users to avoid N+1 queries
    const CHUNK_SIZE = 50;
    for (let i = 0; i < emails.length; i += CHUNK_SIZE) {
      const chunk = emails.slice(i, i + CHUNK_SIZE);

      // Batch fetch all users in this chunk at once
      const users = await prisma.user.findMany({
        where: { email: { in: chunk } },
        select: { id: true, email: true, subscription: { select: { tier: true } } },
      });

      const userMap = new Map(users.map((u) => [u.email, u]));

      // Mark emails not found in DB as failed
      for (const email of chunk) {
        if (!userMap.has(email)) {
          failed.push(email);
        }
      }

      // Update found users in parallel
      const results = await Promise.allSettled(
        users.map(async (user) => {
          const previousTier = user.subscription?.tier ?? "FREE";

          await prisma.subscription.upsert({
            where: { userId: user.id },
            create: { userId: user.id, tier, status: "active" },
            update: { tier, status: "active" },
          });

          invalidateSubscriptionCache(user.id);

          // Audit the tier change (fire-and-forget)
          const tierOrder = ["FREE", "PRO", "ELITE"];
          const auditFn =
            tierOrder.indexOf(tier) > tierOrder.indexOf(previousTier)
              ? audit.subscriptionUpgrade
              : audit.subscriptionDowngrade;
          auditFn(user.id, previousTier, tier).catch(() => {});

          updated++;
        })
      );

      // Collect failures from rejected promises
      for (let j = 0; j < results.length; j++) {
        if (results[j].status === "rejected") {
          failed.push(users[j].email);
        }
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
