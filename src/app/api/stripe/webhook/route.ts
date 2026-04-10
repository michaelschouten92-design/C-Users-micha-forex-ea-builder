import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { Prisma, type PlanTier, type SubscriptionStatus } from "@prisma/client";
import { env } from "@/lib/env";
import { logger, extractErrorDetails } from "@/lib/logger";
import { audit } from "@/lib/audit";
import { invalidateSubscriptionCache } from "@/lib/plan-limits";
import { TIER_ORDER } from "@/lib/plans";
import {
  sendPaymentFailedEmail,
  sendPaymentActionRequiredEmail,
  sendPlanChangeEmail,
  sendTrialEndingEmail,
} from "@/lib/email";
import { syncDiscordRoleForUser } from "@/lib/discord";
import { mapStripeStatus, transitionSubscription } from "@/lib/subscription/transitions";
import type Stripe from "stripe";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

const log = logger.child({ route: "/api/stripe/webhook" });

// CUID format validation for userId from Stripe metadata
const cuidSchema = z.string().cuid();

/** Fire-and-forget Discord role sync with one retry after 2s delay */
function syncDiscordWithRetry(userId: string, tier: string): void {
  syncDiscordRoleForUser(userId, tier).catch(async (err) => {
    log.error({ err, userId, tier }, "Discord sync failed — retrying once");
    await new Promise((r) => setTimeout(r, 2000));
    syncDiscordRoleForUser(userId, tier).catch((err2) => {
      Sentry.captureException(err2, {
        extra: { userId, tier, context: "discord-sync-retry-failed" },
      });
      log.error({ err: err2, userId, tier }, "Discord sync retry also failed");
    });
  });
}

// Helper to safely extract string ID from Stripe expandable fields
function getStringId(field: string | { id: string } | null | undefined): string | null {
  if (!field) return null;
  return typeof field === "string" ? field : field.id;
}

// Helper to get subscription period dates with runtime validation
function getSubscriptionPeriod(subscription: Stripe.Subscription): { start: Date; end: Date } {
  // Try items data first, then subscription level
  const item = subscription.items.data[0];
  const raw = item as unknown as Record<string, unknown> | undefined;
  const subRaw = subscription as unknown as Record<string, unknown>;

  const startRaw = raw?.current_period_start ?? subRaw.current_period_start;
  const endRaw = raw?.current_period_end ?? subRaw.current_period_end;

  if (typeof startRaw !== "number" || typeof endRaw !== "number") {
    log.error(
      { subscriptionId: subscription.id, startRaw, endRaw },
      "Missing period dates on subscription — throwing to let Stripe retry"
    );
    throw new Error(`Missing period dates on subscription ${subscription.id}`);
  }

  return {
    start: new Date(startRaw * 1000),
    end: new Date(endRaw * 1000),
  };
}

// Optional IP allowlist for webhook endpoint (defense-in-depth)
const STRIPE_WEBHOOK_IPS =
  process.env.STRIPE_WEBHOOK_IPS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean) ?? [];

