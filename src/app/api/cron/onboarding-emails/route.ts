import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";
import { timingSafeEqual } from "@/lib/csrf";
import { sendOnboardingDay1Email, sendOnboardingDay3Email } from "@/lib/email";

const log = logger.child({ route: "/api/cron/onboarding-emails" });

/**
 * Cron endpoint to send onboarding emails to new users.
 * Run daily via Vercel Cron or similar scheduler.
 *
 * Day 1: "Build your first strategy" (24h after registration)
 * Day 3: "Ready to export?" (72h after registration)
 */
async function handleOnboardingEmails(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    log.error("CRON_SECRET not configured");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  if (!authHeader || !timingSafeEqual(authHeader, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // In production on Vercel, verify the request comes from Vercel Cron
  if (process.env.VERCEL && !request.headers.get("x-vercel-cron")) {
    log.warn("Cron request missing x-vercel-cron header");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const appUrl = `${env.AUTH_URL}/app`;
    const pricingUrl = `${env.AUTH_URL}/pricing`;

    // Day 1: Users created 24-48h ago who haven't created any projects
    // Use 25h start to prevent overlap on cron retries within 1h
    const day1Start = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const day1End = new Date(now.getTime() - 25 * 60 * 60 * 1000);

    const day1Users = await prisma.user.findMany({
      where: {
        createdAt: { gte: day1Start, lt: day1End },
        projects: { none: {} },
      },
      select: { id: true, email: true },
      take: 500, // Cap to prevent OOM on large user bases
    });

    let day1Sent = 0;
    let day1Failed = 0;
    // Send in concurrent batches of 10 to avoid timeout
    const BATCH_SIZE = 10;
    for (let i = 0; i < day1Users.length; i += BATCH_SIZE) {
      const batch = day1Users.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((user) => sendOnboardingDay1Email(user.email, appUrl))
      );
      for (const r of results) {
        if (r.status === "fulfilled") day1Sent++;
        else day1Failed++;
      }
    }

    // Day 3: Users created 72-96h ago who haven't exported
    // Use 73h start to prevent overlap on cron retries within 1h
    const day3Start = new Date(now.getTime() - 96 * 60 * 60 * 1000);
    const day3End = new Date(now.getTime() - 73 * 60 * 60 * 1000);

    const day3Users = await prisma.user.findMany({
      where: {
        createdAt: { gte: day3Start, lt: day3End },
        exports: { none: {} },
      },
      select: { id: true, email: true },
      take: 500, // Cap to prevent OOM on large user bases
    });

    let day3Sent = 0;
    let day3Failed = 0;
    for (let i = 0; i < day3Users.length; i += BATCH_SIZE) {
      const batch = day3Users.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((user) => sendOnboardingDay3Email(user.email, pricingUrl))
      );
      for (const r of results) {
        if (r.status === "fulfilled") day3Sent++;
        else day3Failed++;
      }
    }

    log.info({ day1Sent, day1Failed, day3Sent, day3Failed }, "Onboarding emails sent");

    return NextResponse.json({
      success: true,
      sent: { day1: day1Sent, day3: day3Sent },
      failed: { day1: day1Failed, day3: day3Failed },
    });
  } catch (error) {
    log.error({ error }, "Onboarding emails failed");
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// Vercel Cron sends GET requests
export async function GET(request: NextRequest) {
  return handleOnboardingEmails(request);
}
