import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { logger } from "@/lib/logger";
import { timingSafeEqual } from "@/lib/csrf";
import { invalidateSubscriptionCache } from "@/lib/plan-limits";
import {
  mapStripeStatus,
  transitionSubscription,
  logSubscriptionTransition,
} from "@/lib/subscription/transitions";
import type { SubscriptionStatus } from "@prisma/client";
import type Stripe from "stripe";

const log = logger.child({ route: "/api/cron/reconcile-subscriptions" });

const PRICE_TO_TIER: Record<string, "PRO" | "ELITE"> = {};

function buildPriceTierMap() {
  if (Object.keys(PRICE_TO_TIER).length > 0) return;
  const ids = [
    [process.env.STRIPE_PRO_MONTHLY_PRICE_ID, "PRO"],
    [process.env.STRIPE_PRO_YEARLY_PRICE_ID, "PRO"],
    [process.env.STRIPE_ELITE_MONTHLY_PRICE_ID, "ELITE"],
    [process.env.STRIPE_ELITE_YEARLY_PRICE_ID, "ELITE"],
  ] as const;
  for (const [id, tier] of ids) {
    if (id) PRICE_TO_TIER[id] = tier;
  }
}

/**
 * Reconciliation cron — daily check to catch missed webhooks.
 * Compares DB subscription state with Stripe and fixes mismatches.
 */
async function handleReconcile(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    log.error("CRON_SECRET not configured");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  if (!authHeader || !timingSafeEqual(authHeader, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (process.env.VERCEL && !request.headers.get("x-vercel-cron")) {
    log.warn("Cron request missing x-vercel-cron header");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cronStartTime = Date.now();
  const CRON_TIMEOUT_MS = 55_000;

  function isTimedOut(): boolean {
    return Date.now() - cronStartTime > CRON_TIMEOUT_MS;
  }

  try {
    buildPriceTierMap();

    // Fetch all active/trialing/past_due subscriptions with a Stripe sub ID
    const subscriptions = await prisma.subscription.findMany({
      where: {
        stripeSubId: { not: null },
        status: { in: ["active", "trialing", "past_due"] },
      },
      select: {
        id: true,
        userId: true,
        stripeSubId: true,
        tier: true,
        status: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
      },
    });

    let checked = 0;
    let mismatches = 0;
    let errors = 0;

    // Process in batches of 25 (balanced between speed and Stripe rate limits)
    const BATCH_SIZE = 25;
    for (let i = 0; i < subscriptions.length; i += BATCH_SIZE) {
      if (isTimedOut()) break;

      const batch = subscriptions.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (sub) => {
          let stripeSub: Stripe.Subscription;
          try {
            stripeSub = await getStripe().subscriptions.retrieve(sub.stripeSubId!);
          } catch (err) {
            const stripeErr = err as { statusCode?: number };
            // Stripe rate limit — stop processing to avoid more 429s
            if (stripeErr.statusCode === 429) {
              throw err;
            }
            // Subscription deleted in Stripe but still active in DB
            if (stripeErr.statusCode === 404) {
              log.warn(
                { userId: sub.userId, stripeSubId: sub.stripeSubId },
                "Stripe subscription not found — marking as cancelled"
              );
              await transitionSubscription(
                prisma,
                sub.userId,
                { status: sub.status, tier: sub.tier },
                { status: "cancelled", tier: "FREE" },
                "reconcile_stripe_missing",
                { stripeSubId: null }
              );
              invalidateSubscriptionCache(sub.userId);
              return { mismatch: true };
            }
            throw err;
          }

          // Compare status
          const expectedStatus = mapStripeStatus(stripeSub.status);
          const priceId = stripeSub.items.data[0]?.price.id;
          const expectedTier = priceId ? PRICE_TO_TIER[priceId] : undefined;

          // Get period dates
          const subRaw = stripeSub as unknown as Record<string, unknown>;
          const item = stripeSub.items.data[0] as unknown as Record<string, unknown> | undefined;
          const startRaw = (item?.current_period_start ?? subRaw.current_period_start) as
            | number
            | undefined;
          const endRaw = (item?.current_period_end ?? subRaw.current_period_end) as
            | number
            | undefined;

          const updates: Record<string, unknown> = {};

          if (sub.status !== expectedStatus) {
            updates.status = expectedStatus;
          }
          if (expectedTier && sub.tier !== expectedTier) {
            updates.tier = expectedTier;
          }
          if (startRaw) {
            const expectedStart = new Date(startRaw * 1000);
            if (
              !sub.currentPeriodStart ||
              Math.abs(sub.currentPeriodStart.getTime() - expectedStart.getTime()) > 60000
            ) {
              updates.currentPeriodStart = expectedStart;
            }
          }
          if (endRaw) {
            const expectedEnd = new Date(endRaw * 1000);
            if (
              !sub.currentPeriodEnd ||
              Math.abs(sub.currentPeriodEnd.getTime() - expectedEnd.getTime()) > 60000
            ) {
              updates.currentPeriodEnd = expectedEnd;
            }
          }

          if (Object.keys(updates).length > 0) {
            log.warn(
              { userId: sub.userId, stripeSubId: sub.stripeSubId, updates },
              "Reconciliation mismatch — updating DB"
            );
            const toState: { status?: SubscriptionStatus; tier?: "PRO" | "ELITE" } = {};
            if (updates.status) toState.status = updates.status as SubscriptionStatus;
            if (updates.tier) toState.tier = updates.tier as "PRO" | "ELITE";
            const { status: _s, tier: _t, ...periodUpdates } = updates;
            await transitionSubscription(
              prisma,
              sub.userId,
              { status: sub.status, tier: sub.tier },
              toState,
              "reconcile_stripe_drift",
              periodUpdates
            );
            invalidateSubscriptionCache(sub.userId);
            return { mismatch: true };
          }

          return { mismatch: false };
        })
      );

      let hitRateLimit = false;
      for (const result of results) {
        checked++;
        if (result.status === "fulfilled" && result.value.mismatch) {
          mismatches++;
        } else if (result.status === "rejected") {
          const reason = result.reason as { statusCode?: number };
          if (reason?.statusCode === 429) {
            hitRateLimit = true;
            log.warn("Stripe 429 rate limit hit — stopping reconciliation early");
          } else {
            errors++;
            log.error({ err: result.reason }, "Reconciliation check failed for subscription");
          }
        }
      }
      if (hitRateLimit) break;
    }

    const timedOut = isTimedOut();

    log.info(
      { checked, mismatches, errors, timedOut, durationMs: Date.now() - cronStartTime },
      "Reconciliation completed"
    );

    return NextResponse.json({
      success: true,
      checked,
      mismatches,
      errors,
      timedOut,
    });
  } catch (error) {
    log.error({ error }, "Reconciliation failed");
    return NextResponse.json({ error: "Reconciliation failed" }, { status: 500 });
  }
}

// Vercel Cron sends GET requests
export async function GET(request: NextRequest) {
  return handleReconcile(request);
}
