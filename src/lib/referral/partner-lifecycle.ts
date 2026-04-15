import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";
import { logAuditEvent } from "@/lib/audit";

const log = logger.child({ module: "referral-partner-lifecycle" });

/**
 * Suspend a referral partner when their subscription drops to FREE. The
 * /api/referral/partner POST gate requires a paid tier to register, so the
 * same constraint must apply on downgrade — otherwise an ACTIVE partner
 * keeps earning commission after they stop paying for the product.
 *
 * Idempotent: only ACTIVE partners are touched. SUSPENDED/TERMINATED stay
 * as they are (admin already made a call). Non-partners are no-ops.
 *
 * Fire-and-forget from webhook handlers: errors are logged, never thrown,
 * because subscription transitions must commit even if the partner-side
 * housekeeping fails.
 */
export async function suspendPartnerOnDowngrade(userId: string): Promise<void> {
  try {
    // Atomic flip + read in one transaction so a concurrent partner delete
    // can't slip in between updateMany and findUnique. updateMany is needed
    // to filter on status (Prisma's `update.where` only accepts unique
    // selectors).
    const partnerId = await prisma.$transaction(async (tx) => {
      const flipped = await tx.referralPartner.updateMany({
        where: { userId, status: "ACTIVE" },
        data: { status: "SUSPENDED" },
      });
      if (flipped.count === 0) return null;
      const row = await tx.referralPartner.findUnique({
        where: { userId },
        select: { id: true },
      });
      return row?.id ?? null;
    });
    if (!partnerId) return;

    await logAuditEvent({
      userId: null, // system action triggered by Stripe webhook
      eventType: "referral.partner_status_change",
      resourceType: "referral_partner",
      resourceId: partnerId,
      metadata: {
        from: "ACTIVE",
        to: "SUSPENDED",
        reason: "tier_downgrade_to_free",
        triggeredBy: "stripe_webhook",
      },
    });

    log.info({ userId, partnerId }, "referral:partner-suspended-on-downgrade");
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return;
    }
    log.error({ err, userId }, "referral:partner-suspend-on-downgrade-failed");
  }
}
