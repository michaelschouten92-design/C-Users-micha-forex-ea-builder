import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { PLANS } from "@/lib/plans";
import {
  checkoutRequestSchema,
  formatZodErrors,
  checkBodySize,
  checkContentType,
} from "@/lib/validations";
import { createApiLogger, extractErrorDetails } from "@/lib/logger";
import {
  apiRateLimiter,
  checkRateLimit,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const session = await auth();
  const log = createApiLogger("/api/stripe/checkout", "POST", session?.user?.id);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  const sizeError = checkBodySize(request);
  if (sizeError) return sizeError;

  try {
    const body = await request.json();
    const validation = checkoutRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: formatZodErrors(validation.error) },
        { status: 400 }
      );
    }

    const { plan, interval } = validation.data;

    // Validate plan exists in config
    if (!PLANS[plan]) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const planConfig = PLANS[plan];

    // FREE plan cannot be purchased via checkout
    if (!planConfig.prices) {
      return NextResponse.json(
        { error: "This plan is not available for purchase" },
        { status: 400 }
      );
    }

    const priceId = planConfig.prices[interval].priceId;

    if (!priceId) {
      return NextResponse.json({ error: "Price not configured" }, { status: 500 });
    }

    // Get or create Stripe customer
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        subscription: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Require email verification before checkout
    if (!user.emailVerified) {
      return NextResponse.json(
        { error: "Please verify your email before subscribing" },
        { status: 403 }
      );
    }

    // Prevent duplicate or downgrade subscriptions
    const currentTier = user.subscription?.tier;
    const isActive =
      user.subscription?.status === "active" || user.subscription?.status === "trialing";
    if (isActive && currentTier === plan) {
      return NextResponse.json(
        { error: `You already have an active ${PLANS[plan].name} subscription` },
        { status: 400 }
      );
    }
    // Prevent downgrade via checkout (PRO cannot buy PRO, ELITE cannot buy PRO)
    if (isActive && currentTier === "ELITE" && plan === "PRO") {
      return NextResponse.json(
        { error: "Please manage your subscription from account settings" },
        { status: 400 }
      );
    }

    let stripeCustomerId = user.subscription?.stripeCustomerId;

    if (!stripeCustomerId) {
      // Create new Stripe customer
      const customer = await getStripe().customers.create({
        email: user.email,
        metadata: {
          userId: user.id,
        },
      });
      stripeCustomerId = customer.id;

      // Save customer ID (upsert in case subscription row doesn't exist yet)
      await prisma.subscription.upsert({
        where: { userId: user.id },
        update: { stripeCustomerId },
        create: { userId: user.id, tier: "FREE", stripeCustomerId },
      });
    }

    // Create checkout session
    const checkoutParams: Stripe.Checkout.SessionCreateParams = {
      customer: stripeCustomerId,
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${env.AUTH_URL}/app?checkout=success`,
      cancel_url: `${env.AUTH_URL}/pricing?checkout=cancelled`,
      automatic_tax: { enabled: true },
      allow_promotion_codes: true,
      metadata: {
        userId: user.id,
        plan,
        interval,
      },
    };

    // Add trial period for new subscribers (no previous paid subscription)
    const trialDays = env.STRIPE_TRIAL_DAYS;
    if (trialDays && trialDays > 0 && !currentTier) {
      checkoutParams.subscription_data = {
        trial_period_days: trialDays,
      };
    }

    const checkoutSession = await getStripe().checkout.sessions.create(checkoutParams);

    log.info({ plan, interval, checkoutSessionId: checkoutSession.id }, "Checkout session created");
    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    const details = extractErrorDetails(error);
    log.error({ error: details }, "Checkout error");

    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
