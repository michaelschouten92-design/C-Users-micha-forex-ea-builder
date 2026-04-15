import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { checkAdmin } from "@/lib/admin";
import { logAuditEvent, getAuditContext } from "@/lib/audit";
import { invalidateSubscriptionCache } from "@/lib/plan-limits";
import {
  adminMutationRateLimiter,
  checkRateLimit,
  formatRateLimitError,
  createRateLimitHeaders,
} from "@/lib/rate-limit";
import { checkContentType, safeReadJson } from "@/lib/validations";

const anonymizeSchema = z.object({
  email: z.string().email(),
  reason: z.string().min(10).max(500),
});

/**
 * POST /api/admin/users/anonymize
 *
 * Anonymizes a user that cannot be hard-deleted (typically a referral
 * partner with commission-ledger entries that must be retained for tax
 * and accounting purposes). Strips all personal data while preserving
 * the financial trail in ReferralLedger / ReferralPayout, which falls
 * under the "legitimate interest" carve-out of GDPR Art. 17(3)(b/e).
 *
 * Effects:
 *   - User row: email replaced with deleted-<id>@removed.local, password
 *     hash + all 3rd-party identifiers + referral fields nullified,
 *     suspended=true, deletedAt=now.
 *   - ReferralPartner row (if present): payout details (IBAN, account
 *     holder, payout email) nullified.
 *   - AuditLog rows for this user: userId/ipAddress/userAgent nullified
 *     so the operational trail survives without identifying the user.
 *   - Stripe customer: deleted at the processor (parallel to the regular
 *     delete-flow's behaviour).
 *
 * NOT touched:
 *   - ReferralLedger / ReferralPayout (financial records)
 *   - ReferralAttribution (preserves partner credit on referred users)
 */
export async function POST(request: NextRequest) {
  const adminCheck = await checkAdmin();
  if (!adminCheck.authorized) return adminCheck.response;

  const rl = await checkRateLimit(
    adminMutationRateLimiter,
    `admin-mut:${adminCheck.session.user.id}`
  );
  if (!rl.success) {
    return NextResponse.json(
      { error: formatRateLimitError(rl) },
      { status: 429, headers: createRateLimitHeaders(rl) }
    );
  }

  const contentTypeError = checkContentType(request);
  if (contentTypeError) return contentTypeError;

  const result = await safeReadJson(request);
  if ("error" in result) return result.error;

  const validation = anonymizeSchema.safeParse(result.data);
  if (!validation.success) {
    return NextResponse.json(
      apiError(
        ErrorCode.VALIDATION_FAILED,
        "Validation failed",
        validation.error.errors.map((e) => e.message)
      ),
      { status: 400 }
    );
  }
  const { email, reason } = validation.data;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, subscription: { select: { stripeCustomerId: true } } },
  });
  if (!user) {
    return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "User not found"), { status: 404 });
  }
  const userId = user.id;

  // Delete Stripe customer (best-effort) — same pattern as account/delete.
  if (user.subscription?.stripeCustomerId) {
    try {
      const { getStripe } = await import("@/lib/stripe");
      await getStripe().customers.del(user.subscription.stripeCustomerId);
    } catch (err) {
      const stripeErr = err as { code?: string; statusCode?: number };
      if (stripeErr.statusCode !== 404 && stripeErr.code !== "resource_missing") {
        logger.error(
          { err, userId, stripeCustomerId: user.subscription.stripeCustomerId },
          "Stripe customer delete failed during anonymization — continuing"
        );
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        email: `deleted-${userId}@removed.local`,
        passwordHash: null,
        passwordChangedAt: null,
        discordId: null,
        discordAccessToken: null,
        discordRefreshToken: null,
        telegramChatId: null,
        telegramBotToken: null,
        slackWebhookUrl: null,
        webhookUrl: null,
        referredBy: null,
        handle: null,
        suspended: true,
        suspendedAt: new Date(),
        suspendedReason: `anonymized: ${reason}`,
        adminNotes: `Anonymized by admin ${adminCheck.session.user.id} (${new Date().toISOString()}): ${reason}`,
      },
    });

    await tx.referralPartner.updateMany({
      where: { userId },
      data: {
        payoutEmail: null,
        payoutIban: null,
        payoutAccountHolder: null,
      },
    });

    await tx.auditLog.updateMany({
      where: { userId },
      data: { userId: null, ipAddress: null, userAgent: null },
    });
  });

  invalidateSubscriptionCache(userId);

  await logAuditEvent({
    userId: adminCheck.session.user.id,
    eventType: "account.anonymized",
    resourceType: "user",
    resourceId: userId,
    metadata: { reason, originalEmail: email },
    ...getAuditContext(request),
  });

  logger.info({ adminId: adminCheck.session.user.id, userId }, "User anonymized");

  return NextResponse.json({ success: true, userId });
}
