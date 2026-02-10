import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { features } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Only expose detailed service info when authenticated with CRON_SECRET
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const isAuthorized = cronSecret && authHeader === `Bearer ${cronSecret}`;

  // Database check (always performed)
  let dbUp = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbUp = true;
  } catch {
    dbUp = false;
  }

  // Unauthenticated: return minimal status only
  if (!isAuthorized) {
    return NextResponse.json(
      { status: dbUp ? "healthy" : "unhealthy", timestamp: new Date().toISOString() },
      { status: dbUp ? 200 : 503 }
    );
  }

  // Authenticated: return detailed service breakdown
  const services: Record<string, "up" | "down"> = { database: dbUp ? "up" : "down" };

  // Check Redis (if configured)
  if (process.env.UPSTASH_REDIS_REST_URL) {
    try {
      const res = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/ping`, {
        headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` },
        signal: AbortSignal.timeout(3000),
      });
      services.redis = res.ok ? "up" : "down";
    } catch {
      services.redis = "down";
    }
  }

  // Check Stripe (if configured)
  if (features.stripe) {
    try {
      const { getStripe } = await import("@/lib/stripe");
      await getStripe().balance.retrieve();
      services.stripe = "up";
    } catch {
      services.stripe = "down";
    }
  }

  const allUp = Object.values(services).every((s) => s === "up");

  return NextResponse.json(
    {
      status: allUp ? "healthy" : dbUp ? "degraded" : "unhealthy",
      services,
      timestamp: new Date().toISOString(),
    },
    { status: dbUp ? 200 : 503 }
  );
}
