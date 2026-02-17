import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { env } from "@/lib/env";
import { logger, extractErrorDetails } from "@/lib/logger";
import { audit } from "@/lib/audit";
import { invalidateSubscriptionCache } from "@/lib/plan-limits";
import {
  sendPaymentFailedEmail,
  sendPaymentActionRequiredEmail,
  sendPlanChangeEmail,
} from "@/lib/email";
import { syncDiscordRoleForUser } from "@/lib/discord";
import type Stripe from "stripe";

const log = logger.child({ route: "/api/stripe/webhook" });

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
    log.warn(
      { subscriptionId: subscription.id, startRaw, endRaw },
      "Missing period dates on subscription, using current time"
    );
    return { start: new Date(), end: new Date() };
  }

  return {
    start: new Date(startRaw * 1000),
    end: new Date(endRaw * 1000),
  };
}

export async function POST(request: NextRequest) {
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

      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute;
        log.error(
          { disputeId: dispute.id, chargeId: getStringId(dispute.charge), reason: dispute.reason },
          "Chargeback dispute created — manual review required"
        );
        break;
      }
    }

    log.info({ eventType: event.type, eventId: event.id }, "Webhook processed successfully");
    return NextResponse.json({ received: true });
  } catch (error) {
    // Remove idempotency claim so Stripe can retry this event
    await prisma.webhookEvent.delete({ where: { eventId: event.id } }).catch(() => {});

    log.error(
      { error: extractErrorDetails(error), eventType: event.type },
      "Webhook handler error"
    );
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}

const VALID_PAID_TIERS = ["PRO", "ELITE"] as const;
type PaidTier = (typeof VALID_PAID_TIERS)[number];

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const plan = session.metadata?.plan;

  if (!userId || !plan) {
    log.error({ sessionId: session.id }, "Missing metadata in checkout session — cannot process");
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
  const period = getSubscriptionPeriod(stripeSubscription);

  await prisma.subscription.update({
    where: { userId },
    data: {
      tier: validatedPlan,
      status: "active",
      stripeSubId: subscriptionId,
      stripeCustomerId: customerId,
      currentPeriodStart: period.start,
      currentPeriodEnd: period.end,
    },
  });

  invalidateSubscriptionCache(userId);
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = getStringId(subscription.customer);

  if (!customerId) {
    log.error({ subscriptionId: subscription.id }, "No customer ID in subscription");
    return;
  }

  // Determine plan from price - validate against known price IDs
  const priceId = subscription.items.data[0]?.price.id;
  let tier: "PRO" | "ELITE";

  if (priceId === env.STRIPE_PRO_MONTHLY_PRICE_ID || priceId === env.STRIPE_PRO_YEARLY_PRICE_ID) {
    tier = "PRO";
  } else if (
    priceId === env.STRIPE_ELITE_MONTHLY_PRICE_ID ||
    priceId === env.STRIPE_ELITE_YEARLY_PRICE_ID
  ) {
    tier = "ELITE";
  } else {
    throw new Error(
      `Unknown price ID "${priceId}" in subscription ${subscription.id} — will retry`
    );
  }

  // Map Stripe status to our status
  const statusMap: Record<Stripe.Subscription.Status, string> = {
    active: "active",
    canceled: "cancelled",
    incomplete: "incomplete",
    incomplete_expired: "expired",
    past_due: "past_due",
    paused: "paused",
    trialing: "trialing",
    unpaid: "unpaid",
  };

  const period = getSubscriptionPeriod(subscription);

  // Use transaction with row-level locking to prevent concurrent webhook race conditions
  const result = await prisma.$transaction(async (tx) => {
    // Lock the subscription row to prevent concurrent updates
    const rows = await tx.$queryRaw<Array<{ id: string; userId: string; tier: string }>>`
      SELECT id, "userId", tier FROM "Subscription"
      WHERE "stripeCustomerId" = ${customerId}
      FOR UPDATE
    `;

    if (!rows.length) {
      log.error({ customerId }, "Subscription not found for customer");
      return null;
    }

    const userSubscription = rows[0];
    const previousTier = userSubscription.tier;

    await tx.subscription.update({
      where: { id: userSubscription.id },
      data: {
        tier,
        status: statusMap[subscription.status] || subscription.status,
        currentPeriodStart: period.start,
        currentPeriodEnd: period.end,
      },
    });

    return { userId: userSubscription.userId, previousTier };
  });

  if (result) {
    invalidateSubscriptionCache(result.userId);

    // Audit tier changes and send confirmation email (fire-and-forget, outside transaction)
    if (result.previousTier !== tier) {
      const tierOrder: Record<string, number> = { FREE: 0, PRO: 1, ELITE: 2 };
      const isUpgrade = tierOrder[tier] > tierOrder[result.previousTier as keyof typeof tierOrder];

      (isUpgrade
        ? audit.subscriptionUpgrade(result.userId, result.previousTier, tier)
        : audit.subscriptionDowngrade(result.userId, result.previousTier, tier)
      ).catch((err) => log.warn({ err }, "Audit log failed but subscription updated"));

      // Send plan change confirmation email
      const user = await prisma.user.findUnique({
        where: { id: result.userId },
        select: { email: true },
      });
      if (user?.email) {
        const settingsUrl = `${env.AUTH_URL || "https://algo-studio.com"}/app`;
        sendPlanChangeEmail(user.email, result.previousTier, tier, isUpgrade, settingsUrl).catch(
          (err) => log.error({ err }, "Plan change email send failed")
        );
      }

      // Sync Discord role (fire-and-forget)
      syncDiscordRoleForUser(result.userId, tier).catch((err) =>
        log.warn({ err }, "Discord role sync failed after tier change")
      );
    }
  }
}

