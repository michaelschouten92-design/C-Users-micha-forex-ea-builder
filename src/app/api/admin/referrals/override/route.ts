import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdmin } from "@/lib/admin";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { logAuditEvent, getAuditContext } from "@/lib/audit";

const log = logger.child({ module: "referral-override" });

/**
 * POST: Override attribution for a user (admin only).
 * Changes which partner receives commission for future invoices.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const adminCheck = await checkAdmin();
  if (!adminCheck.authorized) return adminCheck.response;

  const session = await auth();
  const body = await request.json();
  const { referredUserId, reason } = body;
  const newPartnerCode: string | null =
    typeof body.newPartnerCode === "string"
      ? body.newPartnerCode.trim().toUpperCase()
      : body.newPartnerCode === null
        ? null
        : null;

  if (!referredUserId || !reason) {
    return NextResponse.json({ error: "referredUserId and reason required" }, { status: 400 });
  }

  // Find new partner (null = remove attribution)
  let newPartnerId: string | null = null;
  if (newPartnerCode) {
    const newPartner = await prisma.referralPartner.findFirst({
      where: { user: { referralCode: newPartnerCode }, status: "ACTIVE" },
      select: { id: true },
    });
    if (!newPartner) {
      return NextResponse.json({ error: "Partner not found or not active" }, { status: 404 });
    }
    newPartnerId = newPartner.id;
  }

  const existing = await prisma.referralAttribution.findUnique({
    where: { referredUserId },
  });

  if (existing && newPartnerId && newPartnerCode) {
    // Override: update existing row (@@unique(referredUserId) means one row per user)
    await prisma.referralAttribution.update({
      where: { id: existing.id },
      data: {
        partnerId: newPartnerId,
        referralCode: newPartnerCode,
        status: existing.status === "CONFIRMED" ? "CONFIRMED" : "PENDING",
        overriddenBy: session?.user?.id ?? null,
        overriddenAt: new Date(),
        previousPartnerId: existing.partnerId,
      },
    });
  } else if (existing && !newPartnerId) {
    // Remove attribution
    await prisma.referralAttribution.update({
      where: { id: existing.id },
      data: {
        status: "REJECTED",
        rejectedAt: new Date(),
        rejectedReason: reason,
      },
    });
  } else if (!existing && newPartnerId && newPartnerCode) {
    // Create new attribution
    await prisma.referralAttribution.create({
      data: {
        referredUserId,
        partnerId: newPartnerId,
        referralCode: newPartnerCode,
        status: "PENDING",
      },
    });
  }

  log.info(
    {
      adminId: session?.user?.id,
      referredUserId,
      newPartnerCode,
      previousPartnerId: existing?.partnerId,
      reason,
    },
    "referral:attribution-overridden"
  );

  await logAuditEvent({
    userId: session?.user?.id ?? null,
    eventType: "referral.attribution_override",
    resourceType: "referral_attribution",
    resourceId: referredUserId,
    metadata: {
      newPartnerCode,
      newPartnerId,
      previousPartnerId: existing?.partnerId ?? null,
      reason,
    },
    ...getAuditContext(request),
  });

  return NextResponse.json({ success: true });
}
