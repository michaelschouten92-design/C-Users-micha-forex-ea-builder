import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────

const mockLogInfo = vi.fn();
const mockLogWarn = vi.fn();
const mockLogError = vi.fn();

vi.mock("@/lib/logger", () => ({
  logger: {
    child: () => ({
      info: (...args: unknown[]) => mockLogInfo(...args),
      warn: (...args: unknown[]) => mockLogWarn(...args),
      error: (...args: unknown[]) => mockLogError(...args),
    }),
  },
}));

const mockUpdate = vi.fn().mockResolvedValue({});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    notificationOutbox: {
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));

// ─── Tests ────────────────────────────────────────────────────────────

describe("outbox state machine transitions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("transitionOutboxEntry", () => {
    it("updates status and logs transition with entityId, from, to, reason", async () => {
      const { transitionOutboxEntry } = await import("./route");

      await transitionOutboxEntry("outbox_abc", "PROCESSING", "SENT", "delivery_success");

      // Verify DB update
      expect(mockUpdate).toHaveBeenCalledOnce();
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "outbox_abc" },
        data: { status: "SENT" },
      });

      // Verify structured log
      expect(mockLogInfo).toHaveBeenCalledWith(
        { outboxId: "outbox_abc", from: "PROCESSING", to: "SENT", reason: "delivery_success" },
        "Outbox status transition"
      );
    });

    it("merges extraData into the DB update", async () => {
      const { transitionOutboxEntry } = await import("./route");

      await transitionOutboxEntry("outbox_def", "PROCESSING", "FAILED", "delivery_failure", {
        attempts: 3,
        lastError: "timeout",
        nextRetryAt: new Date("2026-01-01"),
      });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "outbox_def" },
        data: {
          status: "FAILED",
          attempts: 3,
          lastError: "timeout",
          nextRetryAt: new Date("2026-01-01"),
        },
      });

      expect(mockLogInfo).toHaveBeenCalledWith(
        { outboxId: "outbox_def", from: "PROCESSING", to: "FAILED", reason: "delivery_failure" },
        "Outbox status transition"
      );
    });

    it("logs PROCESSING → DEAD when max attempts exceeded", async () => {
      const { transitionOutboxEntry } = await import("./route");

      await transitionOutboxEntry("outbox_ghi", "PROCESSING", "DEAD", "max_attempts_exceeded", {
        attempts: 5,
        lastError: "connection refused",
      });

      expect(mockLogInfo).toHaveBeenCalledWith(
        expect.objectContaining({
          outboxId: "outbox_ghi",
          from: "PROCESSING",
          to: "DEAD",
          reason: "max_attempts_exceeded",
        }),
        "Outbox status transition"
      );
    });

    it("does not log if DB update throws", async () => {
      mockUpdate.mockRejectedValueOnce(new Error("DB down"));
      const { transitionOutboxEntry } = await import("./route");

      await expect(
        transitionOutboxEntry("outbox_fail", "PROCESSING", "SENT", "delivery_success")
      ).rejects.toThrow("DB down");

      // Log should NOT have been called — transition didn't complete
      expect(mockLogInfo).not.toHaveBeenCalledWith(
        expect.objectContaining({ outboxId: "outbox_fail" }),
        expect.any(String)
      );
    });
  });

  describe("transition table completeness", () => {
    it("documents all valid transitions in the exported type", async () => {
      // This test validates the OutboxStatus type exists and covers all states.
      // The state machine diagram in the source is the canonical reference.
      const mod = await import("./route");
      // OutboxStatus is exported as a type — we verify the module loads
      // and the transition function accepts all documented state pairs.
      const { transitionOutboxEntry } = mod;

      // All documented single-entry transitions:
      const transitions: Array<[string, string, string]> = [
        ["PROCESSING", "SENT", "delivery_success"],
        ["PROCESSING", "FAILED", "delivery_failure"],
        ["PROCESSING", "DEAD", "max_attempts_exceeded"],
      ];

      for (const [from, to, reason] of transitions) {
        mockUpdate.mockResolvedValueOnce({});
        await transitionOutboxEntry(
          `test_${from}_${to}`,
          from as "PROCESSING",
          to as "SENT" | "FAILED" | "DEAD",
          reason
        );
      }

      // One log per transition
      expect(mockLogInfo).toHaveBeenCalledTimes(transitions.length);
    });
  });
});
