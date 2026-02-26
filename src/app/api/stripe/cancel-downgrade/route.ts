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

export async function POST() {
  const session = await auth();
  const log = createApiLogger("/api/stripe/cancel-downgrade", "POST", session?.user?.id);

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

    if (!subscription?.stripeScheduleId || !subscription.scheduledDowngradeTier) {
      return NextResponse.json({ error: "No pending downgrade to cancel" }, { status: 400 });
    }

    // Release the Stripe Subscription Schedule — reverts to normal subscription
    await getStripe().subscriptionSchedules.release(subscription.stripeScheduleId);

    // Clear tracking fields in DB
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        scheduledDowngradeTier: null,
        stripeScheduleId: null,
      },
    });

    invalidateSubscriptionCache(session.user.id);

    log.info(
      {
        scheduledTier: subscription.scheduledDowngradeTier,
        scheduleId: subscription.stripeScheduleId,
      },
      "Pending downgrade cancelled — schedule released"
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    const details = extractErrorDetails(error);
    log.error({ error: details }, "Cancel downgrade error");
    return NextResponse.json({ error: "Failed to cancel downgrade" }, { status: 500 });
  }
}
