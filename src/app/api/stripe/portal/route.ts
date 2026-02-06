import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { createApiLogger, extractErrorDetails } from "@/lib/logger";

export async function POST(request: NextRequest) {
  const session = await auth();
  const log = createApiLogger("/api/stripe/portal", "POST", session?.user?.id);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    });

    if (!subscription?.stripeCustomerId) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 400 }
      );
    }

    const portalSession = await getStripe().billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${env.AUTH_URL}/app`,
    });

    log.info("Billing portal session created");
    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    log.error({ error: extractErrorDetails(error) }, "Portal error");
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}
