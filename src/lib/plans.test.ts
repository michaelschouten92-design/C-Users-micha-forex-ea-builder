import { describe, it, expect } from "vitest";
import {
  PLANS,
  getPlan,
  formatPrice,
  isAlertChannelAllowed,
  getMaxPublicShares,
  getMaxBaselinesPerStrategy,
} from "./plans";

describe("plans", () => {
  describe("PLANS configuration", () => {
    it("has four tiers: FREE, PRO, ELITE, INSTITUTIONAL", () => {
      expect(Object.keys(PLANS)).toEqual(["FREE", "PRO", "ELITE", "INSTITUTIONAL"]);
    });

    it("FREE tier has 1 monitored account", () => {
      expect(PLANS.FREE.limits.maxMonitoredTradingAccounts).toBe(1);
    });

    it("PRO tier has 3 monitored accounts", () => {
      expect(PLANS.PRO.limits.maxMonitoredTradingAccounts).toBe(3);
    });

    it("ELITE tier has 10 monitored accounts", () => {
      expect(PLANS.ELITE.limits.maxMonitoredTradingAccounts).toBe(10);
    });

    it("INSTITUTIONAL tier has unlimited monitored accounts", () => {
      expect(PLANS.INSTITUTIONAL.limits.maxMonitoredTradingAccounts).toBe(Infinity);
    });

    it("FREE tier has no prices", () => {
      expect(PLANS.FREE.prices).toBeNull();
    });

    it("paid tiers have prices", () => {
      expect(PLANS.PRO.prices).toBeTruthy();
      expect(PLANS.ELITE.prices).toBeTruthy();
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

  describe("tier feature gates", () => {
    it("FREE tier only has browser push alerts", () => {
      expect(isAlertChannelAllowed("FREE", "BROWSER_PUSH")).toBe(true);
      expect(isAlertChannelAllowed("FREE", "TELEGRAM")).toBe(false);
      expect(isAlertChannelAllowed("FREE", "SLACK")).toBe(false);
      expect(isAlertChannelAllowed("FREE", "WEBHOOK")).toBe(false);
    });

    it("PRO tier has browser push + telegram", () => {
      expect(isAlertChannelAllowed("PRO", "BROWSER_PUSH")).toBe(true);
      expect(isAlertChannelAllowed("PRO", "TELEGRAM")).toBe(true);
      expect(isAlertChannelAllowed("PRO", "SLACK")).toBe(false);
      expect(isAlertChannelAllowed("PRO", "WEBHOOK")).toBe(false);
    });

    it("ELITE tier has all alert channels", () => {
      expect(isAlertChannelAllowed("ELITE", "BROWSER_PUSH")).toBe(true);
      expect(isAlertChannelAllowed("ELITE", "TELEGRAM")).toBe(true);
      expect(isAlertChannelAllowed("ELITE", "SLACK")).toBe(true);
      expect(isAlertChannelAllowed("ELITE", "WEBHOOK")).toBe(true);
    });

    it("public share limits scale with tier", () => {
      expect(getMaxPublicShares("FREE")).toBe(1);
      expect(getMaxPublicShares("PRO")).toBe(5);
      expect(getMaxPublicShares("ELITE")).toBe(Infinity);
      expect(getMaxPublicShares("INSTITUTIONAL")).toBe(Infinity);
    });

    it("baseline per strategy: FREE limited to 1, paid unlimited", () => {
      expect(getMaxBaselinesPerStrategy("FREE")).toBe(1);
      expect(getMaxBaselinesPerStrategy("PRO")).toBe(Infinity);
      expect(getMaxBaselinesPerStrategy("ELITE")).toBe(Infinity);
      expect(getMaxBaselinesPerStrategy("INSTITUTIONAL")).toBe(Infinity);
    });
  });
});