export async function POST(request: NextRequest) {
  // Optional IP allowlist check (only active when STRIPE_WEBHOOK_IPS env var is set)
  if (STRIPE_WEBHOOK_IPS.length > 0) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    if (!ip || !STRIPE_WEBHOOK_IPS.includes(ip)) {
      log.warn({ ip }, "Webhook request from non-allowlisted IP");
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    log.error("Missing stripe-signature header");
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const body = await request.text();

  let event: Stripe.Event;

  if (!env.STRIPE_WEBHOOK_SECRET) {
    log.error("STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 400 });
  }

  try {
    event = getStripe().webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    log.error({ error: extractErrorDetails(err) }, "Webhook signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Idempotency: try to claim this event first (prevents race conditions)
  try {
    await prisma.webhookEvent.create({
      data: { eventId: event.id, type: event.type },
    });
  } catch (err) {
    // Only treat unique constraint violations (P2002) as duplicates
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      log.info({ eventId: event.id }, "Duplicate webhook event, skipping");
      return NextResponse.json({ received: true });
    }
    // Re-throw other errors (DB down, etc.) so Stripe retries
    throw err;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(session);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCancelled(subscription);
        break;
      }

      case "customer.deleted": {
        const customer = event.data.object as Stripe.Customer;
        await handleCustomerDeleted(customer);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      case "invoice.payment_action_required": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentActionRequired(invoice);
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        await handleChargeRefunded(charge);
        break;
      }

      case "customer.subscription.trial_will_end": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleTrialWillEnd(subscription);
        break;
      }

      // NOTE: invoice.upcoming is NOT a real Stripe webhook event — removed.
      // Renewal reminders should be handled by a cron job instead.

      case "customer.subscription.paused": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionPaused(subscription);
        break;
      }

      case "invoice.marked_uncollectible": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoiceUncollectible(invoice);
        break;
      }

      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute;
        log.error(
          { disputeId: dispute.id, chargeId: getStringId(dispute.charge), reason: dispute.reason },
          "Chargeback dispute created — manual review required"
        );
        break;
      }

      case "charge.dispute.closed": {
        const dispute = event.data.object as Stripe.Dispute;
        await handleDisputeClosed(dispute);
        break;
      }

      case "subscription_schedule.completed": {
        const schedule = event.data.object as Stripe.SubscriptionSchedule;
        await handleScheduleCompleted(schedule);
        break;
      }

      case "subscription_schedule.canceled":
      case "subscription_schedule.released": {
        const schedule = event.data.object as Stripe.SubscriptionSchedule;
        await handleScheduleCancelledOrReleased(schedule);
        break;
      }
    }

    log.info({ eventType: event.type, eventId: event.id }, "Webhook processed successfully");
    return NextResponse.json({ received: true });
  } catch (error) {
    // Remove idempotency claim so Stripe can retry this event
    await prisma.webhookEvent.delete({ where: { eventId: event.id } }).catch((deleteErr) => {
      log.error(
        { err: deleteErr, eventId: event.id },
        "Failed to clean up webhook idempotency record"
      );
    });

    log.error(
      { error: extractErrorDetails(error), eventType: event.type },
      "Webhook handler error"
    );
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}

