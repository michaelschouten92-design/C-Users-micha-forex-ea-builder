import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import type Stripe from "stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
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

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const plan = session.metadata?.plan as "STARTER" | "PRO";

  if (!userId || !plan) {
    console.error("Missing metadata in checkout session");
    return;
  }

  const subscriptionId = session.subscription as string;
  const stripeSubscription = await getStripe().subscriptions.retrieve(subscriptionId);

  // Access the subscription data - use any to bypass strict typing issues with Stripe SDK
  const subData = stripeSubscription as any;

  await prisma.subscription.update({
    where: { userId },
    data: {
      tier: plan,
      status: "active",
      stripeSubId: subscriptionId,
      stripeCustomerId: session.customer as string,
      currentPeriodStart: new Date(subData.current_period_start * 1000),
      currentPeriodEnd: new Date(subData.current_period_end * 1000),
    },
  });
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Find user by Stripe customer ID
  const userSubscription = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!userSubscription) {
    console.error("Subscription not found for customer:", customerId);
    return;
  }

  // Determine plan from price
  const priceId = subscription.items.data[0]?.price.id;
  let tier: "STARTER" | "PRO" = "STARTER";

  if (
    priceId === process.env.STRIPE_PRO_MONTHLY_PRICE_ID ||
    priceId === process.env.STRIPE_PRO_YEARLY_PRICE_ID
  ) {
    tier = "PRO";
  }

  // Cast to access properties
  const sub = subscription as unknown as { current_period_start: number; current_period_end: number; status: string };

  await prisma.subscription.update({
    where: { id: userSubscription.id },
    data: {
      tier,
      status: sub.status === "active" ? "active" : sub.status,
      currentPeriodStart: new Date(sub.current_period_start * 1000),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
    },
  });
}

async function handleSubscriptionCancelled(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  const userSubscription = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!userSubscription) {
    return;
  }

  // Downgrade to starter (free tier behavior)
  await prisma.subscription.update({
    where: { id: userSubscription.id },
    data: {
      tier: "STARTER",
      status: "cancelled",
      stripeSubId: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
    },
  });
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  // Update subscription period dates
  const inv = invoice as unknown as { subscription?: string | { id: string }; customer?: string | { id: string } };

  const subscriptionId = typeof inv.subscription === 'string'
    ? inv.subscription
    : inv.subscription?.id;

  if (!subscriptionId) return;

  const stripeSubscription = await getStripe().subscriptions.retrieve(subscriptionId);
  const subData = stripeSubscription as unknown as Stripe.Subscription & { current_period_start: number; current_period_end: number };

  const customerId = typeof inv.customer === 'string'
    ? inv.customer
    : inv.customer?.id;

  if (!customerId) return;

  const userSubscription = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (userSubscription) {
    await prisma.subscription.update({
      where: { id: userSubscription.id },
      data: {
        status: "active",
        currentPeriodStart: new Date(subData.current_period_start * 1000),
        currentPeriodEnd: new Date(subData.current_period_end * 1000),
      },
    });
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const inv = invoice as unknown as { customer?: string | { id: string } };

  const customerId = typeof inv.customer === 'string'
    ? inv.customer
    : inv.customer?.id;

  if (!customerId) return;

  const userSubscription = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (userSubscription) {
    await prisma.subscription.update({
      where: { id: userSubscription.id },
      data: {
        status: "past_due",
      },
    });
  }
}
