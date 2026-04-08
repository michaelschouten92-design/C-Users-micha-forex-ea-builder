import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET: Partner ledger history (paginated).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const partner = await prisma.referralPartner.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!partner) {
    return NextResponse.json({ error: "Not a partner" }, { status: 404 });
  }

  const limit = Math.min(parseInt(request.nextUrl.searchParams.get("limit") ?? "25", 10), 100);
  const cursor = request.nextUrl.searchParams.get("cursor") ?? undefined;

  const entries = await prisma.referralLedger.findMany({
    where: { partnerId: partner.id },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      type: true,
      amountCents: true,
      currency: true,
      description: true,
      createdAt: true,
    },
  });

  const hasMore = entries.length > limit;
  const data = hasMore ? entries.slice(0, limit) : entries;

  return NextResponse.json({
    data,
    nextCursor: hasMore ? data[data.length - 1].id : null,
  });
}