const VALID_PAID_TIERS = ["PRO", "ELITE", "INSTITUTIONAL"] as const;
type PaidTier = (typeof VALID_PAID_TIERS)[number];

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const plan = session.metadata?.plan;

  if (!userId || !plan) {
    log.error({ sessionId: session.id }, "Missing metadata in checkout session — cannot process");
    return;
  }

  // Validate userId format before using in raw SQL
  if (!cuidSchema.safeParse(userId).success) {
    log.error({ sessionId: session.id, userId }, "Invalid userId format in checkout metadata");
    return;
  }

  if (!VALID_PAID_TIERS.includes(plan as PaidTier)) {
    log.error({ sessionId: session.id, plan }, "Invalid plan tier in checkout metadata");
    return;
  }

  const validatedPlan: PaidTier = plan as PaidTier;

  log.info(
    { userId, plan: validatedPlan, sessionId: session.id },
    "Processing checkout completion"
  );

  const subscriptionId = getStringId(session.subscription);
  if (!subscriptionId) {
    log.error({ sessionId: session.id }, "No subscription ID in checkout session");
    return;
  }

  const stripeSubscription = await getStripe().subscriptions.retrieve(subscriptionId);
  const customerId = getStringId(session.customer);
  if (!customerId) {
    log.error({ sessionId: session.id }, "No customer ID in checkout session");
    return;
  }
  const period = getSubscriptionPeriod(stripeSubscription);

  const mappedStatus = mapStripeStatus(stripeSubscription.status);

  // Use transaction with row-level locking to prevent race conditions with concurrent webhooks.
  // FOR UPDATE ensures that if two checkout.session.completed webhooks arrive simultaneously
  // for the same user, the second one blocks until the first commits, preventing double-processing.
  const previousTier = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<
      Array<{ id: string; tier: string; status: string; stripeSubId: string | null }>
    >`
      SELECT id, tier, status, "stripeSubId" FROM "Subscription"
      WHERE "userId" = ${userId}
      FOR UPDATE
    `;

    if (!rows.length) {
      log.error({ userId }, "Subscription not found for user in checkout completion");
      return null;
    }

    // Detect possible duplicate webhook: if the subscription already has this exact stripeSubId,
    // another checkout webhook already processed it while we were waiting on the lock.
    if (rows[0].stripeSubId === subscriptionId) {
      log.warn(
        { userId, subscriptionId, existingTier: rows[0].tier },
        "Duplicate checkout webhook detected — subscription already has this stripeSubId, skipping"
      );
      return rows[0].tier;
    }

    const prev = rows[0].tier;

    await transitionSubscription(
      tx,
      userId,
      { status: rows[0].status as SubscriptionStatus, tier: rows[0].tier as PlanTier },
      { status: mappedStatus, tier: validatedPlan },
      "stripe_checkout_complete",
      {
        stripeSubId: subscriptionId,
        stripeCustomerId: customerId,
        currentPeriodStart: period.start,
        currentPeriodEnd: period.end,
        hadPaidPlan: true,
      }
    );

    return prev;
  });

  invalidateSubscriptionCache(userId);

  // Send welcome/confirmation email (best-effort — must not fail the webhook)
  if (previousTier !== null) {
    prisma.user
      .findUnique({ where: { id: userId }, select: { email: true } })
      .then((user) => {
        if (user?.email) {
          const settingsUrl = `${env.AUTH_URL || "https://algo-studio.com"}/app`;
          sendPlanChangeEmail(user.email, previousTier, validatedPlan, true, settingsUrl).catch(
            (err) => log.error({ err }, "Welcome email send failed after checkout")
          );
        }
      })
      .catch((err) => log.warn({ err }, "User lookup for checkout email failed"));

    // Audit log
    audit
      .subscriptionUpgrade(userId, previousTier, validatedPlan)
      .catch((err) => log.warn({ err }, "Audit log failed but subscription created"));

    // Sync Discord role (fire-and-forget with retry)
    syncDiscordWithRetry(userId, validatedPlan);
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = getStringId(subscription.customer);

  if (!customerId) {
    log.error({ subscriptionId: subscription.id }, "No customer ID in subscription");
    return;
  }

  // Determine plan from price - validate against known price IDs
  const priceId = subscription.items.data[0]?.price.id;
  let tier: "PRO" | "ELITE" | "INSTITUTIONAL";

  if (priceId === env.STRIPE_PRO_MONTHLY_PRICE_ID) {
    tier = "PRO";
  } else if (priceId === env.STRIPE_ELITE_MONTHLY_PRICE_ID) {
    tier = "ELITE";
  } else if (priceId === env.STRIPE_INSTITUTIONAL_MONTHLY_PRICE_ID) {
    tier = "INSTITUTIONAL";
  } else {
    log.error(
      { priceId, subscriptionId: subscription.id },
      "Unknown price ID in subscription — skipping update (check env price IDs)"
    );
    return;
  }

  const mappedStatus = mapStripeStatus(subscription.status);
  const period = getSubscriptionPeriod(subscription);

  // Derive cancelAtPeriodEnd from Stripe: null if not cancelling, else the date access ends.
  // Stripe uses `cancel_at` (explicit timestamp) when set; otherwise fall back to current_period_end
  // when cancel_at_period_end is true.
  const subRaw = subscription as unknown as Record<string, unknown>;
  const cancelAt = subRaw.cancel_at as number | null | undefined;
  const cancelAtPeriodEndFlag = subRaw.cancel_at_period_end as boolean | undefined;
  const cancelAtPeriodEndDate = cancelAtPeriodEndFlag
    ? cancelAt
      ? new Date(cancelAt * 1000)
      : period.end
    : null;

  // Use transaction with row-level locking to prevent concurrent webhook race conditions
  const result = await prisma.$transaction(async (tx) => {
    // Lock the subscription row to prevent concurrent updates
    const rows = await tx.$queryRaw<
      Array<{
        id: string;
        userId: string;
        tier: string;
        status: string;
        scheduledDowngradeTier: string | null;
        stripeScheduleId: string | null;
      }>
    >`
      SELECT id, "userId", tier, status, "scheduledDowngradeTier", "stripeScheduleId" FROM "Subscription"
      WHERE "stripeCustomerId" = ${customerId}
      FOR UPDATE
    `;

    if (!rows.length) {
      log.error({ customerId }, "Subscription not found for customer");
      return null;
    }

    const userSubscription = rows[0];
    const previousTier = userSubscription.tier;

    // Clear pending downgrade fields if the new tier matches the scheduled target
    // (meaning the schedule completed and Stripe transitioned the subscription)
    const shouldClearSchedule =
      userSubscription.scheduledDowngradeTier === tier || !userSubscription.scheduledDowngradeTier;

    await transitionSubscription(
      tx,
      userSubscription.userId,
      {
        status: userSubscription.status as SubscriptionStatus,
        tier: userSubscription.tier as PlanTier,
      },
      { status: mappedStatus, tier },
      "stripe_subscription_update",
      {
        stripeSubId: subscription.id,
        currentPeriodStart: period.start,
        currentPeriodEnd: period.end,
        hadPaidPlan: true,
        cancelAtPeriodEnd: cancelAtPeriodEndDate,
        ...(shouldClearSchedule && {
          scheduledDowngradeTier: null,
          stripeScheduleId: null,
        }),
      }
    );

    return { userId: userSubscription.userId, previousTier };
  });

  if (result) {
    invalidateSubscriptionCache(result.userId);

    // Audit tier changes and send confirmation email (fire-and-forget, outside transaction)
    if (result.previousTier !== tier) {
      const isUpgrade =
        TIER_ORDER[tier] > TIER_ORDER[result.previousTier as keyof typeof TIER_ORDER];

      (isUpgrade
        ? audit.subscriptionUpgrade(result.userId, result.previousTier, tier)
        : audit.subscriptionDowngrade(result.userId, result.previousTier, tier)
      ).catch((err) => log.warn({ err }, "Audit log failed but subscription updated"));

      // Send plan change confirmation email (best-effort — must not fail the webhook)
      prisma.user
        .findUnique({ where: { id: result.userId }, select: { email: true } })
        .then((user) => {
          if (user?.email) {
            const settingsUrl = `${env.AUTH_URL || "https://algo-studio.com"}/app`;
            sendPlanChangeEmail(
              user.email,
              result.previousTier,
              tier,
              isUpgrade,
              settingsUrl
            ).catch((err) => log.error({ err }, "Plan change email send failed"));
          }
        })
        .catch((err) => log.warn({ err }, "User lookup for plan change email failed"));

      // Sync Discord role (fire-and-forget with retry)
      syncDiscordWithRetry(result.userId, tier);
    }
  }
}

