import { describe, it, expect } from "vitest";
import { lookupMetricKey } from "./metric-labels";

describe("lookupMetricKey", () => {
  it("matches exact EN label (case-insensitive)", () => {
    expect(lookupMetricKey("Total Net Profit")).toBe("totalNetProfit");
  });

  it("matches German label", () => {
    expect(lookupMetricKey("Gewinnfaktor")).toBe("profitFactor");
  });

  it("matches Russian label", () => {
    expect(lookupMetricKey("всего сделок")).toBe("totalTrades");
  });

  it("matches fuzzy substring (label embedded in longer text)", () => {
    // MT5 sometimes wraps labels in extra whitespace or context
    expect(lookupMetricKey("  Equity Drawdown Maximal  ")).toBe("maxDrawdown");
  });

  it("returns null for unknown label", () => {
    expect(lookupMetricKey("Some Random Label That Does Not Exist")).toBeNull();
  });

  it("prefers equity drawdown over balance drawdown", () => {
    // Both should resolve to maxDrawdown, but equity should match
    expect(lookupMetricKey("Equity Drawdown Maximal")).toBe("maxDrawdown");
    expect(lookupMetricKey("Balance Drawdown Maximal")).toBe("maxDrawdown");
  });
});
