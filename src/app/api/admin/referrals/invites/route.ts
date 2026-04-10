import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdmin } from "@/lib/admin";
import { env } from "@/lib/env";

/**
 * GET: List all referral invites with claim status.
 */
export async function GET(): Promise<NextResponse> {
  const adminCheck = await checkAdmin();
  if (!adminCheck.authorized) return adminCheck.response;

  const invites = await prisma.referralInvite.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  // Look up claimed user emails
  const claimedUserIds = invites
    .map((i) => i.claimedByUserId)
    .filter((id): id is string => id != null);

  const users =
    claimedUserIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: claimedUserIds } },
          select: { id: true, email: true },
        })
      : [];
  const userMap = new Map(users.map((u) => [u.id, u.email]));

  const baseUrl = env.AUTH_URL;

  return NextResponse.json({
    data: invites.map((i) => ({
      id: i.id,
      inviteUrl: `${baseUrl}/app/referrals?invite=${i.token}`,
      commissionPct: i.commissionBps / 100,
      status: i.claimedByUserId ? "CLAIMED" : i.expiresAt < new Date() ? "EXPIRED" : "ACTIVE",
      claimedByEmail: i.claimedByUserId ? (userMap.get(i.claimedByUserId) ?? null) : null,
      claimedAt: i.claimedAt?.toISOString() ?? null,
      expiresAt: i.expiresAt.toISOString(),
      createdAt: i.createdAt.toISOString(),
    })),
  });
}

/**
 * DELETE: Delete an unclaimed invite.
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const adminCheck = await checkAdmin();
  if (!adminCheck.authorized) return adminCheck.response;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const invite = await prisma.referralInvite.findUnique({ where: { id } });
  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }
  if (invite.claimedByUserId) {
    return NextResponse.json({ error: "Cannot delete a claimed invite" }, { status: 400 });
  }

  await prisma.referralInvite.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
