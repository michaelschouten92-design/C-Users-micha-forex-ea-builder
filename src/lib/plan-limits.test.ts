import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveTier, invalidateSubscriptionCache } from "./plan-limits";

// Mock prisma
vi.mock("./prisma", () => ({
  prisma: {
    subscription: {
      findUnique: vi.fn(),
    },
    project: {
      count: vi.fn(),
    },
    exportJob: {
      count: vi.fn(),
    },
  },
}));

describe("plan-limits", () => {
  describe("resolveTier", () => {
    it("returns FREE when subscription is null", () => {
      expect(resolveTier(null)).toBe("FREE");
    });

    it("returns FREE when subscription tier is FREE", () => {
      expect(resolveTier({ tier: "FREE", status: "active", currentPeriodEnd: null })).toBe("FREE");
    });

    it("returns PRO when subscription is active PRO", () => {
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      expect(resolveTier({ tier: "PRO", status: "active", currentPeriodEnd: futureDate })).toBe(
        "PRO"
      );
    });

    it("returns ELITE when subscription is active ELITE", () => {
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      expect(resolveTier({ tier: "ELITE", status: "active", currentPeriodEnd: futureDate })).toBe(
        "ELITE"
      );
    });

    it("returns FREE when PRO subscription is cancelled", () => {
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      expect(resolveTier({ tier: "PRO", status: "cancelled", currentPeriodEnd: futureDate })).toBe(
        "FREE"
      );
    });

    it("returns FREE when subscription is expired", () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      expect(resolveTier({ tier: "PRO", status: "active", currentPeriodEnd: pastDate })).toBe(
        "FREE"
      );
    });

    it("returns PRO when subscription is trialing", () => {
      const futureDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      expect(resolveTier({ tier: "PRO", status: "trialing", currentPeriodEnd: futureDate })).toBe(
        "PRO"
      );
    });

    it("returns PRO when past_due within current period (grace window)", () => {
      // Stripe retries failed payments for ~7 days. We grant tier access
      // during that window so a single failed charge doesn't immediately
      // strip the user of paid features.
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      expect(resolveTier({ tier: "PRO", status: "past_due", currentPeriodEnd: futureDate })).toBe(
        "PRO"
      );
    });

    it("returns FREE when past_due AND currentPeriodEnd has expired", () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      expect(resolveTier({ tier: "PRO", status: "past_due", currentPeriodEnd: pastDate })).toBe(
        "FREE"
      );
    });

    it("returns PRO when status is incomplete within current period (SCA window)", () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      expect(resolveTier({ tier: "PRO", status: "incomplete", currentPeriodEnd: futureDate })).toBe(
        "PRO"
      );
    });

    it("returns FREE when status is paused (paused does NOT grant access)", () => {
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      expect(resolveTier({ tier: "PRO", status: "paused", currentPeriodEnd: futureDate })).toBe(
        "FREE"
      );
    });

    it("returns FREE when subscription has no currentPeriodEnd and is not active", () => {
      expect(resolveTier({ tier: "PRO", status: "cancelled", currentPeriodEnd: null })).toBe(
        "FREE"
      );
    });
  });

  describe("invalidateSubscriptionCache", () => {
    it("does not throw when invalidating unknown user", () => {
      expect(() => invalidateSubscriptionCache("nonexistent-user")).not.toThrow();
    });
  });
});
