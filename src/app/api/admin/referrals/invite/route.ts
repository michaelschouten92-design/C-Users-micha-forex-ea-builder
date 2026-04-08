import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdmin } from "@/lib/admin";
import { auth } from "@/lib/auth";
import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";

const INVITE_TTL_DAYS = 30;

/**
 * POST: Create an invite link or directly activate a user as partner.
 *
 * Body options:
 * - { action: "invite", commissionPct: 20 } → generates invite link
 * - { action: "activate", email: "...", commissionPct: 20 } → directly activates user as partner
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const adminCheck = await checkAdmin();
  if (!adminCheck.authorized) return adminCheck.response;

  const session = await auth();
  const body = await request.json();
  const { action, commissionPct = 20 } = body;

  if (typeof commissionPct !== "number" || commissionPct < 0 || commissionPct > 100) {
    return NextResponse.json({ error: "commissionPct must be 0–100" }, { status: 400 });
  }
  const bps = Math.round(commissionPct * 100);

  if (action === "invite") {
    const token = randomUUID();
    await prisma.referralInvite.create({
      data: {
        token,
        commissionBps: bps,
        createdBy: session?.user?.id ?? "admin",
        expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000),
      },
    });

    const baseUrl = process.env.AUTH_URL || "https://algo-studio.com";
    const inviteUrl = `${baseUrl}/app/referrals?invite=${token}`;

    return NextResponse.json({ inviteUrl, token, expiresInDays: INVITE_TTL_DAYS });
  }

  if (action === "activate") {
    const { email } = body;
    if (!email) {
      return NextResponse.json({ error: "email required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    try {
      const partner = await prisma.referralPartner.create({
        data: {
          userId: user.id,
          commissionBps: bps,
          status: "ACTIVE",
        },
      });
      return NextResponse.json({
        partner: { id: partner.id, email: user.email, status: "ACTIVE", commissionPct },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        // Already a partner — update their commission and activate
        const partner = await prisma.referralPartner.update({
          where: { userId: user.id },
          data: { commissionBps: bps, status: "ACTIVE" },
        });
        return NextResponse.json({
          partner: { id: partner.id, email: user.email, status: "ACTIVE", commissionPct },
        });
      }
      throw err;
    }
  }

  return NextResponse.json({ error: "action must be 'invite' or 'activate'" }, { status: 400 });
}
