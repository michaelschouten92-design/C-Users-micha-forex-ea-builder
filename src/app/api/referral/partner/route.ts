import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getCsrfHeaders } from "@/lib/api-client";

/**
 * GET: Check partner status for the current user.
 */
export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const partner = await prisma.referralPartner.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      status: true,
      commissionBps: true,
      payoutEmail: true,
      createdAt: true,
    },
  });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { referralCode: true },
  });

  // Derive totals from ledger (source of truth), not cached columns
  let totalEarnedCents = 0;
  let totalPaidCents = 0;
  if (partner) {
    const [earned, reversed, paid] = await Promise.all([
      prisma.referralLedger.aggregate({
        where: { partnerId: partner.id, type: "COMMISSION_EARNED" },
        _sum: { amountCents: true },
      }),
      prisma.referralLedger.aggregate({
        where: { partnerId: partner.id, type: "COMMISSION_REVERSED" },
        _sum: { amountCents: true },
      }),
      prisma.referralLedger.aggregate({
        where: { partnerId: partner.id, type: "PAYOUT_SENT" },
        _sum: { amountCents: true },
      }),
    ]);
    totalEarnedCents = (earned._sum.amountCents ?? 0) + (reversed._sum.amountCents ?? 0); // reversed is negative
    totalPaidCents = Math.abs(paid._sum.amountCents ?? 0);
  }

  return NextResponse.json({
    partner: partner ? { ...partner, totalEarnedCents, totalPaidCents } : null,
    referralCode: user?.referralCode ?? null,
  });
}

/**
 * POST: Apply to become a referral partner (status starts as PENDING).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payoutEmail: string | undefined;
  try {
    const body = await request.json();
    payoutEmail = typeof body.payoutEmail === "string" ? body.payoutEmail.trim() : undefined;
  } catch {
    // No body is fine
  }

  try {
    const partner = await prisma.referralPartner.create({
      data: {
        userId: session.user.id,
        payoutEmail: payoutEmail || null,
      },
    });

    return NextResponse.json({
      id: partner.id,
      status: partner.status,
      message: "Application submitted. You'll be notified when approved.",
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { error: "You are already registered as a partner." },
        { status: 409 }
      );
    }
    throw err;
  }
}
