import { describe, it, expect } from "vitest";
import { PLANS, getPlan, formatPrice } from "./plans";

describe("plans", () => {
  describe("PLANS configuration", () => {
    it("has three tiers: FREE, STARTER, PRO", () => {
      expect(Object.keys(PLANS)).toEqual(["FREE", "STARTER", "PRO"]);
    });

    it("FREE tier has correct limits", () => {
      expect(PLANS.FREE.limits.maxProjects).toBe(5);
      expect(PLANS.FREE.limits.maxExportsPerMonth).toBe(2);
      expect(PLANS.FREE.limits.canExportMQL5).toBe(true);
      expect(PLANS.FREE.limits.canUseTradeManagement).toBe(false);
    });

    it("STARTER tier has higher limits than FREE", () => {
      expect(PLANS.STARTER.limits.maxProjects).toBeGreaterThan(PLANS.FREE.limits.maxProjects);
      expect(PLANS.STARTER.limits.maxExportsPerMonth).toBeGreaterThan(PLANS.FREE.limits.maxExportsPerMonth);
      expect(PLANS.STARTER.limits.canUseTradeManagement).toBe(true);
    });

    it("PRO tier has unlimited projects and exports", () => {
      expect(PLANS.PRO.limits.maxProjects).toBe(Infinity);
      expect(PLANS.PRO.limits.maxExportsPerMonth).toBe(Infinity);
      expect(PLANS.PRO.limits.canExportMQL5).toBe(true);
      expect(PLANS.PRO.limits.canUseTradeManagement).toBe(true);
    });

    it("FREE tier has no prices", () => {
      expect(PLANS.FREE.prices).toBeNull();
    });

    it("paid tiers have prices", () => {
      expect(PLANS.STARTER.prices).toBeTruthy();
      expect(PLANS.PRO.prices).toBeTruthy();
    });

    it("each tier has features list", () => {
      expect(PLANS.FREE.features.length).toBeGreaterThan(0);
      expect(PLANS.STARTER.features.length).toBeGreaterThan(0);
      expect(PLANS.PRO.features.length).toBeGreaterThan(0);
    });
  });

  describe("getPlan", () => {
    it("returns correct plan by tier", () => {
      expect(getPlan("FREE").name).toBe("Free");
      expect(getPlan("STARTER").name).toBe("Starter");
      expect(getPlan("PRO").name).toBe("Pro");
    });
  });

  describe("formatPrice", () => {
    it("formats EUR prices from cents", () => {
      expect(formatPrice(1900, "eur")).toContain("19");
    });

    it("formats USD prices from cents", () => {
      expect(formatPrice(4900, "usd")).toContain("49");
    });

    it("handles zero price", () => {
      expect(formatPrice(0, "eur")).toContain("0");
    });
  });
});
