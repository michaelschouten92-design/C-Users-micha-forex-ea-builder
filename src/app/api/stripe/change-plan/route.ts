import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { PLANS } from "@/lib/plans";
import {
  checkoutRequestSchema,
  formatZodErrors,
  safeReadJson,
  checkContentType,
} from "@/lib/validations";
import { createApiLogger, extractErrorDetails } from "@/lib/logger";
import {
  apiRateLimiter,
  checkRateLimit,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";

const tierOrder = { FREE: 0, PRO: 1, ELITE: 2 } as const;

export async function POST(request: NextRequest) {
  const session = await auth();
  const log = createApiLogger("/api/stripe/change-plan", "POST", session?.user?.id);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.suspended) {
    return NextResponse.json(
      { error: "Account suspended", code: "ACCOUNT_SUSPENDED" },
      { status: 403 }
    );
  }

  // Rate limit
  const rateLimitResult = await checkRateLimit(apiRateLimiter, session.user.id);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: formatRateLimitError(rateLimitResult) },
      { status: 429, headers: createRateLimitHeaders(rateLimitResult) }
    );
  }

  // Validate request
  const contentTypeError = checkContentType(request);
  if (contentTypeError) return contentTypeError;

  const result = await safeReadJson(request);
  if ("error" in result) return result.error;
  const body = result.data;

  try {
    const validation = checkoutRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: formatZodErrors(validation.error) },
        { status: 400 }
      );
    }

    const { plan, interval } = validation.data;

    const planConfig = PLANS[plan];
    if (!planConfig.prices) {
      return NextResponse.json(
        { error: "This plan is not available for purchase" },
        { status: 400 }
      );
    }

    const newPriceId = planConfig.prices[interval].priceId;
    if (!newPriceId) {
      return NextResponse.json({ error: "Price not configured" }, { status: 500 });
    }

    // Get user subscription
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    });

    if (!subscription?.stripeSubId) {
      return NextResponse.json({ error: "No active subscription to change" }, { status: 400 });
    }

    const currentTier = subscription.tier as keyof typeof tierOrder;
    const isActive = subscription.status === "active" || subscription.status === "trialing";

    if (!isActive) {
      return NextResponse.json({ error: "Your subscription is not active" }, { status: 400 });
    }

    if (currentTier === plan) {
      return NextResponse.json(
        { error: `You are already on the ${PLANS[plan].name} plan` },
        { status: 400 }
      );
    }

    // Retrieve the current Stripe subscription to get the item ID
    const stripeSub = await getStripe().subscriptions.retrieve(subscription.stripeSubId);
    const currentItem = stripeSub.items.data[0];

    if (!currentItem) {
      return NextResponse.json({ error: "Unable to find subscription item" }, { status: 500 });
    }

    // Update the subscription with the new price
    const isDowngrade = tierOrder[plan] < tierOrder[currentTier];

    await getStripe().subscriptions.update(subscription.stripeSubId, {
      items: [{ id: currentItem.id, price: newPriceId }],
      proration_behavior: "create_prorations",
    });

    log.info(
      { from: currentTier, to: plan, interval, isDowngrade },
      "Plan changed via Stripe subscription update"
    );

    // Stripe will fire customer.subscription.updated webhook which handles:
    // - DB tier update
    // - Email notification
    // - Discord role sync
    // - Audit logging

    return NextResponse.json({ success: true });
  } catch (error) {
    const details = extractErrorDetails(error);
    log.error({ error: details }, "Change plan error");
    return NextResponse.json({ error: "Failed to change plan" }, { status: 500 });
  }
}