async function handleSubscriptionCancelled(subscription: Stripe.Subscription) {
  const customerId = getStringId(subscription.customer);

  if (!customerId) {
    log.error({ subscriptionId: subscription.id }, "No customer ID in subscription cancellation");
    return;
  }

  // Use transaction with row-level locking
  const userId = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<
      Array<{ id: string; userId: string; tier: string; status: string }>
    >`
      SELECT id, "userId", tier, status FROM "Subscription"
      WHERE "stripeCustomerId" = ${customerId}
      FOR UPDATE
    `;

    if (!rows.length) return null;

    await transitionSubscription(
      tx,
      rows[0].userId,
      { status: rows[0].status as SubscriptionStatus, tier: rows[0].tier as PlanTier },
      { status: "cancelled", tier: "FREE" },
      "stripe_subscription_cancelled",
      {
        stripeSubId: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        scheduledDowngradeTier: null,
        stripeScheduleId: null,
      }
    );

    return rows[0].userId;
  });

  if (userId) {
    invalidateSubscriptionCache(userId);
    audit
      .subscriptionCancel(userId)
      .catch((err) => log.warn({ err }, "Audit log failed but subscription cancelled"));

    // Sync Discord role to FREE (fire-and-forget with retry)
    syncDiscordWithRetry(userId, "FREE");
  }
}

