import { describe, it, expect } from "vitest";
import { PLANS, getPlan, formatPrice } from "./plans";

describe("plans", () => {
  describe("PLANS configuration", () => {
    it("has four tiers: FREE, PRO, ELITE, INSTITUTIONAL", () => {
      expect(Object.keys(PLANS)).toEqual(["FREE", "PRO", "ELITE", "INSTITUTIONAL"]);
    });

    it("FREE tier has correct limits", () => {
      expect(PLANS.FREE.limits.maxProjects).toBe(Infinity);
      expect(PLANS.FREE.limits.maxExportsPerMonth).toBe(Infinity);
      expect(PLANS.FREE.limits.canExportMQL5).toBe(true);
      expect(PLANS.FREE.limits.maxMonitoredTradingAccounts).toBe(1);
    });

    it("PRO tier has unlimited projects and exports", () => {
      expect(PLANS.PRO.limits.maxProjects).toBe(Infinity);
      expect(PLANS.PRO.limits.maxExportsPerMonth).toBe(Infinity);
      expect(PLANS.PRO.limits.canExportMQL5).toBe(true);
      expect(PLANS.PRO.limits.maxMonitoredTradingAccounts).toBe(3);
    });

    it("FREE tier has no prices", () => {
      expect(PLANS.FREE.prices).toBeNull();
    });

    it("PRO tier has prices", () => {
      expect(PLANS.PRO.prices).toBeTruthy();
    });

    it("ELITE tier has unlimited projects and exports", () => {
      expect(PLANS.ELITE.limits.maxProjects).toBe(Infinity);
      expect(PLANS.ELITE.limits.maxExportsPerMonth).toBe(Infinity);
      expect(PLANS.ELITE.limits.canExportMQL5).toBe(true);
      expect(PLANS.ELITE.limits.maxMonitoredTradingAccounts).toBe(10);
    });

    it("ELITE tier has prices", () => {
      expect(PLANS.ELITE.prices).toBeTruthy();
    });

    it("INSTITUTIONAL tier has unlimited monitored accounts", () => {
      expect(PLANS.INSTITUTIONAL.limits.maxProjects).toBe(Infinity);
      expect(PLANS.INSTITUTIONAL.limits.maxExportsPerMonth).toBe(Infinity);
      expect(PLANS.INSTITUTIONAL.limits.canExportMQL5).toBe(true);
      expect(PLANS.INSTITUTIONAL.limits.maxMonitoredTradingAccounts).toBe(Infinity);
    });

    it("INSTITUTIONAL tier has prices", () => {
      expect(PLANS.INSTITUTIONAL.prices).toBeTruthy();
    });

    it("each tier has features list", () => {
      expect(PLANS.FREE.features.length).toBeGreaterThan(0);
      expect(PLANS.PRO.features.length).toBeGreaterThan(0);
      expect(PLANS.ELITE.features.length).toBeGreaterThan(0);
      expect(PLANS.INSTITUTIONAL.features.length).toBeGreaterThan(0);
    });
  });

  describe("getPlan", () => {
    it("returns correct plan by tier", () => {
      expect(getPlan("FREE").name).toBe("Baseline");
      expect(getPlan("PRO").name).toBe("Control");
      expect(getPlan("ELITE").name).toBe("Authority");
      expect(getPlan("INSTITUTIONAL").name).toBe("Institutional");
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
