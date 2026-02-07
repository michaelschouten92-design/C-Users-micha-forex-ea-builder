import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { PLANS } from "@/lib/plans";
import { checkoutRequestSchema, formatZodErrors, checkBodySize, checkContentType } from "@/lib/validations";
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
      return NextResponse.json({ error: "This plan is not available for purchase" }, { status: 400 });
    }

    const priceId = planConfig.prices[interval].priceId;

    if (!priceId) {
      return NextResponse.json(
        { error: "Price not configured" },
        { status: 500 }
      );
    }

    // Get or create Stripe customer
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { subscription: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
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

      // Save customer ID
      await prisma.subscription.update({
        where: { userId: user.id },
        data: { stripeCustomerId },
      });
    }

    // Create checkout session
    const checkoutSession = await getStripe().checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      payment_method_types: ["card", "ideal"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${env.AUTH_URL}/app?checkout=success`,
      cancel_url: `${env.AUTH_URL}/pricing?checkout=cancelled`,
      metadata: {
        userId: user.id,
        plan,
        interval,
      },
    });

    log.info({ plan, interval, checkoutSessionId: checkoutSession.id }, "Checkout session created");
    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    log.error({ error: extractErrorDetails(error) }, "Checkout error");
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