async function handleCustomerDeleted(customer: Stripe.Customer) {
  // A Stripe customer was deleted (typically from the Stripe Dashboard).
  // Any subscription row still pointing at this customer is now orphaned —
  // transition to cancelled/FREE and clear all Stripe pointers.
  const userId = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<
      Array<{ id: string; userId: string; tier: string; status: string }>
    >`
      SELECT id, "userId", tier, status FROM "Subscription"
      WHERE "stripeCustomerId" = ${customer.id}
      FOR UPDATE
    `;

    if (!rows.length) return null;

    await transitionSubscription(
      tx,
      rows[0].userId,
      { status: rows[0].status as SubscriptionStatus, tier: rows[0].tier as PlanTier },
      { status: "cancelled", tier: "FREE" },
      "stripe_customer_deleted",
      {
        stripeCustomerId: null,
        stripeSubId: null,
        stripeScheduleId: null,
        scheduledDowngradeTier: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: null,
      }
    );

    return rows[0].userId;
  });

  if (userId) {
    invalidateSubscriptionCache(userId);
    audit
      .subscriptionCancel(userId)
      .catch((err) => log.warn({ err }, "Audit log failed after customer.deleted"));
    syncDiscordWithRetry(userId, "FREE");
    log.warn(
      { userId, customerId: customer.id },
      "Stripe customer deleted — subscription orphaned and cancelled"
    );
  } else {
    log.info(
      { customerId: customer.id },
      "customer.deleted received but no matching subscription — noop"
    );
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = getStringId(
    (invoice as unknown as Record<string, unknown>).subscription as string | { id: string } | null
  );
  if (!subscriptionId) {
    log.error({ invoiceId: invoice.id }, "No subscription ID in payment succeeded invoice");
    return;
  }

  const customerId = getStringId(invoice.customer);
  if (!customerId) {
    log.error(
      { invoiceId: invoice.id, subscriptionId },
      "No customer ID in payment succeeded invoice"
    );
    return;
  }

  const stripeSubscription = await getStripe().subscriptions.retrieve(subscriptionId);
  const period = getSubscriptionPeriod(stripeSubscription);

  // Use transaction with row-level locking
  const userId = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<
      Array<{ id: string; userId: string; tier: string; status: string }>
    >`
      SELECT id, "userId", tier, status FROM "Subscription"
      WHERE "stripeCustomerId" = ${customerId}
      FOR UPDATE
    `;

    if (!rows.length) {
      throw new Error(`No subscription found for customer ${customerId} — will retry`);
    }

    await transitionSubscription(
      tx,
      rows[0].userId,
      { status: rows[0].status as SubscriptionStatus, tier: rows[0].tier as PlanTier },
      { status: "active" },
      "stripe_payment_succeeded",
      {
        currentPeriodStart: period.start,
        currentPeriodEnd: period.end,
      }
    );

    return rows[0].userId;
  });

  if (userId) {
    invalidateSubscriptionCache(userId);
    audit
      .paymentSuccess(userId)
      .catch((err) => log.warn({ err }, "Audit log failed but payment recorded"));

    // Referral commission (awaited — errors are caught, not thrown, so this
    // won't block subscription activation. Idempotent via ledger unique index.)
    try {
      const { bookCommission } = await import("@/lib/referral/commission");
      await bookCommission(invoice, userId);
    } catch (err) {
      log.error({ err, invoiceId: invoice.id }, "referral:commission-booking-failed");
    }
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = getStringId(invoice.customer);
  if (!customerId) {
    log.error({ invoiceId: invoice.id }, "No customer ID in payment failed invoice");
    return;
  }

  // Use transaction with row-level locking
  const userId = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<
      Array<{ id: string; userId: string; tier: string; status: string }>
    >`
      SELECT id, "userId", tier, status FROM "Subscription"
      WHERE "stripeCustomerId" = ${customerId}
      FOR UPDATE
    `;

    if (!rows.length) return null;

    await transitionSubscription(
      tx,
      rows[0].userId,
      { status: rows[0].status as SubscriptionStatus, tier: rows[0].tier as PlanTier },
      { status: "past_due" },
      "stripe_payment_failed"
    );

    return rows[0].userId;
  });

  if (userId) {
    // Send payment failed email (best-effort — must not fail the webhook)
    prisma.user
      .findUnique({ where: { id: userId }, select: { email: true } })
      .then((user) => {
        if (user?.email) {
          const portalUrl = `${env.AUTH_URL || "https://algo-studio.com"}/app`;
          sendPaymentFailedEmail(user.email, portalUrl).catch((err) =>
            log.error({ err }, "Payment failed email send failed")
          );
        }
      })
      .catch((err) => log.warn({ err }, "User lookup for payment failed email failed"));

    audit
      .paymentFailed(userId)
      .catch((err) => log.warn({ err }, "Audit log failed but payment failure recorded"));
  }
}

