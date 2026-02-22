import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{ token: string }>;
};

// GET /api/track-record/shared/[token] — public, return shared proof bundle
export async function GET(request: NextRequest, { params }: Props) {
  const { token } = await params;

  const shared = await prisma.sharedProofBundle.findUnique({
    where: { token },
    include: {
      instance: {
        select: { eaName: true, symbol: true, broker: true },
      },
    },
  });

  if (!shared) {
    return NextResponse.json({ error: "Proof bundle not found" }, { status: 404 });
  }

  // Check expiry
  if (shared.expiresAt && shared.expiresAt < new Date()) {
    return NextResponse.json({ error: "This proof bundle has expired" }, { status: 410 });
  }

  // Increment access count (fire and forget)
  prisma.sharedProofBundle
    .update({
      where: { id: shared.id },
      data: { accessCount: { increment: 1 } },
    })
    .catch(() => {});

  return NextResponse.json({
    bundle: shared.bundleJson,
    metadata: {
      eaName: shared.instance.eaName,
      symbol: shared.instance.symbol,
      broker: shared.instance.broker,
      createdAt: shared.createdAt,
      expiresAt: shared.expiresAt,
      accessCount: shared.accessCount + 1,
    },
  });
}
