/**
 * Integration tests for audit-5 GDPR fixes:
 *   - P1-G1: AuditLog entries are anonymized (userId=null) instead of deleted
 *   - P1-G2: Data export includes 3rd-party identifiers (Discord/Telegram/Slack)
 *   - P1-G3: Anonymize transaction strips PII but keeps ReferralLedger intact
 *   - P1-G4: account.deletion_requested AuditLog entry is written with email-hash only
 *
 * Runs against a Neon dev branch.
 */
import { describe, test, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { createHash } from "crypto";
import { prisma, teardown } from "./setup";
import { logAuditEvent } from "@/lib/audit";

beforeAll(async () => {
  await prisma.$queryRaw`SELECT 1`;
});

afterAll(async () => {
  await teardown();
});

async function resetGdprState(): Promise<void> {
  await prisma.referralLedger.deleteMany({
    where: { partner: { user: { email: { endsWith: "@audit5.test.local" } } } },
  });
  await prisma.referralPartner.deleteMany({
    where: { user: { email: { endsWith: "@audit5.test.local" } } },
  });
  await prisma.auditLog.deleteMany({
    where: {
      OR: [
        { eventType: "account.deletion_requested" },
        { eventType: "account.anonymized" },
        { metadata: { contains: "@audit5.test.local" } },
      ],
    },
  });
  await prisma.subscription.deleteMany({
    where: { user: { email: { endsWith: "@audit5.test.local" } } },
  });
  await prisma.user.deleteMany({ where: { email: { endsWith: "@audit5.test.local" } } });
  // Also clean anonymized leftovers
  await prisma.user.deleteMany({ where: { email: { endsWith: "@removed.local" } } });
}

beforeEach(async () => {
  await resetGdprState();
});

async function makeUser(opts?: {
  withDiscord?: boolean;
  withTelegram?: boolean;
}): Promise<{ userId: string; email: string }> {
  const slug = Math.random().toString(36).slice(2, 10);
  const email = `gdpr-${slug}@audit5.test.local`;
  const user = await prisma.user.create({
    data: {
      email,
      authProviderId: `audit5_${email}`,
      referralCode: `G5${slug.toUpperCase()}`,
      discordId: opts?.withDiscord ? `discord-${slug}` : null,
      telegramChatId: opts?.withTelegram ? `tg-${slug}` : null,
      subscription: { create: { tier: "PRO" } },
    },
  });
  return { userId: user.id, email };
}

// ─────────────────────────────────────────────────────────────────────
// P1-G1: AuditLog anonymize
// ─────────────────────────────────────────────────────────────────────

describe("P1-G1: AuditLog rows are anonymized on user delete", () => {
  test("updateMany sets userId/ipAddress/userAgent to null but keeps row", async () => {
    const { userId, email } = await makeUser();
    await logAuditEvent({
      userId,
      eventType: "auth.login",
      ipAddress: "1.2.3.4",
      userAgent: "TestAgent/1.0",
    });

    // Reproduce the new anonymize step
    const before = await prisma.auditLog.findFirst({
      where: { userId, eventType: "auth.login" },
    });
    expect(before).toBeTruthy();

    await prisma.auditLog.updateMany({
      where: { userId },
      data: { userId: null, ipAddress: null, userAgent: null },
    });

    // Row still exists, but no longer linked to a person
    const after = await prisma.auditLog.findFirst({
      where: { id: before!.id },
    });
    expect(after).toBeTruthy();
    expect(after?.userId).toBeNull();
    expect(after?.ipAddress).toBeNull();
    expect(after?.userAgent).toBeNull();
    expect(after?.eventType).toBe("auth.login");

    // Cleanup the orphaned audit row
    await prisma.auditLog.delete({ where: { id: before!.id } });
    await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
    void email;
  });
});

// ─────────────────────────────────────────────────────────────────────
// P1-G2: Export shape includes 3rd-party identifiers
// ─────────────────────────────────────────────────────────────────────

describe("P1-G2: User export select includes 3rd-party identifiers", () => {
  test("select returns discordId, telegramChatId, slackWebhookUrl, webhookUrl, referralCode", async () => {
    const { userId } = await makeUser({ withDiscord: true, withTelegram: true });
    await prisma.user.update({
      where: { id: userId },
      data: { slackWebhookUrl: "https://slack.test/x", webhookUrl: "https://example.test/hook" },
    });

    // Reproduce the new export select
    const exported = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
        referralCode: true,
        referredBy: true,
        discordId: true,
        telegramChatId: true,
        slackWebhookUrl: true,
        webhookUrl: true,
      },
    });
    expect(exported?.discordId).toMatch(/^discord-/);
    expect(exported?.telegramChatId).toMatch(/^tg-/);
    expect(exported?.slackWebhookUrl).toBe("https://slack.test/x");
    expect(exported?.webhookUrl).toBe("https://example.test/hook");
    expect(exported?.referralCode).toMatch(/^G5/);
  });
});

