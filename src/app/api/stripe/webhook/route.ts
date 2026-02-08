import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { logger, extractErrorDetails } from "@/lib/logger";
import { audit } from "@/lib/audit";
import { invalidateSubscriptionCache } from "@/lib/plan-limits";
import { sendPaymentFailedEmail } from "@/lib/email";
import type Stripe from "stripe";

const log = logger.child({ route: "/api/stripe/webhook" });

// Helper to safely extract string ID from Stripe expandable fields
function getStringId(field: string | { id: string } | null | undefined): string | null {
  if (!field) return null;
  return typeof field === "string" ? field : field.id;
}

// Helper to get subscription period dates
function getSubscriptionPeriod(subscription: Stripe.Subscription): { start: Date; end: Date } {
  // Access via items data which has the period info
  const item = subscription.items.data[0];
  if (item) {
    return {
      start: new Date(
        (item as unknown as { current_period_start: number }).current_period_start * 1000
      ),
      end: new Date((item as unknown as { current_period_end: number }).current_period_end * 1000),
    };
  }
  // Fallback to subscription level if available
  const sub = subscription as unknown as {
    current_period_start?: number;
    current_period_end?: number;
  };
  return {
    start: sub.current_period_start ? new Date(sub.current_period_start * 1000) : new Date(),
    end: sub.current_period_end ? new Date(sub.current_period_end * 1000) : new Date(),
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
  } catch {
    // Unique constraint violation = duplicate event already being processed
    log.info({ eventId: event.id }, "Duplicate webhook event, skipping");
    return NextResponse.json({ received: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(session);
        break;
      }

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
    }

    log.info({ eventType: event.type, eventId: event.id }, "Webhook processed successfully");
    return NextResponse.json({ received: true });
  } catch (error) {
    log.error(
      { error: extractErrorDetails(error), eventType: event.type },
      "Webhook handler error"
    );
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}

const VALID_PAID_TIERS = ["STARTER", "PRO"] as const;
type PaidTier = (typeof VALID_PAID_TIERS)[number];

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const plan = session.metadata?.plan;

  if (!userId || !plan) {
    log.error({ sessionId: session.id }, "Missing metadata in checkout session");
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
  let tier: "STARTER" | "PRO";

  if (priceId === env.STRIPE_PRO_MONTHLY_PRICE_ID || priceId === env.STRIPE_PRO_YEARLY_PRICE_ID) {
    tier = "PRO";
  } else if (
    priceId === env.STRIPE_STARTER_MONTHLY_PRICE_ID ||
    priceId === env.STRIPE_STARTER_YEARLY_PRICE_ID
  ) {
    tier = "STARTER";
  } else {
    log.error(
      { priceId, subscriptionId: subscription.id },
      "Unknown price ID in subscription update"
    );
    return;
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

    // Audit tier changes (fire-and-forget, outside transaction)
    if (result.previousTier !== tier) {
      const tierOrder = { FREE: 0, STARTER: 1, PRO: 2 };
      const isUpgrade = tierOrder[tier] > tierOrder[result.previousTier as keyof typeof tierOrder];

      (isUpgrade
        ? audit.subscriptionUpgrade(result.userId, result.previousTier, tier)
        : audit.subscriptionDowngrade(result.userId, result.previousTier, tier)
      ).catch((err) => log.warn({ err }, "Audit log failed but subscription updated"));
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
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  // Access subscription from invoice
  const inv = invoice as unknown as { subscription?: string | { id: string } };
  const subscriptionId = getStringId(inv.subscription);
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
        log.warn({ err }, "Payment failed email send failed")
      );
    }

    audit
      .paymentFailed(userId)
      .catch((err) => log.warn({ err }, "Audit log failed but payment failure recorded"));
  }
}
