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
import type { PlanTier, SubscriptionStatus } from "@prisma/client";
import type Stripe from "stripe";

const log = logger.child({ route: "/api/cron/reconcile-subscriptions" });

const PRICE_TO_TIER: Record<string, "PRO" | "ELITE" | "INSTITUTIONAL"> = {};

/**
 * Stripe statuses we know how to map. Used as an allow-list before calling
 * `mapStripeStatus`, which fail-closes to "unpaid" on unknown values.
 * Without the allow-list a future Stripe-API addition would silently
 * downgrade every affected subscription on the next cron run.
 */
const STRIPE_STATUS_KNOWN = new Set([
  "active",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "past_due",
  "paused",
  "trialing",
  "unpaid",
]);

function buildPriceTierMap() {
  if (Object.keys(PRICE_TO_TIER).length > 0) return;
  const ids = [
    [process.env.STRIPE_PRO_MONTHLY_PRICE_ID, "PRO"],
    [process.env.STRIPE_ELITE_MONTHLY_PRICE_ID, "ELITE"],
    [process.env.STRIPE_INSTITUTIONAL_MONTHLY_PRICE_ID, "INSTITUTIONAL"],
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
    let hitRateLimit = false;

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

          // Compare status. mapStripeStatus fails closed to "unpaid" on
          // unknown values — if Stripe ever introduces a new status the
          // cron must NOT mass-downgrade everyone via that fallback.
          // Skip the row entirely so a human can investigate the unknown
          // value before we touch user state.
          if (!STRIPE_STATUS_KNOWN.has(stripeSub.status)) {
            log.warn(
              { userId: sub.userId, stripeStatus: stripeSub.status },
              "Reconcile: unknown Stripe status, skipping row"
            );
            return { mismatch: false };
          }
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
          // Period dates are second-resolution Unix timestamps from Stripe;
          // when they differ, sync exactly. Any non-zero drift is real
          // (missed webhook, manual edit) and would otherwise expire-detect
          // a day late. The previous 60s threshold masked legitimate drift
          // that resolveTier needs to know about right now.
          if (startRaw) {
            const expectedStart = new Date(startRaw * 1000);
            if (
              !sub.currentPeriodStart ||
              sub.currentPeriodStart.getTime() !== expectedStart.getTime()
            ) {
              updates.currentPeriodStart = expectedStart;
            }
          }
          if (endRaw) {
            const expectedEnd = new Date(endRaw * 1000);
            if (!sub.currentPeriodEnd || sub.currentPeriodEnd.getTime() !== expectedEnd.getTime()) {
              updates.currentPeriodEnd = expectedEnd;
            }
          }

          if (Object.keys(updates).length > 0) {
            log.warn(
              { userId: sub.userId, stripeSubId: sub.stripeSubId, updates },
              "Reconciliation mismatch — updating DB"
            );
            // Use the full PlanTier union, NOT a hardcoded subset — the
            // previous "PRO" | "ELITE" cast silently discarded INSTITUTIONAL
            // updates and made it impossible for the reconcile cron to ever
            // restore a missed-webhook INSTITUTIONAL upgrade.
            const toState: { status?: SubscriptionStatus; tier?: PlanTier } = {};
            if (updates.status) toState.status = updates.status as SubscriptionStatus;
            if (updates.tier) toState.tier = updates.tier as PlanTier;
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

    // -----------------------------------------------------------------
    // Orphaned cancelled subscriptions: rows flagged cancelled in the DB
    // but still pointing at a Stripe sub ID that never got cleaned up.
    // Verify they're really gone in Stripe and clear the pointers so the
    // DB doesn't keep stale references.
    // -----------------------------------------------------------------
    let orphansChecked = 0;
    let orphansCleared = 0;

    if (!isTimedOut() && !hitRateLimit) {
      // Cancelled subs that still carry a Stripe sub ID are suspicious —
      // the normal cancelled flow clears stripeSubId. If it lingers, verify
      // and clean up.
      const orphans = await prisma.subscription.findMany({
        where: {
          stripeSubId: { not: null },
          status: "cancelled",
        },
        select: { id: true, userId: true, stripeSubId: true },
        take: 20,
      });

      for (const orphan of orphans) {
        if (isTimedOut() || hitRateLimit) break;
        orphansChecked++;
        try {
          const stripeSub = await getStripe().subscriptions.retrieve(orphan.stripeSubId!);
          if (stripeSub.status === "canceled") {
            await prisma.subscription.update({
              where: { id: orphan.id },
              data: { stripeSubId: null, stripeScheduleId: null },
            });
            orphansCleared++;
          }
        } catch (err) {
          const stripeErr = err as { statusCode?: number };
          if (stripeErr.statusCode === 404) {
            // Subscription no longer exists in Stripe — clear pointer
            await prisma.subscription.update({
              where: { id: orphan.id },
              data: { stripeSubId: null, stripeScheduleId: null },
            });
            orphansCleared++;
          } else if (stripeErr.statusCode === 429) {
            hitRateLimit = true;
            log.warn("Stripe 429 during orphan check — stopping");
          } else {
            log.warn({ err, orphanId: orphan.id }, "Orphan check failed");
          }
        }
      }
    }

    // -----------------------------------------------------------------
    // Periodic customer existence check for a small sample of active
    // subscriptions — catches customer.deleted events we may have missed.
    // -----------------------------------------------------------------
    let customersChecked = 0;
    let customersCleared = 0;

    if (!isTimedOut() && !hitRateLimit) {
      const sample = await prisma.subscription.findMany({
        where: {
          stripeCustomerId: { not: null },
          status: { in: ["active", "trialing"] },
        },
        select: { id: true, userId: true, stripeCustomerId: true, tier: true, status: true },
        orderBy: { id: "asc" },
        take: 10,
      });

      for (const sub of sample) {
        if (isTimedOut() || hitRateLimit) break;
        customersChecked++;
        try {
          const customer = await getStripe().customers.retrieve(sub.stripeCustomerId!);
          if ((customer as { deleted?: boolean }).deleted) {
            await transitionSubscription(
              prisma,
              sub.userId,
              { status: sub.status, tier: sub.tier },
              { status: "cancelled", tier: "FREE" },
              "reconcile_customer_deleted",
              {
                stripeCustomerId: null,
                stripeSubId: null,
                stripeScheduleId: null,
                scheduledDowngradeTier: null,
                cancelAtPeriodEnd: null,
              }
            );
            invalidateSubscriptionCache(sub.userId);
            customersCleared++;
          }
        } catch (err) {
          const stripeErr = err as { statusCode?: number };
          if (stripeErr.statusCode === 404) {
            await transitionSubscription(
              prisma,
              sub.userId,
              { status: sub.status, tier: sub.tier },
              { status: "cancelled", tier: "FREE" },
              "reconcile_customer_missing",
              {
                stripeCustomerId: null,
                stripeSubId: null,
                stripeScheduleId: null,
                scheduledDowngradeTier: null,
                cancelAtPeriodEnd: null,
              }
            );
            invalidateSubscriptionCache(sub.userId);
            customersCleared++;
          } else if (stripeErr.statusCode === 429) {
            hitRateLimit = true;
            log.warn("Stripe 429 during customer check — stopping");
          } else {
            log.warn({ err, subId: sub.id }, "Customer existence check failed");
          }
        }
      }
    }

    const timedOut = isTimedOut();

    log.info(
      {
        checked,
        mismatches,
        errors,
        orphansChecked,
        orphansCleared,
        customersChecked,
        customersCleared,
        timedOut,
        hitRateLimit,
        durationMs: Date.now() - cronStartTime,
      },
      "Reconciliation completed"
    );

    return NextResponse.json({
      success: true,
      checked,
      mismatches,
      errors,
      orphansChecked,
      orphansCleared,
      customersChecked,
      customersCleared,
      timedOut,
      hitRateLimit,
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
