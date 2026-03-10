import { describe, it, expect } from "vitest";
import { formatMonitoringReasons } from "./monitoring-reason-copy";

describe("formatMonitoringReasons", () => {
  it("maps known codes to user copy", () => {
    const result = formatMonitoringReasons([
      "MONITORING_DRAWDOWN_BREACH",
      "MONITORING_SHARPE_DEGRADATION",
    ]);
    expect(result).toEqual(["Drawdown exceeded baseline threshold", "Sharpe degraded vs baseline"]);
  });

  it("drops unknown codes", () => {
    const result = formatMonitoringReasons(["UNKNOWN_CODE", "MONITORING_LOSS_STREAK"]);
    expect(result).toEqual(["Losing streak detected"]);
  });

  it("limits to 3 reasons", () => {
    const result = formatMonitoringReasons([
      "MONITORING_DRAWDOWN_BREACH",
      "MONITORING_SHARPE_DEGRADATION",
      "MONITORING_PROFIT_FACTOR_DEGRADED",
      "MONITORING_WIN_RATE_DEGRADED",
    ]);
    expect(result).toHaveLength(3);
  });

  it("returns empty array for empty input", () => {
    expect(formatMonitoringReasons([])).toEqual([]);
  });
});
