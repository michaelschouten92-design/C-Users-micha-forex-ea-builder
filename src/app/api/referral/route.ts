import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// GET /api/referral - Get or create referral code + stats
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { referralCode: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Generate referral code if not exists
  if (!user.referralCode) {
    const code = crypto.randomBytes(4).toString("hex");
    user = await prisma.user.update({
      where: { id: session.user.id },
      data: { referralCode: code },
      select: { referralCode: true },
    });
  }

  // Count referrals
  const referralCount = await prisma.user.count({
    where: { referredBy: user.referralCode },
  });

  return NextResponse.json({
    referralCode: user.referralCode,
    referralCount,
  });
}
