import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createApiLogger, extractErrorDetails } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { randomBytes } from "crypto";

// GET /api/referrals - Fetch referral stats for the current user
export async function GET() {
  const session = await auth();
  const log = createApiLogger("/api/referrals", "GET", session?.user?.id);

  if (!session?.user?.id) {
    return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
  }

  try {
    // Get or create referral code
    let user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { referralCode: true, createdAt: true },
    });

    if (!user) {
      return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "User not found"), { status: 404 });
    }

    // Auto-generate referral code if missing
    if (!user.referralCode) {
      const code = generateReferralCode();
      await prisma.user.update({
        where: { id: session.user.id },
        data: { referralCode: code },
      });
      user = { ...user, referralCode: code };
    }

    // Count referred users and their statuses
    const referredUsers = await prisma.user.findMany({
      where: { referredBy: user.referralCode },
      select: {
        id: true,
        email: true,
        createdAt: true,
        subscription: {
          select: { tier: true, status: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    const totalReferrals = referredUsers.length;
    const activeReferrals = referredUsers.filter((u) => {
      const sub = u.subscription;
      return sub && sub.tier !== "FREE" && sub.status === "active";
    }).length;
    const pendingReferrals = totalReferrals - activeReferrals;

    // Mask emails for privacy (show first 2 chars + domain)
    const referralList = referredUsers.map((u) => {
      const [local, domain] = u.email.split("@");
      const maskedLocal = local.slice(0, 2) + "***";
      return {
        id: u.id,
        email: `${maskedLocal}@${domain}`,
        date: u.createdAt,
        status:
          u.subscription?.tier !== "FREE" && u.subscription?.status === "active"
            ? "active"
            : "pending",
      };
    });

    return NextResponse.json({
      referralCode: user.referralCode,
      stats: {
        total: totalReferrals,
        active: activeReferrals,
        pending: pendingReferrals,
      },
      referrals: referralList,
    });
  } catch (error) {
    log.error({ error: extractErrorDetails(error) }, "Failed to fetch referral stats");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Failed to fetch referral stats"), {
      status: 500,
    });
  }
}

function generateReferralCode(): string {
  // Generate a short, URL-safe referral code (8 chars)
  return randomBytes(6)
    .toString("base64url")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 8)
    .toUpperCase();
}