async function handleSubscriptionCancelled(subscription: Stripe.Subscription) {
  const customerId = getStringId(subscription.customer);

  if (!customerId) return;

  // Use transaction with row-level locking
  const userId = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string; userId: string }>>`
      SELECT id, "userId" FROM "Subscription"
      WHERE "stripeCustomerId" = ${customerId}
      FOR UPDATE
    `;

    if (!rows.length) return null;

    await tx.subscription.update({
      where: { id: rows[0].id },
      data: {
        tier: "FREE",
        status: "cancelled",
        stripeSubId: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
      },
    });

    return rows[0].userId;
  });

  if (userId) {
    invalidateSubscriptionCache(userId);
    audit
      .subscriptionCancel(userId)
      .catch((err) => log.warn({ err }, "Audit log failed but subscription cancelled"));

    // Sync Discord role to FREE (fire-and-forget)
    syncDiscordRoleForUser(userId, "FREE").catch((err) =>
      log.warn({ err }, "Discord role sync failed after subscription cancel")
    );
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = getStringId(
    (invoice as unknown as Record<string, unknown>).subscription as string | { id: string } | null
  );
  if (!subscriptionId) return;

  const customerId = getStringId(invoice.customer);
  if (!customerId) return;

  const stripeSubscription = await getStripe().subscriptions.retrieve(subscriptionId);
  const period = getSubscriptionPeriod(stripeSubscription);

  // Use transaction with row-level locking
  const userId = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string; userId: string }>>`
      SELECT id, "userId" FROM "Subscription"
      WHERE "stripeCustomerId" = ${customerId}
      FOR UPDATE
    `;

    if (!rows.length) return null;

    await tx.subscription.update({
      where: { id: rows[0].id },
      data: {
        status: "active",
        currentPeriodStart: period.start,
        currentPeriodEnd: period.end,
      },
    });

    return rows[0].userId;
  });

  if (userId) {
    invalidateSubscriptionCache(userId);
    audit
      .paymentSuccess(userId)
      .catch((err) => log.warn({ err }, "Audit log failed but payment recorded"));
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = getStringId(invoice.customer);
  if (!customerId) return;

  // Use transaction with row-level locking
  const userId = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string; userId: string }>>`
      SELECT id, "userId" FROM "Subscription"
      WHERE "stripeCustomerId" = ${customerId}
      FOR UPDATE
    `;

    if (!rows.length) return null;

    await tx.subscription.update({
      where: { id: rows[0].id },
      data: {
        status: "past_due",
      },
    });

    return rows[0].userId;
  });

  if (userId) {
    // Send payment failed email to user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (user?.email) {
      const portalUrl = `${env.AUTH_URL || "https://algo-studio.com"}/app`;
      sendPaymentFailedEmail(user.email, portalUrl).catch((err) =>
        log.error({ err }, "Payment failed email send failed")
      );
    }

    audit
      .paymentFailed(userId)
      .catch((err) => log.warn({ err }, "Audit log failed but payment failure recorded"));
  }
}

async function handlePaymentActionRequired(invoice: Stripe.Invoice) {
  const customerId = getStringId(invoice.customer);
  if (!customerId) return;

  const subscription = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId },
    include: { user: { select: { email: true } } },
  });

  if (!subscription?.user?.email) return;

  const portalUrl = `${env.AUTH_URL || "https://algo-studio.com"}/app`;
  sendPaymentActionRequiredEmail(subscription.user.email, portalUrl).catch((err) =>
    log.error({ err }, "Payment action required email send failed")
  );
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  const customerId = getStringId(charge.customer);
  if (!customerId) return;

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
}
