import { describe, it, expect } from "vitest";
import {
  STRATEGY_PRESETS,
  PRESET_MAGIC_BASE,
  DEFAULT_FIXED_LOT,
  DEFAULT_MIN_LOT,
  DEFAULT_MAX_LOT,
  DEFAULT_SL_ATR_MULTIPLIER,
  DEFAULT_TP_ATR_MULTIPLIER,
  DEFAULT_TP_RISK_REWARD,
  DEFAULT_MAX_OPEN_TRADES,
} from "./strategy-presets";

describe("preset constants", () => {
  it("PRESET_MAGIC_BASE is 300000", () => {
    expect(PRESET_MAGIC_BASE).toBe(300_000);
  });

  it("lot sizes are ordered: min < fixed < max", () => {
    expect(DEFAULT_MIN_LOT).toBeLessThan(DEFAULT_FIXED_LOT);
    expect(DEFAULT_FIXED_LOT).toBeLessThan(DEFAULT_MAX_LOT);
  });

  it("TP ATR multiplier exceeds SL ATR multiplier (positive expectancy)", () => {
    expect(DEFAULT_TP_ATR_MULTIPLIER).toBeGreaterThan(DEFAULT_SL_ATR_MULTIPLIER);
  });

  it("risk-reward ratio is at least 1:1", () => {
    expect(DEFAULT_TP_RISK_REWARD).toBeGreaterThanOrEqual(1);
  });
});

describe("STRATEGY_PRESETS", () => {
  it("every preset has a unique magic number derived from PRESET_MAGIC_BASE", () => {
    const magics = STRATEGY_PRESETS.map((p) => p.buildJson.settings?.magicNumber);
    // All above the base
    for (const m of magics) {
      expect(m).toBeGreaterThan(PRESET_MAGIC_BASE);
    }
    // All unique
    expect(new Set(magics).size).toBe(magics.length);
  });

  it("every preset limits open trades to DEFAULT_MAX_OPEN_TRADES", () => {
    for (const preset of STRATEGY_PRESETS) {
      expect(preset.buildJson.settings?.maxOpenTrades).toBe(DEFAULT_MAX_OPEN_TRADES);
    }
  });
});
