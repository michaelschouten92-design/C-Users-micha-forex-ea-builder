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
import {
  invalidateSubscriptionCache,
  getMonitoredTradingAccountUsage,
  checkDowngradeImpact,
} from "@/lib/plan-limits";
import { getMaxMonitoredAccounts, getTierDisplayName, TIER_ORDER } from "@/lib/plans";

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

    // Email verification is required for plan changes (consistency with checkout)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { emailVerified: true },
    });
    if (!user?.emailVerified) {
      return NextResponse.json(
        { error: "Please verify your email before changing plans" },
        { status: 403 }
      );
    }

    // Get user subscription
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    });

    if (!subscription?.stripeSubId) {
      return NextResponse.json({ error: "No active subscription to change" }, { status: 400 });
    }

    const currentTier = subscription.tier as keyof typeof TIER_ORDER;

    // Block plan changes on past_due subscriptions — user must resolve the outstanding
    // invoice via the billing portal first, otherwise they'd be gaming the system by
    // "upgrading" while delinquent.
    if (subscription.status === "past_due") {
      return NextResponse.json(
        {
          error:
            "Your last payment failed. Please update your payment method and settle the outstanding invoice before changing plans.",
          code: "PAYMENT_PAST_DUE",
        },
        { status: 400 }
      );
    }

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

    const isDowngrade = TIER_ORDER[plan] < TIER_ORDER[currentTier];

    if (isDowngrade) {
      // --- DOWNGRADE: Schedule tier change at period end via Subscription Schedules ---

      // Block downgrade if user exceeds the target plan's account limit
      const accountUsage = await getMonitoredTradingAccountUsage(session.user.id);
      const newMaxAccounts = getMaxMonitoredAccounts(plan);
      if (accountUsage > newMaxAccounts) {
        return NextResponse.json(
          {
            error: `You currently have ${accountUsage} monitored trading account${accountUsage !== 1 ? "s" : ""}. The ${getTierDisplayName(plan)} plan allows ${newMaxAccounts}. Please remove ${accountUsage - newMaxAccounts} account${accountUsage - newMaxAccounts !== 1 ? "s" : ""} before downgrading.`,
            code: "ACCOUNT_LIMIT_EXCEEDED",
          },
          { status: 400 }
        );
      }

      // Check for existing pending downgrade
      if (subscription.scheduledDowngradeTier === plan) {
        return NextResponse.json(
          { error: `A downgrade to ${PLANS[plan].name} is already scheduled` },
          { status: 400 }
        );
      }

      // If there's a pending downgrade to a different tier, release it first
      if (subscription.stripeScheduleId) {
        await getStripe().subscriptionSchedules.release(subscription.stripeScheduleId);
      }

      // Get current period timestamps from the Stripe subscription
      const subRaw = stripeSub as unknown as Record<string, unknown>;
      const periodStart = subRaw.current_period_start as number;
      const periodEnd = subRaw.current_period_end as number;

      // Safety: refuse to schedule a downgrade if the period has already ended
      // (webhook delay / stale Stripe data) — otherwise we'd create a schedule
      // with invalid phase dates.
      if (!periodEnd || periodEnd * 1000 <= Date.now()) {
        return NextResponse.json(
          {
            error:
              "Your subscription period has ended or is invalid. Please refresh and try again.",
          },
          { status: 400 }
        );
      }

      // Compute advisory warnings for features that will become unavailable.
      // Monitored accounts are enforced as a blocking check above; these are
      // informational for the user (returned alongside scheduled=true).
      const downgradeWarnings = await checkDowngradeImpact(session.user.id, plan);

      // Create a Subscription Schedule from the existing subscription
      // Wrapped in try-catch to rollback Stripe schedule if DB update fails
      let scheduleId: string | null = null;
      try {
        const schedule = await getStripe().subscriptionSchedules.create({
          from_subscription: subscription.stripeSubId,
        });
        scheduleId = schedule.id;

        // Determine the billing interval from the current subscription item
        const currentPrice = currentItem.price;
        const billingInterval = currentPrice.recurring?.interval ?? "month";
        const billingIntervalCount = currentPrice.recurring?.interval_count ?? 1;

        // Update the schedule with two phases:
        // Phase 1: current tier until period end
        // Phase 2: new (downgraded) tier for one billing cycle, then release
        await getStripe().subscriptionSchedules.update(schedule.id, {
          end_behavior: "release",
          phases: [
            {
              items: [{ price: currentItem.price.id, quantity: 1 }],
              start_date: periodStart,
              end_date: periodEnd,
            },
            {
              items: [{ price: newPriceId, quantity: 1 }],
              duration: {
                interval: billingInterval as "day" | "week" | "month" | "year",
                interval_count: billingIntervalCount,
              },
            },
          ],
        });

        // Store the schedule in our DB
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            scheduledDowngradeTier: plan,
            stripeScheduleId: schedule.id,
          },
        });
      } catch (scheduleErr) {
        // Rollback: release the Stripe schedule if it was created but DB update failed
        if (scheduleId) {
          await getStripe()
            .subscriptionSchedules.release(scheduleId)
            .catch((releaseErr) => {
              log.error(
                { err: releaseErr, scheduleId },
                "Failed to rollback Stripe schedule after DB error"
              );
            });
        }
        throw scheduleErr;
      }

      invalidateSubscriptionCache(session.user.id);

      const effectiveDate = new Date(periodEnd * 1000).toISOString();

      log.info(
        { from: currentTier, to: plan, interval, scheduleId, effectiveDate },
        "Downgrade scheduled at period end via Subscription Schedule"
      );

      return NextResponse.json({
        success: true,
        scheduled: true,
        effectiveDate,
        warnings: downgradeWarnings,
      });
    } else {
      // --- UPGRADE: Immediate plan switch with prorations ---

      // Idempotency key with 1-minute window to prevent duplicate prorations on
      // double-click while still allowing retries after a failed attempt.
      const timeWindow = Math.floor(Date.now() / (60 * 1000));
      const idempotencyKey = `plan-change_${session.user.id}_${plan}_${interval}_${timeWindow}`;

      // If a pending downgrade schedule exists, release it first
      if (subscription.stripeScheduleId) {
        try {
          await getStripe().subscriptionSchedules.release(subscription.stripeScheduleId);
        } catch (scheduleErr) {
          // Schedule may already be released or expired — safe to continue
          log.warn(
            { err: scheduleErr, scheduleId: subscription.stripeScheduleId },
            "Schedule release failed (may already be released)"
          );
        }
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            scheduledDowngradeTier: null,
            stripeScheduleId: null,
          },
        });

        // After releasing the schedule, re-retrieve the subscription
        // since the schedule release may have modified it
        const freshSub = await getStripe().subscriptions.retrieve(subscription.stripeSubId);
        const freshItem = freshSub.items.data[0];
        if (!freshItem) {
          return NextResponse.json({ error: "Unable to find subscription item" }, { status: 500 });
        }

        await getStripe().subscriptions.update(
          subscription.stripeSubId,
          {
            items: [{ id: freshItem.id, price: newPriceId }],
            proration_behavior: "create_prorations",
          },
          { idempotencyKey }
        );
      } else {
        await getStripe().subscriptions.update(
          subscription.stripeSubId,
          {
            items: [{ id: currentItem.id, price: newPriceId }],
            proration_behavior: "create_prorations",
          },
          { idempotencyKey }
        );
      }

      invalidateSubscriptionCache(session.user.id);

      log.info(
        { from: currentTier, to: plan, interval, isDowngrade: false },
        "Plan upgraded via Stripe subscription update"
      );

      // Stripe will fire customer.subscription.updated webhook which handles:
      // - DB tier update
      // - Email notification
      // - Discord role sync
      // - Audit logging

      return NextResponse.json({ success: true });
    }
  } catch (error) {
    const details = extractErrorDetails(error);
    log.error({ error: details }, "Change plan error");
    return NextResponse.json({ error: "Failed to change plan" }, { status: 500 });
  }
}
