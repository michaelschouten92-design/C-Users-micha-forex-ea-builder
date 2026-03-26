import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────

const mockAlertCreate = vi.fn();
const mockAlertUpdate = vi.fn().mockResolvedValue({});
vi.mock("@/lib/prisma", () => ({
  prisma: {
    controlLayerAlert: {
      create: (...args: unknown[]) => mockAlertCreate(...args),
      update: (...args: unknown[]) => mockAlertUpdate(...args),
    },
    user: { findUnique: vi.fn() },
    liveEAInstance: { findUnique: vi.fn() },
  },
}));

const mockEnqueue = vi.fn();
vi.mock("@/lib/outbox", () => ({
  enqueueNotification: (...args: unknown[]) => mockEnqueue(...args),
}));

vi.mock("@/lib/webhook", () => ({
  fireWebhookWithResult: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("@/lib/crypto", () => ({
  decrypt: (s: string) => s,
  isEncrypted: () => false,
}));

const mockLogError = vi.fn();
vi.mock("@/lib/logger", () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: (...args: unknown[]) => mockLogError(...args),
    }),
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────

async function setupUserAndInstance() {
  const { prisma } = await import("@/lib/prisma");
  prisma.user.findUnique.mockResolvedValue({
    email: "trader@example.com",
    webhookUrl: null,
    telegramBotToken: null,
    telegramChatId: null,
    slackWebhookUrl: null,
  });
  prisma.liveEAInstance.findUnique.mockResolvedValue({
    eaName: "TestEA",
    symbol: "EURUSD",
  });
}

// ─── Tests ────────────────────────────────────────────────────────

describe("emitControlLayerAlert — delivery visibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    await setupUserAndInstance();
  });

  it("enqueue failure is caught and logged by emitControlLayerAlert (AD1)", async () => {
    // Alert creation succeeds
    mockAlertCreate.mockResolvedValue({ id: "alert_1" });
    // Enqueue throws (DB down)
    mockEnqueue.mockRejectedValue(new Error("DB connection lost"));

    const { emitControlLayerAlert } = await import("./control-layer-alerts");
    const { prisma } = await import("@/lib/prisma");

    // Should NOT throw — emitControlLayerAlert has try/catch
    await expect(
      emitControlLayerAlert(prisma, {
        userId: "user_1",
        instanceId: "inst_1",
        alertType: "MONITOR_OFFLINE",
      })
    ).resolves.toBeUndefined();

    // But the error IS logged — not silently lost
    expect(mockLogError).toHaveBeenCalledWith(
      expect.objectContaining({ alertId: "alert_1" }),
      "Alert delivery failed"
    );
  });

  it("duplicate enqueue (P2002) does not throw or log error", async () => {
    mockAlertCreate.mockResolvedValue({ id: "alert_2" });
    // Enqueue resolves (P2002 handled inside enqueueNotification as idempotent)
    mockEnqueue.mockResolvedValue(undefined);

    const { emitControlLayerAlert } = await import("./control-layer-alerts");
    const { prisma } = await import("@/lib/prisma");

    await expect(
      emitControlLayerAlert(prisma, {
        userId: "user_1",
        instanceId: "inst_1",
        alertType: "DEPLOYMENT_REVIEW",
      })
    ).resolves.toBeUndefined();

    // No error logged — clean path
    expect(mockLogError).not.toHaveBeenCalledWith(
      expect.objectContaining({ alertId: "alert_2" }),
      "Alert delivery failed"
    );
  });
});
