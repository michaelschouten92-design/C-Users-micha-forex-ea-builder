/**
 * Referral Ledger Health Check / Audit Script
 *
 * Performs read-only integrity checks against the referral system's
 * financial ledger, attributions, payouts, and cached aggregates.
 *
 * Safe to run repeatedly. Does NOT mutate any data.
 *
 * How to run:
 *   npx tsx scripts/referral-ledger-audit.ts
 *
 * Exit codes:
 *   0 = no critical issues
 *   1 = one or more critical issues found
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ── Types ──────────────────────────────────────────────────

type Severity = "OK" | "WARNING" | "CRITICAL";

interface Finding {
  severity: Severity;
  check: string;
  message: string;
  meta?: Record<string, unknown>;
}

const findings: Finding[] = [];

function ok(check: string, message: string): void {
  findings.push({ severity: "OK", check, message });
}

function warn(check: string, message: string, meta?: Record<string, unknown>): void {
  findings.push({ severity: "WARNING", check, message, meta });
}

function critical(check: string, message: string, meta?: Record<string, unknown>): void {
  findings.push({ severity: "CRITICAL", check, message, meta });
}

function header(title: string): void {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${"─".repeat(60)}`);
}

// ── CHECK 1: Duplicate earned commissions per invoice ──────

async function checkDuplicateEarned(): Promise<void> {
  const check = "1. Duplicate COMMISSION_EARNED per invoice";

  const dupes = await prisma.$queryRaw<{ stripeInvoiceId: string; cnt: number }[]>`
    SELECT "stripeInvoiceId", COUNT(*)::int AS cnt
    FROM "ReferralLedger"
    WHERE type = 'COMMISSION_EARNED' AND "stripeInvoiceId" IS NOT NULL
    GROUP BY "stripeInvoiceId"
    HAVING COUNT(*) > 1
  `;

  if (dupes.length === 0) {
    ok(check, "No duplicate earned commissions found");
  } else {
    critical(check, `${dupes.length} invoice(s) with duplicate COMMISSION_EARNED entries`, {
      invoices: dupes.slice(0, 10),
    });
  }
}

// ── CHECK 2: Reversals exceed earned ───────────────────────

async function checkReversalsExceedEarned(): Promise<void> {
  const check = "2. Reversals exceed earned per invoice";

  const violations = await prisma.$queryRaw<
    { stripeInvoiceId: string; earned: number; reversed: number }[]
  >`
    SELECT
      e."stripeInvoiceId",
      e."amountCents" AS earned,
      COALESCE(ABS(r.total), 0)::int AS reversed
    FROM "ReferralLedger" e
    LEFT JOIN (
      SELECT "stripeInvoiceId", SUM("amountCents")::int AS total
      FROM "ReferralLedger"
      WHERE type = 'COMMISSION_REVERSED'
      GROUP BY "stripeInvoiceId"
    ) r ON r."stripeInvoiceId" = e."stripeInvoiceId"
    WHERE e.type = 'COMMISSION_EARNED'
      AND e."stripeInvoiceId" IS NOT NULL
      AND COALESCE(ABS(r.total), 0) > e."amountCents"
  `;

  if (violations.length === 0) {
    ok(check, "All reversals are within earned bounds");
  } else {
    critical(check, `${violations.length} invoice(s) where reversals exceed earned commission`, {
      invoices: violations.slice(0, 10),
    });
  }
}

// ── CHECK 3: Payout composition integrity ──────────────────

async function checkPayoutIntegrity(): Promise<void> {
  const check = "3. Payout composition integrity";

  const payouts = await prisma.referralPayout.findMany({
    where: { status: { in: ["PENDING", "APPROVED", "PAID"] } },
    select: { id: true, amountCents: true, status: true, partnerId: true },
  });

  let issues = 0;

  for (const payout of payouts) {
    // Sum of linked entries (excluding PAYOUT_SENT which is the debit entry)
    const linked = await prisma.referralLedger.aggregate({
      where: { payoutId: payout.id, type: { not: "PAYOUT_SENT" } },
      _sum: { amountCents: true },
    });

    const linkedSum = linked._sum.amountCents ?? 0;

    // The payout amount should match the sum of linked earned/reversed entries
    if (linkedSum !== payout.amountCents && payout.status !== "CANCELLED") {
      critical(
        check,
        `Payout ${payout.id} amount (${payout.amountCents}c) != linked entries sum (${linkedSum}c)`,
        {
          payoutId: payout.id,
          payoutAmount: payout.amountCents,
          linkedSum,
          status: payout.status,
        }
      );
      issues++;
    }
  }

  // Check for ledger rows linked to multiple payouts
  const multiLinked = await prisma.$queryRaw<{ id: string; cnt: number }[]>`
    SELECT id, COUNT(DISTINCT "payoutId")::int AS cnt
    FROM "ReferralLedger"
    WHERE "payoutId" IS NOT NULL
    GROUP BY id
    HAVING COUNT(DISTINCT "payoutId") > 1
  `;

  if (multiLinked.length > 0) {
    critical(check, `${multiLinked.length} ledger row(s) linked to multiple payouts`);
    issues++;
  }

  // Check for PAID payouts without a PAYOUT_SENT entry
  for (const payout of payouts.filter((p) => p.status === "PAID")) {
    const sent = await prisma.referralLedger.count({
      where: { payoutId: payout.id, type: "PAYOUT_SENT" },
    });
    if (sent === 0) {
      critical(check, `PAID payout ${payout.id} has no PAYOUT_SENT ledger entry`, {
        payoutId: payout.id,
      });
      issues++;
    }
  }

  if (issues === 0) {
    ok(check, `${payouts.length} payout(s) verified — all compositions intact`);
  }
}

// ── CHECK 4: Unpaid balance consistency ────────────────────

async function checkUnpaidBalance(): Promise<void> {
  const check = "4. Unpaid balance consistency";

  const partners = await prisma.referralPartner.findMany({
    select: { id: true, userId: true },
  });

  let issues = 0;

  for (const partner of partners) {
    const total = await prisma.referralLedger.aggregate({
      where: { partnerId: partner.id },
      _sum: { amountCents: true },
    });

    const unpaid = await prisma.referralLedger.aggregate({
      where: { partnerId: partner.id, payoutId: null },
      _sum: { amountCents: true },
    });

    const totalBalance = total._sum.amountCents ?? 0;
    const unpaidBalance = unpaid._sum.amountCents ?? 0;

    // Unpaid balance should never exceed total balance
    // (total includes payout debits, unpaid does not)
    if (unpaidBalance > totalBalance + 1) {
      // +1 for rounding tolerance
      warn(check, `Partner ${partner.id}: unpaid (${unpaidBalance}c) > total (${totalBalance}c)`, {
        partnerId: partner.id,
        totalBalance,
        unpaidBalance,
      });
      issues++;
    }
  }

  if (issues === 0) {
    ok(check, `${partners.length} partner(s) — balance consistency verified`);
  }
}

// ── CHECK 5: Orphan ledger rows ────────────────────────────

async function checkOrphanLedgerRows(): Promise<void> {
  const check = "5. Orphan ledger rows";

  // Ledger rows with partnerId not in ReferralPartner
  const orphanPartner = await prisma.$queryRaw<{ cnt: number }[]>`
    SELECT COUNT(*)::int AS cnt FROM "ReferralLedger" l
    LEFT JOIN "ReferralPartner" p ON p.id = l."partnerId"
    WHERE p.id IS NULL
  `;

  if ((orphanPartner[0]?.cnt ?? 0) > 0) {
    critical(check, `${orphanPartner[0].cnt} ledger row(s) reference missing partner`);
  }

  // Ledger rows with payoutId not in ReferralPayout
  const orphanPayout = await prisma.$queryRaw<{ cnt: number }[]>`
    SELECT COUNT(*)::int AS cnt FROM "ReferralLedger" l
    LEFT JOIN "ReferralPayout" po ON po.id = l."payoutId"
    WHERE l."payoutId" IS NOT NULL AND po.id IS NULL
  `;

  if ((orphanPayout[0]?.cnt ?? 0) > 0) {
    critical(check, `${orphanPayout[0].cnt} ledger row(s) reference missing payout`);
  }

  // Ledger rows with referredUserId not in User
  const orphanUser = await prisma.$queryRaw<{ cnt: number }[]>`
    SELECT COUNT(*)::int AS cnt FROM "ReferralLedger" l
    LEFT JOIN "User" u ON u.id = l."referredUserId"
    WHERE l."referredUserId" IS NOT NULL AND u.id IS NULL
  `;

  if ((orphanUser[0]?.cnt ?? 0) > 0) {
    warn(check, `${orphanUser[0].cnt} ledger row(s) reference deleted user (referredUserId)`);
  }

  const totalOrphans =
    (orphanPartner[0]?.cnt ?? 0) + (orphanPayout[0]?.cnt ?? 0) + (orphanUser[0]?.cnt ?? 0);

  if (totalOrphans === 0) {
    ok(check, "No orphan ledger rows found");
  }
}

// ── CHECK 6: Attribution integrity ─────────────────────────

async function checkAttributionIntegrity(): Promise<void> {
  const check = "6. Attribution integrity";
  let issues = 0;

  // Duplicate attributions per user (should be impossible with @@unique)
  const dupeAttr = await prisma.$queryRaw<{ cnt: number }[]>`
    SELECT COUNT(*)::int AS cnt FROM (
      SELECT "referredUserId" FROM "ReferralAttribution"
      GROUP BY "referredUserId" HAVING COUNT(*) > 1
    ) sub
  `;

  if ((dupeAttr[0]?.cnt ?? 0) > 0) {
    critical(check, `${dupeAttr[0].cnt} user(s) with multiple attribution rows`);
    issues++;
  }

  // Attribution referencing missing partner
  const missingPartner = await prisma.$queryRaw<{ cnt: number }[]>`
    SELECT COUNT(*)::int AS cnt FROM "ReferralAttribution" a
    LEFT JOIN "ReferralPartner" p ON p.id = a."partnerId"
    WHERE p.id IS NULL
  `;

  if ((missingPartner[0]?.cnt ?? 0) > 0) {
    critical(check, `${missingPartner[0].cnt} attribution(s) reference missing partner`);
    issues++;
  }

  // Attribution referencing missing user
  const missingUser = await prisma.$queryRaw<{ cnt: number }[]>`
    SELECT COUNT(*)::int AS cnt FROM "ReferralAttribution" a
    LEFT JOIN "User" u ON u.id = a."referredUserId"
    WHERE u.id IS NULL
  `;

  if ((missingUser[0]?.cnt ?? 0) > 0) {
    warn(check, `${missingUser[0].cnt} attribution(s) reference deleted user`);
    issues++;
  }

  // Confirmed attributions whose partner is not ACTIVE
  const inactivePartner = await prisma.$queryRaw<{ cnt: number }[]>`
    SELECT COUNT(*)::int AS cnt FROM "ReferralAttribution" a
    JOIN "ReferralPartner" p ON p.id = a."partnerId"
    WHERE a.status = 'CONFIRMED' AND p.status != 'ACTIVE'
  `;

  if ((inactivePartner[0]?.cnt ?? 0) > 0) {
    warn(
      check,
      `${inactivePartner[0].cnt} confirmed attribution(s) with non-ACTIVE partner (suspended or terminated)`
    );
    issues++;
  }

  // Users with referredBy but no ReferralAttribution
  const missingAttr = await prisma.$queryRaw<{ cnt: number }[]>`
    SELECT COUNT(*)::int AS cnt FROM "User" u
    LEFT JOIN "ReferralAttribution" a ON a."referredUserId" = u.id
    WHERE u."referredBy" IS NOT NULL AND a.id IS NULL
  `;

  if ((missingAttr[0]?.cnt ?? 0) > 0) {
    warn(check, `${missingAttr[0].cnt} user(s) have referredBy set but no ReferralAttribution row`);
    issues++;
  }

  if (issues === 0) {
    ok(check, "Attribution integrity verified");
  }
}

// ── CHECK 7: Payout cancel / restore consistency ───────────

async function checkPayoutCancelConsistency(): Promise<void> {
  const check = "7. Payout cancel/restore consistency";
  let issues = 0;

  const cancelled = await prisma.referralPayout.findMany({
    where: { status: "CANCELLED" },
    select: { id: true, amountCents: true, partnerId: true },
  });

  for (const payout of cancelled) {
    // A cancelled payout should have an ADMIN_ADJUSTMENT or similar balancing entry
    const balancingEntries = await prisma.referralLedger.findMany({
      where: { payoutId: payout.id },
      select: { type: true, amountCents: true },
    });

    const netEffect = balancingEntries.reduce((sum, e) => sum + e.amountCents, 0);

    // For a properly cancelled payout: PAYOUT_SENT(-X) + ADMIN_ADJUSTMENT(+X) = 0
    // If no entries exist at all, the cancel happened before any entries were created
    if (balancingEntries.length > 0 && Math.abs(netEffect) > 1) {
      warn(check, `Cancelled payout ${payout.id} has non-zero net ledger effect: ${netEffect}c`, {
        payoutId: payout.id,
        netEffect,
        entries: balancingEntries,
      });
      issues++;
    }

    // Check for linked entries that weren't unlinked
    const stillLinked = await prisma.referralLedger.count({
      where: {
        payoutId: payout.id,
        type: { notIn: ["PAYOUT_SENT", "ADMIN_ADJUSTMENT"] },
      },
    });

    if (stillLinked > 0) {
      warn(
        check,
        `Cancelled payout ${payout.id} still has ${stillLinked} non-system ledger entries linked`,
        { payoutId: payout.id }
      );
      issues++;
    }
  }

  if (issues === 0) {
    ok(check, `${cancelled.length} cancelled payout(s) verified — cancel/restore consistent`);
  }
}

// ── CHECK 8: Cached totals mismatch ────────────────────────

async function checkCachedTotals(): Promise<void> {
  const check = "8. Cached totals vs ledger truth";

  const partners = await prisma.referralPartner.findMany({
    select: { id: true, totalEarnedCents: true, totalPaidCents: true },
  });

  let mismatches = 0;

  for (const partner of partners) {
    const earned = await prisma.referralLedger.aggregate({
      where: { partnerId: partner.id, type: "COMMISSION_EARNED" },
      _sum: { amountCents: true },
    });
    const reversed = await prisma.referralLedger.aggregate({
      where: { partnerId: partner.id, type: "COMMISSION_REVERSED" },
      _sum: { amountCents: true },
    });
    const paid = await prisma.referralLedger.aggregate({
      where: { partnerId: partner.id, type: "PAYOUT_SENT" },
      _sum: { amountCents: true },
    });

    const ledgerEarned = (earned._sum.amountCents ?? 0) + (reversed._sum.amountCents ?? 0);
    const ledgerPaid = Math.abs(paid._sum.amountCents ?? 0);

    if (partner.totalEarnedCents !== ledgerEarned) {
      warn(
        check,
        `Partner ${partner.id}: cached totalEarnedCents=${partner.totalEarnedCents} vs ledger=${ledgerEarned}`,
        {
          partnerId: partner.id,
          cached: partner.totalEarnedCents,
          ledger: ledgerEarned,
          drift: partner.totalEarnedCents - ledgerEarned,
        }
      );
      mismatches++;
    }

    if (partner.totalPaidCents !== ledgerPaid) {
      warn(
        check,
        `Partner ${partner.id}: cached totalPaidCents=${partner.totalPaidCents} vs ledger=${ledgerPaid}`,
        {
          partnerId: partner.id,
          cached: partner.totalPaidCents,
          ledger: ledgerPaid,
          drift: partner.totalPaidCents - ledgerPaid,
        }
      );
      mismatches++;
    }
  }

  if (mismatches === 0) {
    ok(check, `${partners.length} partner(s) — cached totals match ledger`);
  }
}

// ── CHECK 9: Zero / negative anomalies ─────────────────────

async function checkSignAnomalies(): Promise<void> {
  const check = "9. Zero/negative amount anomalies";
  let issues = 0;

  const badEarned = await prisma.referralLedger.count({
    where: { type: "COMMISSION_EARNED", amountCents: { lte: 0 } },
  });
  if (badEarned > 0) {
    critical(check, `${badEarned} COMMISSION_EARNED entries with amountCents <= 0`);
    issues++;
  }

  const badReversed = await prisma.referralLedger.count({
    where: { type: "COMMISSION_REVERSED", amountCents: { gte: 0 } },
  });
  if (badReversed > 0) {
    critical(check, `${badReversed} COMMISSION_REVERSED entries with amountCents >= 0`);
    issues++;
  }

  const badPayout = await prisma.referralLedger.count({
    where: { type: "PAYOUT_SENT", amountCents: { gte: 0 } },
  });
  if (badPayout > 0) {
    critical(check, `${badPayout} PAYOUT_SENT entries with amountCents >= 0`);
    issues++;
  }

  const badPayoutAmount = await prisma.referralPayout.count({
    where: { amountCents: { lte: 0 }, status: { not: "CANCELLED" } },
  });
  if (badPayoutAmount > 0) {
    warn(check, `${badPayoutAmount} non-cancelled payout(s) with amountCents <= 0`);
    issues++;
  }

  if (issues === 0) {
    ok(check, "All amounts have correct sign conventions");
  }
}

// ── CHECK 10: Invoice-level sample ─────────────────────────

async function printInvoiceSample(): Promise<void> {
  const check = "10. Invoice-level commission sample";

  const sample = await prisma.referralLedger.findMany({
    where: { stripeInvoiceId: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      partnerId: true,
      type: true,
      stripeInvoiceId: true,
      amountCents: true,
      createdAt: true,
    },
  });

  if (sample.length === 0) {
    ok(check, "No invoice-linked ledger entries yet");
    return;
  }

  console.log("\n  Recent invoice-linked ledger entries:");
  console.log(
    "  " +
      "Partner".padEnd(28) +
      "Type".padEnd(24) +
      "Invoice".padEnd(32) +
      "Amount".padStart(10) +
      "  Date"
  );
  console.log("  " + "─".repeat(110));

  for (const row of sample) {
    const amt = `${row.amountCents >= 0 ? "+" : ""}${row.amountCents}c`;
    console.log(
      "  " +
        row.partnerId.slice(0, 26).padEnd(28) +
        row.type.padEnd(24) +
        (row.stripeInvoiceId ?? "").slice(0, 30).padEnd(32) +
        amt.padStart(10) +
        `  ${row.createdAt.toISOString().slice(0, 10)}`
    );
  }

  ok(check, `${sample.length} recent entries printed for visual inspection`);
}

// ── Main ───────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║         REFERRAL LEDGER HEALTH CHECK                    ║");
  console.log("║         Read-only audit · Safe to run repeatedly        ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log(`  Started at: ${new Date().toISOString()}`);

  header("CHECK 1 — Duplicate earned commissions");
  await checkDuplicateEarned();

  header("CHECK 2 — Reversals exceed earned");
  await checkReversalsExceedEarned();

  header("CHECK 3 — Payout composition integrity");
  await checkPayoutIntegrity();

  header("CHECK 4 — Unpaid balance consistency");
  await checkUnpaidBalance();

  header("CHECK 5 — Orphan ledger rows");
  await checkOrphanLedgerRows();

  header("CHECK 6 — Attribution integrity");
  await checkAttributionIntegrity();

  header("CHECK 7 — Payout cancel/restore consistency");
  await checkPayoutCancelConsistency();

  header("CHECK 8 — Cached totals vs ledger");
  await checkCachedTotals();

  header("CHECK 9 — Amount sign conventions");
  await checkSignAnomalies();

  header("CHECK 10 — Invoice sample (visual inspection)");
  await printInvoiceSample();

  // ── Summary ──────────────────────────────────────────────

  const criticals = findings.filter((f) => f.severity === "CRITICAL");
  const warnings = findings.filter((f) => f.severity === "WARNING");
  const oks = findings.filter((f) => f.severity === "OK");

  console.log("\n" + "═".repeat(60));
  console.log("  AUDIT SUMMARY");
  console.log("═".repeat(60));
  console.log(`  Total checks:  ${findings.length}`);
  console.log(`  OK:            ${oks.length}`);
  console.log(`  Warnings:      ${warnings.length}`);
  console.log(`  Critical:      ${criticals.length}`);
  console.log();

  for (const f of findings) {
    const icon = f.severity === "OK" ? "✓" : f.severity === "WARNING" ? "⚠" : "✗";
    const color =
      f.severity === "OK" ? "\x1b[32m" : f.severity === "WARNING" ? "\x1b[33m" : "\x1b[31m";
    console.log(`  ${color}${icon}\x1b[0m  [${f.severity}] ${f.check}: ${f.message}`);
    if (f.meta) {
      console.log(`       ${JSON.stringify(f.meta).slice(0, 200)}`);
    }
  }

  console.log();
  if (criticals.length > 0) {
    console.log("  \x1b[31m██ VERDICT: CRITICAL — Action required before release\x1b[0m");
  } else if (warnings.length > 0) {
    console.log("  \x1b[33m██ VERDICT: WARNING — Review recommended\x1b[0m");
  } else {
    console.log("  \x1b[32m██ VERDICT: HEALTHY — All checks passed\x1b[0m");
  }
  console.log();

  if (criticals.length > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error("Audit script failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
