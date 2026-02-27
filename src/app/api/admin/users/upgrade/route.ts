import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { invalidateSubscriptionCache } from "@/lib/plan-limits";
import { audit } from "@/lib/audit";
import { checkAdmin } from "@/lib/admin";
import { syncDiscordRoleForUser } from "@/lib/discord";
import { logSubscriptionTransition } from "@/lib/subscription/transitions";
import { checkContentType, safeReadJson } from "@/lib/validations";
import { features } from "@/lib/env";
import {
  adminMutationRateLimiter,
  checkRateLimit,
  formatRateLimitError,
  createRateLimitHeaders,
} from "@/lib/rate-limit";

const upgradeSchema = z.object({
  email: z.string().email(),
  tier: z.enum(["FREE", "PRO", "ELITE"]),
});

// POST /api/admin/users/upgrade - Upgrade/downgrade a user's tier (admin only)
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
      adminMutationRateLimiter,
      `admin-mut:${adminCheck.session.user.id}`
    );
    if (!rl.success) {
      return NextResponse.json(
        { error: formatRateLimitError(rl) },
        { status: 429, headers: createRateLimitHeaders(rl) }
      );
    }

    const validation = upgradeSchema.safeParse(body);
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

    const { email, tier } = validation.data;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: { subscription: true },
    });

    if (!user) {
      return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "User not found"), { status: 404 });
    }

    const previousTier = user.subscription?.tier ?? "FREE";
    const existingStripeSubId = user.subscription?.stripeSubId;
    const existingStripeCustomerId = user.subscription?.stripeCustomerId;

    // Cancel existing Stripe subscription before clearing (prevents orphaned billing)
    if (existingStripeSubId && features.stripe) {
      try {
        const { getStripe } = await import("@/lib/stripe");
        await getStripe().subscriptions.cancel(existingStripeSubId);
        logger.info(
          { stripeSubId: existingStripeSubId, email },
          "Cancelled Stripe subscription before admin tier change"
        );
      } catch (err) {
        logger.warn(
          { err, stripeSubId: existingStripeSubId },
          "Failed to cancel Stripe subscription (may already be cancelled)"
        );
      }
    }

    // Upsert subscription: set tier, status active, clear Stripe sub but preserve customerId
    await prisma.subscription.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        tier,
        status: "active",
      },
      update: {
        tier,
        status: "active",
        stripeCustomerId: existingStripeCustomerId ?? null, // Preserve customer relationship
        stripeSubId: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
      },
    });

    // Invalidate subscription cache so new limits take effect immediately
    invalidateSubscriptionCache(user.id);

    // Sync Discord role (fire-and-forget)
    syncDiscordRoleForUser(user.id, tier).catch((err) =>
      logger.warn({ err }, "Discord role sync failed after manual tier change")
    );

    // Log audit event
    const isUpgrade =
      (previousTier === "FREE" && tier !== "FREE") || (previousTier === "PRO" && tier === "ELITE");

    const previousStatus = user.subscription?.status ?? "active";
    logSubscriptionTransition(
      user.id,
      { status: previousStatus, tier: previousTier as "FREE" | "PRO" | "ELITE" },
      { status: "active", tier },
      isUpgrade ? "admin_upgrade" : "admin_downgrade"
    );

    if (isUpgrade) {
      await audit.subscriptionUpgrade(user.id, previousTier, tier);
    } else {
      await audit.subscriptionDowngrade(user.id, previousTier, tier);
    }

    return NextResponse.json({ success: true, email, tier });
  } catch (error) {
    logger.error({ error }, "Failed to upgrade user (admin)");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
