/**
 * Referral commission booking and reversal.
 *
 * Design principles:
 * - Payments are truth (invoice.paid only)
 * - Append-only ledger (no mutations)
 * - Integer cents (no floating point money)
 * - Idempotent (unique constraint on [stripeInvoiceId, type])
 * - Fail-closed (unclear attribution → no commission)
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { Prisma } from "@prisma/client";
import type Stripe from "stripe";
import { REFERRAL_CURRENCY } from "./constants";

const log = logger.child({ module: "referral" });

/**
 * Extract the tax-exclusive commission base from a Stripe invoice.
 * Returns amount in cents. Returns 0 for zero-value invoices.
 */
export function getCommissionBaseCents(invoice: Stripe.Invoice): number {
  const amountPaid = invoice.amount_paid; // cents
  if (amountPaid <= 0) return 0;

  // Total tax from line items (Stripe may not have top-level .tax on all API versions)
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const topLevelTax =
    typeof (invoice as any).tax === "number" ? ((invoice as any).tax as number) : null;
  /* eslint-enable @typescript-eslint/no-explicit-any */

  if (topLevelTax != null) {
    return Math.max(0, amountPaid - topLevelTax);
  }

  // Fallback: sum tax_amounts from line items
  const totalTax = (invoice.lines?.data ?? []).reduce((sum, line) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const taxAmounts = (line as any).tax_amounts as Array<{ amount: number }> | undefined;
    return sum + (taxAmounts ?? []).reduce((s, t) => s + t.amount, 0);
  }, 0);

  return Math.max(0, amountPaid - totalTax);
}

/** Extract total tax cents from an invoice (for audit trail). */
function getInvoiceTaxCents(invoice: Stripe.Invoice): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof (invoice as any).tax === "number") return (invoice as any).tax as number;

  return (invoice.lines?.data ?? []).reduce((sum, line) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const taxAmounts = (line as any).tax_amounts as Array<{ amount: number }> | undefined;
    return sum + (taxAmounts ?? []).reduce((s, t) => s + t.amount, 0);
  }, 0);
}

/**
 * Book a commission for a paid invoice.
 * Called from the invoice.paid webhook handler.
 *
 * Idempotent: duplicate calls for the same invoice are absorbed
 * via the @@unique([stripeInvoiceId, type]) constraint.
 */
export async function bookCommission(invoice: Stripe.Invoice, userId: string): Promise<void> {
  // 1. Find attribution for this user
  const attribution = await prisma.referralAttribution.findUnique({
    where: { referredUserId: userId },
    include: { partner: true },
  });

  if (!attribution) return; // No attribution → no commission
  if (attribution.status === "REJECTED") return;
  if (attribution.partner.status !== "ACTIVE") return; // Partner must be ACTIVE

  const partner = attribution.partner;
  const invoiceId = invoice.id;

  // 2. Calculate commission
  const commissionBaseCents = getCommissionBaseCents(invoice);
  if (commissionBaseCents <= 0) return; // Zero-value invoice

  const commissionCents = Math.floor((commissionBaseCents * partner.commissionBps) / 10000);
  if (commissionCents <= 0) return;

  // 3. Atomically confirm attribution + book commission
  // Wrapped in a transaction so a crash cannot leave attribution CONFIRMED
  // without a matching ledger entry.
  try {
    await prisma.$transaction(async (tx) => {
      // Confirm attribution on first paid invoice
      if (attribution.status === "PENDING") {
        await tx.referralAttribution.update({
          where: { id: attribution.id },
          data: { status: "CONFIRMED", confirmedAt: new Date() },
        });
      }

      // Book commission (idempotent via unique constraint)
      await tx.referralLedger.create({
        data: {
          partnerId: partner.id,
          type: "COMMISSION_EARNED",
          referredUserId: userId,
          stripeInvoiceId: invoiceId,
          amountCents: commissionCents,
          currency: REFERRAL_CURRENCY,
          commissionBps: partner.commissionBps,
          invoiceSubtotalCents: commissionBaseCents,
          invoiceTaxCents: getInvoiceTaxCents(invoice),
          description: `Commission on invoice ${invoiceId}`,
        },
      });

      // Update cached aggregate (not source of truth)
      await tx.referralPartner.update({
        where: { id: partner.id },
        data: { totalEarnedCents: { increment: commissionCents } },
      });
    });

    log.info(
      {
        partnerId: partner.id,
        userId,
        invoiceId,
        commissionCents,
        baseCents: commissionBaseCents,
        bps: partner.commissionBps,
      },
      "referral:commission-booked"
    );
  } catch (err) {
    // P2002 = unique constraint violation → already booked (idempotent)
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      log.info({ invoiceId }, "referral:commission-already-booked");
      return;
    }
    throw err;
  }
}