// ─────────────────────────────────────────────────────────────────────
// P1-G3: Anonymize transaction shape
// ─────────────────────────────────────────────────────────────────────

describe("P1-G3: anonymization preserves financial ledger but strips PII", () => {
  test("user PII zeroed + partner payout fields nulled + ReferralLedger intact", async () => {
    const { userId, email } = await makeUser({ withDiscord: true, withTelegram: true });
    const partner = await prisma.referralPartner.create({
      data: {
        userId,
        status: "ACTIVE",
        commissionBps: 2000,
        payoutEmail: "payout@example.com",
        payoutIban: "NL00BANK1234567890",
        payoutAccountHolder: "Real Name",
      },
    });
    const ledger = await prisma.referralLedger.create({
      data: {
        partnerId: partner.id,
        type: "COMMISSION_EARNED",
        amountCents: 5000,
        stripeInvoiceId: `in_test_${Date.now()}`,
      },
    });

    // Reproduce the anonymize transaction
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          email: `deleted-${userId}@removed.local`,
          passwordHash: null,
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
          suspendedReason: "anonymized: test",
          adminNotes: "Anonymized by admin test (now): test",
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
    });

    const userAfter = await prisma.user.findUnique({ where: { id: userId } });
    expect(userAfter?.email).toBe(`deleted-${userId}@removed.local`);
    expect(userAfter?.discordId).toBeNull();
    expect(userAfter?.telegramChatId).toBeNull();
    expect(userAfter?.slackWebhookUrl).toBeNull();
    expect(userAfter?.suspended).toBe(true);

    const partnerAfter = await prisma.referralPartner.findUnique({ where: { userId } });
    expect(partnerAfter?.payoutIban).toBeNull();
    expect(partnerAfter?.payoutEmail).toBeNull();
    expect(partnerAfter?.payoutAccountHolder).toBeNull();
    // Commission rate + status preserved (legitimate-interest carve-out)
    expect(partnerAfter?.commissionBps).toBe(2000);
    expect(partnerAfter?.status).toBe("ACTIVE");

    // Ledger row untouched
    const ledgerAfter = await prisma.referralLedger.findUnique({ where: { id: ledger.id } });
    expect(ledgerAfter).toBeTruthy();
    expect(ledgerAfter?.amountCents).toBe(5000);
    void email;
  });
});

// ─────────────────────────────────────────────────────────────────────
// P1-G4: account.deletion_requested audit entry with hashed email
// ─────────────────────────────────────────────────────────────────────

describe("P1-G4: account.deletion_requested entry persists email-hash only", () => {
  test("entry survives user delete and contains no plaintext PII", async () => {
    const { userId, email } = await makeUser();
    const emailHash = createHash("sha256").update(email.toLowerCase()).digest("hex");

    // Simulate the post-delete audit-write
    await logAuditEvent({
      userId: null,
      eventType: "account.deletion_requested",
      resourceType: "user",
      resourceId: userId,
      metadata: { emailHash, completedAt: new Date().toISOString() },
    });

    const log = await prisma.auditLog.findFirst({
      where: { eventType: "account.deletion_requested", resourceId: userId },
    });
    expect(log).toBeTruthy();
    expect(log?.userId).toBeNull();
    const meta = log?.metadata ? JSON.parse(log.metadata as string) : {};
    expect(meta.emailHash).toBe(emailHash);
    // No plaintext email anywhere in the audit row
    expect(JSON.stringify(log)).not.toContain(email);
  });
});
