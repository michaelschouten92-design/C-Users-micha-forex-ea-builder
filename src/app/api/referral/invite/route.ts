import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * POST: Claim a referral invite token. Makes the current user a partner.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const token = typeof body.token === "string" ? body.token.trim() : "";

  if (!token) {
    return NextResponse.json({ error: "Invite token required" }, { status: 400 });
  }

  // Find and validate invite
  const invite = await prisma.referralInvite.findUnique({ where: { token } });

  if (!invite) {
    return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });
  }
  if (invite.claimedByUserId) {
    return NextResponse.json({ error: "This invite has already been used" }, { status: 410 });
  }
  if (invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "This invite has expired" }, { status: 410 });
  }

  // Create or update partner with the invite's commission rate
  try {
    await prisma.referralPartner.create({
      data: {
        userId: session.user.id,
        commissionBps: invite.commissionBps,
        status: "ACTIVE", // Invite = pre-approved
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      // Already a partner — update commission and activate
      await prisma.referralPartner.update({
        where: { userId: session.user.id },
        data: { commissionBps: invite.commissionBps, status: "ACTIVE" },
      });
    } else {
      throw err;
    }
  }

  // Mark invite as claimed
  await prisma.referralInvite.update({
    where: { id: invite.id },
    data: { claimedByUserId: session.user.id, claimedAt: new Date() },
  });

  return NextResponse.json({
    success: true,
    commissionPct: invite.commissionBps / 100,
  });
}