/** Grace period for commission reversal on refunds — matches Terms §10.4. */
const REVERSAL_GRACE_PERIOD_MS = 60 * 24 * 60 * 60 * 1000; // 60 days

interface BookReversalOptions {
  /**
   * Reason for reversal, determines policy:
   * - "refund" (default): only full refunds within 60 days trigger reversal.
   *   Partial refunds and refunds past 60 days are skipped per Terms §10.4.
   * - "chargeback": always reverse in full, regardless of timing.
   *   Called from the charge.dispute.closed handler when a dispute is lost.
   */
  reason?: "refund" | "chargeback";
}

/**
 * Book a reversal for a refunded or disputed charge.
 *
 * Policy (Terms §10.4):
 *   - Full refund within 60 days of original charge → full reversal
 *   - Chargeback (dispute lost)                     → full reversal (any time)
 *   - Partial refund                                → no reversal
 *   - Refund past 60 days                           → no reversal
 *
 * Called from:
 *   - charge.refunded webhook handler (reason: "refund")
 *   - charge.dispute.closed (status: lost) handler (reason: "chargeback")
 */
export async function bookReversal(
  charge: Stripe.Charge,
  options: BookReversalOptions = {}
): Promise<void> {
  const reason = options.reason ?? "refund";

  // charge.invoice may be a string ID, an expanded object, or absent
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawInvoice = (charge as any).invoice;
  const invoiceId =
    typeof rawInvoice === "string"
      ? rawInvoice
      : typeof rawInvoice === "object" && rawInvoice !== null
        ? ((rawInvoice as { id?: string }).id ?? null)
        : null;
  if (!invoiceId) return;

  // Find original commission
  const original = await prisma.referralLedger.findFirst({
    where: { stripeInvoiceId: invoiceId, type: "COMMISSION_EARNED" },
  });
  if (!original) return; // No commission to reverse

  // -----------------------------------------------------------------
  // Policy check — different rules for refunds vs chargebacks
  // -----------------------------------------------------------------
  if (reason === "refund") {
    const originalChargeCents = charge.amount;
    const refundedCents = charge.amount_refunded;
    if (originalChargeCents <= 0 || refundedCents <= 0) return;

    // Skip partial refunds — only full refunds trigger reversal
    const isFullRefund = charge.refunded === true || refundedCents >= originalChargeCents;
    if (!isFullRefund) {
      log.info(
        { invoiceId, chargeId: charge.id, refundedCents, originalChargeCents },
        "referral:partial-refund-no-reversal"
      );
      return;
    }

    // Skip refunds past the 60-day grace period
    const chargeCreatedMs = charge.created * 1000;
    const ageMs = Date.now() - chargeCreatedMs;
    if (ageMs > REVERSAL_GRACE_PERIOD_MS) {
      log.info(
        {
          invoiceId,
          chargeId: charge.id,
          ageDays: Math.floor(ageMs / (24 * 60 * 60 * 1000)),
        },
        "referral:refund-past-grace-period-no-reversal"
      );
      return;
    }
  }
  // Chargebacks: always reverse, no time limit, no full-refund check
  // (the dispute is lost regardless of refund amount → commission invalid)

  // Already reversed for this invoice
  const alreadyReversed = await prisma.referralLedger.aggregate({
    where: { stripeInvoiceId: invoiceId, type: "COMMISSION_REVERSED" },
    _sum: { amountCents: true },
  });
  const alreadyReversedCents = Math.abs(alreadyReversed._sum.amountCents ?? 0);

  // Reverse the full commission (minus anything already reversed)
  const thisReversalCents = Math.max(0, original.amountCents - alreadyReversedCents);
  if (thisReversalCents <= 0) return;

  const description =
    reason === "chargeback"
      ? `Reversal: chargeback lost on charge ${charge.id}`
      : `Reversal: full refund on charge ${charge.id}`;

  try {
    await prisma.referralLedger.create({
      data: {
        partnerId: original.partnerId,
        type: "COMMISSION_REVERSED",
        referredUserId: original.referredUserId,
        stripeInvoiceId: invoiceId,
        stripeChargeId: charge.id,
        amountCents: -thisReversalCents,
        currency: original.currency,
        description,
      },
    });

    // Update cached aggregate
    await prisma.referralPartner.update({
      where: { id: original.partnerId },
      data: { totalEarnedCents: { decrement: thisReversalCents } },
    });

    log.info(
      {
        partnerId: original.partnerId,
        invoiceId,
        chargeId: charge.id,
        reason,
        reversalCents: thisReversalCents,
      },
      "referral:commission-reversed"
    );
  } catch (err) {
    // P2002 safety net — belt-and-suspenders for any future unique constraint.
    // The partial unique index only covers COMMISSION_EARNED, so this catch
    // currently cannot fire for reversals. Kept as defensive guard.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      log.info({ invoiceId, chargeId: charge.id }, "referral:reversal-already-booked");
      return;
    }
    throw err;
  }
}
