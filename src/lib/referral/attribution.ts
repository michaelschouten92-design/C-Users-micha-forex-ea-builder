/**
 * Create a ReferralAttribution for a newly registered user.
 * Only creates attribution if the referrer is a partner (ACTIVE or PENDING).
 * Fire-and-forget: errors are logged, not thrown.
 */

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "referral-attribution" });

export async function createAttributionForSignup(
  userId: string,
  referralCode: string
): Promise<void> {
  try {
    const partner = await prisma.referralPartner.findFirst({
      where: {
        user: { referralCode },
        status: { in: ["ACTIVE", "PENDING"] },
      },
      select: { id: true },
    });

    if (!partner) return;

    await prisma.referralAttribution.create({
      data: {
        referredUserId: userId,
        partnerId: partner.id,
        referralCode,
      },
    });

    log.info({ userId, partnerId: partner.id }, "referral:attribution-created");
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return; // Already exists (idempotent)
    }
    log.error({ err, userId, referralCode }, "referral:attribution-creation-failed");
  }
}
