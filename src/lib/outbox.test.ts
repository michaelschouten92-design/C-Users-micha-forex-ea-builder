import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";

// ─── Mocks ────────────────────────────────────────────────────────

const mockCreate = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    notificationOutbox: { create: (...args: unknown[]) => mockCreate(...args) },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  },
}));

// ─── Tests ────────────────────────────────────────────────────────

describe("enqueueNotification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves on successful enqueue", async () => {
    mockCreate.mockResolvedValue({ id: "outbox_1" });

    const { enqueueNotification } = await import("./outbox");
    await expect(
      enqueueNotification({
        userId: "user_1",
        channel: "EMAIL",
        destination: "test@example.com",
        payload: { html: "<p>test</p>" },
      })
    ).resolves.toBeUndefined();

    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("throws on database error (AD1/AD2 — failure is visible)", async () => {
    mockCreate.mockRejectedValue(new Error("Connection refused"));

    const { enqueueNotification } = await import("./outbox");
    await expect(
      enqueueNotification({
        userId: "user_1",
        channel: "EMAIL",
        destination: "test@example.com",
        payload: { html: "<p>test</p>" },
      })
    ).rejects.toThrow("Connection refused");
  });

  it("does not throw on P2002 duplicate (AD4 — idempotent)", async () => {
    mockCreate.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "6.19.2",
      })
    );

    const { enqueueNotification } = await import("./outbox");
    await expect(
      enqueueNotification({
        userId: "user_1",
        channel: "EMAIL",
        destination: "test@example.com",
        alertSourceId: "alert_1",
        payload: { html: "<p>test</p>" },
      })
    ).resolves.toBeUndefined();
  });

  it("passes alertSourceId to create call", async () => {
    mockCreate.mockResolvedValue({ id: "outbox_1" });

    const { enqueueNotification } = await import("./outbox");
    await enqueueNotification({
      userId: "user_1",
      channel: "TELEGRAM",
      destination: "chat_123",
      alertSourceId: "alert_42",
      payload: { message: "test" },
    });

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        alertSourceId: "alert_42",
        channel: "TELEGRAM",
      }),
    });
  });

  it("sets alertSourceId to null when not provided", async () => {
    mockCreate.mockResolvedValue({ id: "outbox_1" });

    const { enqueueNotification } = await import("./outbox");
    await enqueueNotification({
      userId: "user_1",
      channel: "EMAIL",
      destination: "test@example.com",
      payload: { html: "test" },
    });

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        alertSourceId: null,
      }),
    });
  });
});