async function handlePaymentActionRequired(invoice: Stripe.Invoice) {
  const customerId = getStringId(invoice.customer);
  if (!customerId) {
    log.error({ invoiceId: invoice.id }, "No customer ID in payment action required invoice");
    return;
  }

  // Lock the subscription row to prevent concurrent webhooks from sending duplicate emails.
  const userEmail = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ userId: string }>>`
      SELECT "userId" FROM "Subscription"
      WHERE "stripeCustomerId" = ${customerId}
      FOR UPDATE
    `;
    if (!rows.length) return null;

    const user = await tx.user.findUnique({
      where: { id: rows[0].userId },
      select: { email: true },
    });
    return user?.email ?? null;
  });

  if (!userEmail) return;

  const portalUrl = `${env.AUTH_URL || "https://algo-studio.com"}/app`;
  sendPaymentActionRequiredEmail(userEmail, portalUrl).catch((err) =>
    log.error({ err }, "Payment action required email send failed")
  );
  log.info({ customerId, invoiceId: invoice.id }, "Payment action required email sent");
}

async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  const customerId = getStringId(subscription.customer);
  if (!customerId) {
    log.error({ subscriptionId: subscription.id }, "No customer ID in trial will end subscription");
    return;
  }

  const sub = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId },
    include: { user: { select: { email: true } } },
  });

  if (!sub?.user?.email) return;

  const portalUrl = `${env.AUTH_URL || "https://algo-studio.com"}/app`;
  sendTrialEndingEmail(sub.user.email, sub.tier, portalUrl).catch((err) =>
    log.error({ err }, "Trial ending email send failed")
  );

  log.info(
    { customerId, tier: sub.tier, trialEnd: subscription.trial_end },
    "Trial ending soon — reminder sent"
  );
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  const customerId = getStringId(charge.customer);
  if (!customerId) {
    log.error({ chargeId: charge.id }, "No customer ID in charge refund");
    return;
  }

  // Log the refund but do NOT auto-downgrade the subscription.
  // Stripe sends customer.subscription.deleted when a subscription is actually cancelled.
  // A refund on a single charge (e.g. customer service goodwill) should not kill the subscription.
  log.info(
    {
      chargeId: charge.id,
      customerId,
      amount: charge.amount_refunded,
      fullRefund: charge.refunded,
    },
    "Charge refunded — subscription unchanged (cancellation handled by subscription.deleted)"
  );

  // Referral commission reversal (awaited, errors caught)
  try {
    const { bookReversal } = await import("@/lib/referral/commission");
    await bookReversal(charge);
  } catch (err) {
    log.error({ err, chargeId: charge.id }, "referral:reversal-booking-failed");
  }
}

async function handleSubscriptionPaused(subscription: Stripe.Subscription) {
  const customerId = getStringId(subscription.customer);
  if (!customerId) {
    log.error({ subscriptionId: subscription.id }, "No customer ID in subscription paused event");
    return;
  }

  // Update subscription status to paused
  const userId = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<
      Array<{ id: string; userId: string; tier: string; status: string }>
    >`
      SELECT id, "userId", tier, status FROM "Subscription"
      WHERE "stripeCustomerId" = ${customerId}
      FOR UPDATE
    `;

    if (!rows.length) return null;

    await transitionSubscription(
      tx,
      rows[0].userId,
      { status: rows[0].status as SubscriptionStatus, tier: rows[0].tier as PlanTier },
      { status: "paused" },
      "stripe_subscription_paused"
    );

    return rows[0].userId;
  });

  if (userId) {
    invalidateSubscriptionCache(userId);
    log.info({ userId, customerId }, "Subscription paused");
  }
}

async function handleInvoiceUncollectible(invoice: Stripe.Invoice) {
  const customerId = getStringId(invoice.customer);
  if (!customerId) {
    log.error({ invoiceId: invoice.id }, "No customer ID in uncollectible invoice");
    return;
  }

  // Mark subscription as unpaid when invoice is abandoned
  const userId = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<
      Array<{ id: string; userId: string; tier: string; status: string }>
    >`
      SELECT id, "userId", tier, status FROM "Subscription"
      WHERE "stripeCustomerId" = ${customerId}
      FOR UPDATE
    `;

    if (!rows.length) return null;

    await transitionSubscription(
      tx,
      rows[0].userId,
      { status: rows[0].status as SubscriptionStatus, tier: rows[0].tier as PlanTier },
      { status: "unpaid" },
      "stripe_invoice_uncollectible"
    );

    return rows[0].userId;
  });

  if (userId) {
    invalidateSubscriptionCache(userId);
    log.warn(
      { userId, customerId, invoiceId: invoice.id },
      "Invoice marked uncollectible — subscription set to unpaid"
    );
  }
}

