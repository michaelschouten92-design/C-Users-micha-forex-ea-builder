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
      totalEarnedCents: true,
      totalPaidCents: true,
      createdAt: true,
    },
  });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { referralCode: true },
  });

  return NextResponse.json({
    partner,
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
