import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { sendAccountDeletedEmail } from "@/lib/email";
import { logAuditEvent } from "@/lib/audit";
import { createHash } from "crypto";
import { safeReadJson, checkContentType } from "@/lib/validations";
import { validateCsrfToken } from "@/lib/csrf";
import {
  gdprDeleteRateLimiter,
  checkRateLimit,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";
import bcrypt from "bcryptjs";

/**
 * DELETE /api/account/delete - GDPR account deletion
 * Permanently deletes the user account and all associated data.
 * Requires confirmation via request body: { confirm: "DELETE" }
 */
export async function DELETE(request: NextRequest) {
  if (!validateCsrfToken(request)) {
    return NextResponse.json(
      { error: "Your session has expired. Please refresh the page and try again." },
      { status: 403 }
    );
  }

  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Refuse account deletion while an admin is impersonating this user. The
  // delete would otherwise be attributed to the user but actually executed
  // by the admin — non-repudiation failure plus a coercion vector.
  if (session.user.impersonatorId) {
    return NextResponse.json(
      {
        error: "Stop impersonating this user before performing destructive actions.",
        code: "IMPERSONATION_BLOCKED",
      },
      { status: 403 }
    );
  }

  // Rate limit: 2 attempts per 24 hours
  const rateLimitResult = await checkRateLimit(
    gdprDeleteRateLimiter,
    `gdpr-delete:${session.user.id}`
  );
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: formatRateLimitError(rateLimitResult) },
      { status: 429, headers: createRateLimitHeaders(rateLimitResult) }
    );
  }

  const contentTypeError = checkContentType(request);
  if (contentTypeError) return contentTypeError;

  const result = await safeReadJson(request);
  if ("error" in result) return result.error;
  const body = result.data as Record<string, unknown>;

  try {
    if (
      String(body?.confirm ?? "")
        .trim()
        .toUpperCase() !== "DELETE"
    ) {
      return NextResponse.json(
        { error: 'Confirmation required. Send { confirm: "DELETE" } to proceed.' },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    // Fetch user record (email + password hash for verification)
    const userRecord = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, passwordHash: true },
    });

    // Password verification: required for credential users, skipped for OAuth-only
    if (userRecord?.passwordHash) {
      const password = typeof body?.password === "string" ? body.password : "";
      if (!password) {
        return NextResponse.json(
          { error: "Password is required to delete your account." },
          { status: 400 }
        );
      }
      const isValid = await bcrypt.compare(password, userRecord.passwordHash);
      if (!isValid) {
        return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
      }
    }

    // Block deletion if the user is a referral partner with financial records.
    // The ReferralLedger is an append-only audit trail and cascading a delete
    // would destroy commission history needed for accounting and tax records.
    // These users must be manually anonymized by support — the ledger stays
    // intact under the "legitimate interest" exception to GDPR erasure (EU
    // bookkeeping retention requirements typically 7 years).
    const partner = await prisma.referralPartner.findUnique({
      where: { userId },
      select: {
        totalEarnedCents: true,
        ledger: { select: { id: true }, take: 1 },
      },
    });
    if (partner && (partner.totalEarnedCents > 0 || partner.ledger.length > 0)) {
      return NextResponse.json(
        {
          error:
            "Your account has referral partner commission records that must be retained for tax and audit purposes. Please contact support@algo-studio.com to request account anonymization — your personal data will be removed while the financial ledger is preserved.",
        },
        { status: 409 }
      );
    }

    // Cancel Stripe first - if DB cleanup fails, cron will catch the orphaned subscription.
    // This order is deliberate: Stripe cancellation is idempotent and safe to retry,
    // whereas deleting DB records before cancelling Stripe could leave active billing.
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (subscription?.stripeSubId) {
      try {
        const { getStripe } = await import("@/lib/stripe");
        const stripeSub = await getStripe().subscriptions.retrieve(subscription.stripeSubId);
        // Only cancel if not already cancelled (safe for retries)
        if (stripeSub.status !== "canceled") {
          await getStripe().subscriptions.cancel(subscription.stripeSubId);
        }
      } catch (stripeError) {
        // If subscription is already deleted/cancelled in Stripe, proceed with DB cleanup
        const err = stripeError as { code?: string; statusCode?: number };
        if (err.statusCode === 404 || err.code === "resource_missing") {
          logger.warn(
            { userId },
            "Stripe subscription already deleted, proceeding with account deletion"
          );
        } else {
          // Log the Stripe error but proceed with GDPR deletion — user's right to be deleted takes priority
          logger.error(
            { error: stripeError, userId },
            "Failed to cancel Stripe subscription during account deletion — proceeding with deletion anyway"
          );
        }
      }
    }

    // Delete the Stripe customer record so PII (billing address, payment
    // methods, invoice history) doesn't linger at the processor after
    // we confirm "account deleted". Stripe retains a tombstone for legal
    // bookkeeping (PSD2 / anti-money-laundering retention typically
    // 5-7 years) — that's outside our control and disclosed in the
    // privacy policy. Our obligation is to stop being a controller.
    if (subscription?.stripeCustomerId) {
      try {
        const { getStripe } = await import("@/lib/stripe");
        await getStripe().customers.del(subscription.stripeCustomerId);
      } catch (stripeError) {
        const err = stripeError as { code?: string; statusCode?: number };
        if (err.statusCode === 404 || err.code === "resource_missing") {
          logger.warn(
            { userId, stripeCustomerId: subscription.stripeCustomerId },
            "Stripe customer already deleted, proceeding"
          );
        } else {
          logger.error(
            { error: stripeError, userId, stripeCustomerId: subscription.stripeCustomerId },
            "Failed to delete Stripe customer — proceeding with DB deletion (manual cleanup required)"
          );
        }
      }
    }

    // Delete all user data in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete tokens by email (not FK-based, won't cascade)
      if (userRecord) {
        await tx.passwordResetToken.deleteMany({ where: { email: userRecord.email } });
        await tx.emailVerificationToken.deleteMany({ where: { email: userRecord.email } });
      }

      // Anonymize audit logs instead of hard-deleting them. GDPR Art. 17
      // requires erasure of personal data, not destruction of the
      // accountability trail (Art. 5(2)). Setting userId/ipAddress/userAgent
      // to null removes the link to the natural person while preserving
      // the operational record (eventType, resourceType, resourceId).
      await tx.auditLog.updateMany({
        where: { userId },
        data: { userId: null, ipAddress: null, userAgent: null },
      });

      // Clear referral references from other users (GDPR right to erasure)
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { referralCode: true },
      });
      if (user?.referralCode) {
        await tx.user.updateMany({
          where: { referredBy: user.referralCode },
          data: { referredBy: null },
        });
      }

      // Delete user (cascades to Subscription, Project, BuildVersion, ExportJob, UserTemplate, LiveEAInstance)
      await tx.user.delete({ where: { id: userId } });
    });

    logger.info({ userId }, "GDPR account deletion completed");

    // Persistent compliance trail of the erasure event itself, with NO PII
    // (only an email-hash). The user-row is gone, so userId on this audit
    // entry is null — but the event remains as evidence that we honoured
    // the request even if the confirmation email below silently fails.
    if (userRecord?.email) {
      const emailHash = createHash("sha256").update(userRecord.email.toLowerCase()).digest("hex");
      await logAuditEvent({
        userId: null,
        eventType: "account.deletion_requested",
        resourceType: "user",
        resourceId: userId,
        metadata: { emailHash, completedAt: new Date().toISOString() },
      }).catch((err) =>
        logger.warn({ err }, "Failed to write account-deletion audit log (non-blocking)")
      );
    }

    // Send confirmation email (fire-and-forget, after deletion). The audit
    // entry above is the durable proof — this email is a courtesy.
    if (userRecord?.email) {
      sendAccountDeletedEmail(userRecord.email).catch((err) =>
        logger.warn({ error: err }, "Failed to send account deletion confirmation email")
      );
    }

    const response = NextResponse.json({
      success: true,
      message: "Account and all associated data have been permanently deleted.",
    });

    // Clear session cookies so the deleted user is logged out
    const cookieName =
      process.env.NODE_ENV === "production"
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token";
    response.cookies.set(cookieName, "", { maxAge: 0, path: "/" });

    return response;
  } catch (error) {
    logger.error({ error, userId: session.user.id }, "GDPR account deletion failed");
    return NextResponse.json({ error: "Account deletion failed" }, { status: 500 });
  }
}
