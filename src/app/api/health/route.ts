import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { features } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const services: Record<string, "up" | "down"> = {};

  // Check database
  try {
    await prisma.$queryRaw`SELECT 1`;
    services.database = "up";
  } catch {
    services.database = "down";
  }

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

  const healthy = services.database === "up";
  const allUp = Object.values(services).every((s) => s === "up");

  return NextResponse.json(
    {
      status: allUp ? "healthy" : healthy ? "degraded" : "unhealthy",
      services,
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 }
  );
}
