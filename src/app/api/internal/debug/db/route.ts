import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "@/lib/csrf";
import { prisma } from "@/lib/prisma";

function authenticateInternal(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-internal-api-key");
  const expectedKey = process.env.INTERNAL_API_KEY;
  if (!expectedKey || !apiKey) return false;
  return timingSafeEqual(apiKey, expectedKey);
}

function safeDatabaseFingerprint(): { hostname: string | null; database: string | null } {
  const raw = process.env.DATABASE_URL;
  if (!raw) return { hostname: null, database: null };
  try {
    const url = new URL(raw);
    return {
      hostname: url.hostname,
      database: url.pathname.replace(/^\//, "") || null,
    };
  } catch {
    return { hostname: null, database: null };
  }
}

export async function GET(request: NextRequest) {
  if (!authenticateInternal(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = safeDatabaseFingerprint();

  const [demoPage, identityExists, pageCount, identityCount] = await Promise.all([
    prisma.verifiedStrategyPage.findUnique({
      where: { slug: "demo" },
      select: {
        isPublic: true,
        strategyIdentity: { select: { strategyId: true } },
      },
    }),
    prisma.strategyIdentity.findFirst({
      where: { strategyId: "AS-10f10dca" },
      select: { id: true },
    }),
    prisma.verifiedStrategyPage.count(),
    prisma.strategyIdentity.count(),
  ]);

  return NextResponse.json(
    {
      host: request.headers.get("host"),
      database: db,
      demo: {
        verifiedStrategyPageDemo: demoPage?.isPublic === true,
        demoStrategyId: demoPage?.strategyIdentity.strategyId ?? null,
        strategyIdentityExists: identityExists !== null,
      },
      counts: {
        verifiedStrategyPageCount: pageCount,
        strategyIdentityCount: identityCount,
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
