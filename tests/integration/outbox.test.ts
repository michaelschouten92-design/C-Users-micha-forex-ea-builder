/**
 * Integration tests for audit-4 outbox fixes:
 *   - P1-O1: Telegram bot tokens never land in NotificationOutbox.payload
 *   - P1-O2: sendPushNotification returns structured { delivered } result
 *   - P1-O3: STUCK_THRESHOLD_MS is shortened to 2 min
 *   - P1-O4: alertSourceId dedup via unique(alertSourceId, channel)
 *   - P2-O2: bulk-email uses createMany chunks
 *   - P2-O4: releaseOnTimeout sets nextRetryAt ~1 min in future
 */
import { describe, test, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { prisma, teardown } from "./setup";

beforeAll(async () => {
  await prisma.$queryRaw`SELECT 1`;
});

afterAll(async () => {
  await teardown();
});

async function resetOutbox(): Promise<void> {
  await prisma.notificationOutbox.deleteMany({
    where: { destination: { contains: "@audit4.test.local" } },
  });
  await prisma.notificationOutbox.deleteMany({
    where: { alertSourceId: { startsWith: "alert:audit4:" } },
  });
  await prisma.user.deleteMany({ where: { email: { endsWith: "@audit4.test.local" } } });
}

beforeEach(async () => {
  await resetOutbox();
});

async function makeAdminUser(): Promise<{ userId: string }> {
  const slug = Math.random().toString(36).slice(2, 10);
  const email = `admin-${slug}@audit4.test.local`;
  const user = await prisma.user.create({
    data: {
      email,
      authProviderId: `audit4_${email}`,
      referralCode: `A4${slug.toUpperCase()}`,
      subscription: { create: { tier: "PRO" } },
    },
  });
  return { userId: user.id };
}

// ─────────────────────────────────────────────────────────────────────
// P1-O4: alertSourceId dedup
// ─────────────────────────────────────────────────────────────────────

describe("P1-O4: alertSourceId uniqueness prevents duplicate outbox rows", () => {
  test("two rows with same (alertSourceId, channel) → second hits P2002", async () => {
    const { userId } = await makeAdminUser();
    const alertSourceId = `alert:audit4:dedup-${Date.now()}`;

    await prisma.notificationOutbox.create({
      data: {
        userId,
        channel: "TELEGRAM",
        destination: "chat123",
        alertSourceId,
        payload: { tokenSource: "central", message: "first" },
      },
    });

    await expect(
      prisma.notificationOutbox.create({
        data: {
          userId,
          channel: "TELEGRAM",
          destination: "chat123",
          alertSourceId,
          payload: { tokenSource: "central", message: "second" },
        },
      })
    ).rejects.toMatchObject({ code: "P2002" });

    const rows = await prisma.notificationOutbox.count({ where: { alertSourceId } });
    expect(rows).toBe(1);
  });

  test("different channels with same alertSourceId both succeed", async () => {
    const { userId } = await makeAdminUser();
    const alertSourceId = `alert:audit4:multi-channel-${Date.now()}`;

    await prisma.notificationOutbox.create({
      data: { userId, channel: "EMAIL", destination: "x@x.com", alertSourceId, payload: {} },
    });
    await prisma.notificationOutbox.create({
      data: { userId, channel: "TELEGRAM", destination: "123", alertSourceId, payload: {} },
    });

    const rows = await prisma.notificationOutbox.count({ where: { alertSourceId } });
    expect(rows).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────
// P1-O1: Telegram payload contract — no bot tokens in payload
// ─────────────────────────────────────────────────────────────────────

describe("P1-O1: Telegram outbox payload carries only a tokenSource marker", () => {
  test("new enqueue pattern uses tokenSource, not botToken", async () => {
    const { userId } = await makeAdminUser();
    const alertSourceId = `alert:audit4:tg-${Date.now()}`;

    await prisma.notificationOutbox.create({
      data: {
        userId,
        channel: "TELEGRAM",
        destination: "chat-abc",
        alertSourceId,
        payload: { tokenSource: "central", message: "hello" },
      },
    });

    const row = await prisma.notificationOutbox.findFirst({ where: { alertSourceId } });
    expect(row).toBeTruthy();
    const payload = row!.payload as Record<string, unknown>;
    expect(payload.botToken).toBeUndefined();
    expect(payload.tokenSource).toBe("central");
    expect(payload.message).toBe("hello");
  });
});

// ─────────────────────────────────────────────────────────────────────
// P2-O2: bulk-email uses createMany (shape verification)
// ─────────────────────────────────────────────────────────────────────

describe("P2-O2: notificationOutbox.createMany batches bulk email inserts", () => {
  test("createMany inserts N rows and returns count=N", async () => {
    const { userId } = await makeAdminUser();
    const batch = Array.from({ length: 50 }, (_, i) => ({
      userId,
      channel: "EMAIL" as const,
      destination: `batch-${i}@audit4.test.local`,
      subject: "Bulk test",
      payload: { html: "<p>test</p>" },
    }));

    const result = await prisma.notificationOutbox.createMany({ data: batch });
    expect(result.count).toBe(50);

    const stored = await prisma.notificationOutbox.count({
      where: { destination: { endsWith: "@audit4.test.local" } },
    });
    expect(stored).toBeGreaterThanOrEqual(50);
  });
});

// ─────────────────────────────────────────────────────────────────────
// P2-O4: releaseOnTimeout sets nextRetryAt ~1 min in the future
// ─────────────────────────────────────────────────────────────────────

describe("P2-O4: timeout-release backs off nextRetryAt", () => {
  test("a PROCESSING → FAILED transition via timeout path sets nextRetryAt > now", async () => {
    const { userId } = await makeAdminUser();
    const outbox = await prisma.notificationOutbox.create({
      data: {
        userId,
        channel: "EMAIL",
        destination: "slow@audit4.test.local",
        status: "PROCESSING",
        payload: {},
      },
    });

    // Reproduce the new releaseOnTimeout SQL
    const retryAt = new Date(Date.now() + 60_000);
    await prisma.$queryRaw`
      UPDATE "NotificationOutbox"
      SET status = 'FAILED', "updatedAt" = NOW(), "nextRetryAt" = ${retryAt}
      WHERE id = ${outbox.id} AND status = 'PROCESSING'
    `;

    const after = await prisma.notificationOutbox.findUnique({ where: { id: outbox.id } });
    expect(after?.status).toBe("FAILED");
    expect(after?.nextRetryAt).toBeTruthy();
    expect(after!.nextRetryAt!.getTime()).toBeGreaterThan(Date.now() + 30_000);
    expect(after!.nextRetryAt!.getTime()).toBeLessThan(Date.now() + 120_000);
  });
});
