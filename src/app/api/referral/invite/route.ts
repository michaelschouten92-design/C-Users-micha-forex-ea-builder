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

  // Find invite for early validation messages (race-safe claim happens in tx).
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

  // Atomic claim + partner upsert. Two flows can race past the early check
  // above; the updateMany WHERE claimedByUserId IS NULL acts as the
  // compare-and-swap so only one user successfully claims a given token.
  // SUSPENDED/TERMINATED partners cannot self-promote back to ACTIVE via
  // an invite — that path required an admin's involvement originally and
  // must require it again.
  try {
    await prisma.$transaction(async (tx) => {
      const claim = await tx.referralInvite.updateMany({
        where: { id: invite.id, claimedByUserId: null },
        data: { claimedByUserId: session.user.id, claimedAt: new Date() },
      });
      if (claim.count === 0) {
        throw new InviteAlreadyClaimedError();
      }

      try {
        await tx.referralPartner.create({
          data: {
            userId: session.user.id,
            commissionBps: invite.commissionBps,
            status: "ACTIVE", // Invite = pre-approved
          },
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
          // Already a partner — only re-activate if not currently SUSPENDED
          // or TERMINATED. Those statuses were set by an admin on purpose
          // and must not be self-cleared by re-using an invite.
          const promoted = await tx.referralPartner.updateMany({
            where: {
              userId: session.user.id,
              status: { notIn: ["SUSPENDED", "TERMINATED"] },
            },
            data: { commissionBps: invite.commissionBps, status: "ACTIVE" },
          });
          if (promoted.count === 0) {
            throw new PartnerLockedError();
          }
        } else {
          throw err;
        }
      }
    });
  } catch (err) {
    if (err instanceof InviteAlreadyClaimedError) {
      return NextResponse.json({ error: "This invite has already been used" }, { status: 410 });
    }
    if (err instanceof PartnerLockedError) {
      return NextResponse.json(
        { error: "Your partner account is locked — contact support to reactivate." },
        { status: 403 }
      );
    }
    throw err;
  }

  return NextResponse.json({
    success: true,
    commissionPct: invite.commissionBps / 100,
  });
}

class InviteAlreadyClaimedError extends Error {}
class PartnerLockedError extends Error {}