async function handleScheduleCompleted(schedule: Stripe.SubscriptionSchedule) {
  // Race-safe: lock the subscription row and clear BOTH schedule tracking fields.
  // The scheduled downgrade has fired — tier transition happens via
  // customer.subscription.updated — so both fields should be cleared together.
  const userId = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ userId: string }>>`
      SELECT "userId" FROM "Subscription"
      WHERE "stripeScheduleId" = ${schedule.id}
      FOR UPDATE
    `;
    if (!rows.length) return null;

    await tx.subscription.updateMany({
      where: { stripeScheduleId: schedule.id },
      data: {
        scheduledDowngradeTier: null,
        stripeScheduleId: null,
      },
    });

    return rows[0].userId;
  });

  if (userId) {
    invalidateSubscriptionCache(userId);
    log.info(
      { scheduleId: schedule.id, userId },
      "Cleared schedule tracking fields after schedule completed"
    );
  }
}

async function handleScheduleCancelledOrReleased(schedule: Stripe.SubscriptionSchedule) {
  // Race-safe: lock the subscription row before clearing fields.
  // Handles cases where admin cancels/releases from Stripe Dashboard or concurrent
  // webhook processing.
  const userId = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ userId: string }>>`
      SELECT "userId" FROM "Subscription"
      WHERE "stripeScheduleId" = ${schedule.id}
      FOR UPDATE
    `;
    if (!rows.length) return null;

    await tx.subscription.updateMany({
      where: { stripeScheduleId: schedule.id },
      data: {
        scheduledDowngradeTier: null,
        stripeScheduleId: null,
      },
    });

    return rows[0].userId;
  });

  if (userId) {
    invalidateSubscriptionCache(userId);
    log.info(
      { scheduleId: schedule.id, userId },
      "Cleared pending downgrade after schedule cancelled/released"
    );
  }
}

async function handleDisputeClosed(dispute: Stripe.Dispute) {
  const chargeId = getStringId(dispute.charge);

  if (dispute.status === "lost") {
    // Dispute was lost — retrieve the charge to get customer ID
    if (!chargeId) {
      log.error({ disputeId: dispute.id }, "Dispute lost but no charge ID — manual review");
      return;
    }
    // Guard against charge retrieval failures (404, network errors). Without this,
    // Stripe would retry the webhook indefinitely on a missing charge.
    let charge: Stripe.Charge;
    try {
      charge = await getStripe().charges.retrieve(chargeId);
    } catch (err) {
      log.error(
        { err: extractErrorDetails(err), disputeId: dispute.id, chargeId },
        "Dispute lost but charge retrieval failed — manual review required"
      );
      return;
    }
    const customerId = getStringId(charge.customer);
    if (!customerId) {
      log.error(
        { disputeId: dispute.id, chargeId },
        "Dispute lost but no customer ID on charge — manual review"
      );
      return;
    }

    const userId = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        Array<{ id: string; userId: string; tier: string; status: string }>
      >`
        SELECT id, "userId", tier, status FROM "Subscription"
        WHERE "stripeCustomerId" = ${customerId}
        FOR UPDATE
      `;

      if (!rows.length) return null;

      await transitionSubscription(
        tx,
        rows[0].userId,
        { status: rows[0].status as SubscriptionStatus, tier: rows[0].tier as PlanTier },
        { status: "cancelled", tier: "FREE" },
        "stripe_dispute_lost",
        { stripeSubId: null }
      );

      return rows[0].userId;
    });

    if (userId) {
      invalidateSubscriptionCache(userId);
      syncDiscordWithRetry(userId, "FREE");
    }

    log.error(
      { disputeId: dispute.id, chargeId, customerId, status: dispute.status },
      "Dispute lost — subscription downgraded to FREE"
    );
  } else {
    log.info({ disputeId: dispute.id, chargeId, status: dispute.status }, "Dispute closed");
  }
}
