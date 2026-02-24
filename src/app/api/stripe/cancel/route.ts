import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { createApiLogger, extractErrorDetails } from "@/lib/logger";
import {
  apiRateLimiter,
  checkRateLimit,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";

export async function POST() {
  const session = await auth();
  const log = createApiLogger("/api/stripe/cancel", "POST", session?.user?.id);

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

  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    });

    if (!subscription?.stripeSubId) {
      return NextResponse.json({ error: "No active subscription to cancel" }, { status: 400 });
    }

    const isActive = subscription.status === "active" || subscription.status === "trialing";
    if (!isActive) {
      return NextResponse.json({ error: "Your subscription is not active" }, { status: 400 });
    }

    // Set cancel_at_period_end so the user keeps access until billing period ends
    const updatedSub = await getStripe().subscriptions.update(subscription.stripeSubId, {
      cancel_at_period_end: true,
    });

    const subRaw = updatedSub as unknown as Record<string, unknown>;
    const periodEndRaw = subRaw.current_period_end as number | undefined;
    const periodEnd = periodEndRaw ? new Date(periodEndRaw * 1000).toISOString() : null;

    log.info({ tier: subscription.tier, periodEnd }, "Subscription set to cancel at period end");

    // Stripe will fire customer.subscription.deleted at period end, which handles:
    // - DB tier reset to FREE
    // - Email notification
    // - Discord role sync
    // - Audit logging

    return NextResponse.json({ success: true, periodEnd });
  } catch (error) {
    const details = extractErrorDetails(error);
    log.error({ error: details }, "Cancel subscription error");
    return NextResponse.json({ error: "Failed to cancel subscription" }, { status: 500 });
  }
}
