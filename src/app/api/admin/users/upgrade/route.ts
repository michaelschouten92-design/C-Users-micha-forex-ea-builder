import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { invalidateSubscriptionCache } from "@/lib/plan-limits";
import { audit } from "@/lib/audit";

const upgradeSchema = z.object({
  email: z.string().email(),
  tier: z.enum(["FREE", "PRO", "ELITE"]),
});

// POST /api/admin/users/upgrade - Upgrade/downgrade a user's tier (admin only)
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
    }

    if (session.user.email !== process.env.ADMIN_EMAIL) {
      return NextResponse.json(apiError(ErrorCode.FORBIDDEN, "Access denied"), { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(apiError(ErrorCode.INVALID_JSON, "Invalid JSON body"), {
        status: 400,
      });
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

    // Upsert subscription: set tier, status active, clear Stripe fields (manual grant)
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
        stripeCustomerId: null,
        stripeSubId: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
      },
    });

    // Invalidate subscription cache so new limits take effect immediately
    invalidateSubscriptionCache(user.id);

    // Log audit event
    const isUpgrade =
      (previousTier === "FREE" && tier !== "FREE") || (previousTier === "PRO" && tier === "ELITE");

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
