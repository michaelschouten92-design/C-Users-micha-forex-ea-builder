import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { createApiLogger, extractErrorDetails } from "@/lib/logger";
import { invalidateSubscriptionCache } from "@/lib/plan-limits";
import {
  apiRateLimiter,
  checkRateLimit,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";

/**
 * Reactivate a subscription that's scheduled to cancel at period end.
 * Clears cancel_at_period_end on the Stripe subscription so it keeps renewing.
 */
export async function POST() {
  const session = await auth();
  const log = createApiLogger("/api/stripe/reactivate", "POST", session?.user?.id);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.suspended) {
    return NextResponse.json(
      { error: "Account suspended", code: "ACCOUNT_SUSPENDED" },
      { status: 403 }
    );
  }

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
      return NextResponse.json({ error: "No subscription to reactivate" }, { status: 400 });
    }

    if (!subscription.cancelAtPeriodEnd) {
      return NextResponse.json(
        { error: "Subscription is not scheduled for cancellation" },
        { status: 400 }
      );
    }

    const isActive = subscription.status === "active" || subscription.status === "trialing";
    if (!isActive) {
      return NextResponse.json(
        { error: "Cannot reactivate an inactive subscription — please resubscribe." },
        { status: 400 }
      );
    }

    await getStripe().subscriptions.update(subscription.stripeSubId, {
      cancel_at_period_end: false,
    });

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { cancelAtPeriodEnd: null },
    });

    invalidateSubscriptionCache(session.user.id);

    log.info({ tier: subscription.tier }, "Subscription reactivated");

    return NextResponse.json({ success: true });
  } catch (error) {
    const details = extractErrorDetails(error);
    log.error({ error: details }, "Reactivate subscription error");
    return NextResponse.json({ error: "Failed to reactivate subscription" }, { status: 500 });
  }
}
