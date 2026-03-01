import { describe, it, expect } from "vitest";
import { validateAndNormalizeDeal, TradeFactValidationError } from "./validate-deal";
import type { ParsedDeal } from "@/lib/backtest-parser/types";

function makeDeal(overrides: Partial<ParsedDeal> = {}): ParsedDeal {
  return {
    ticket: 12345,
    openTime: "2025-01-15T10:30:00.000Z",
    type: "buy",
    volume: 0.1,
    price: 1.1234,
    profit: 50.25,
    symbol: "EURUSD",
    ...overrides,
  };
}

describe("validateAndNormalizeDeal", () => {
  it("normalizes a valid buy deal", () => {
    const result = validateAndNormalizeDeal(makeDeal(), "FALLBACK");

    expect(result).toEqual({
      sourceTicket: 12345,
      symbol: "EURUSD",
      direction: "BUY",
      volume: 0.1,
      openPrice: 1.1234,
      closePrice: null,
      sl: null,
      tp: null,
      profit: 50.25,
      executedAt: new Date("2025-01-15T10:30:00.000Z"),
      comment: null,
    });
  });

  it("normalizes a valid sell deal", () => {
    const result = validateAndNormalizeDeal(
      makeDeal({ type: "sell", sl: 1.13, tp: 1.11, comment: "TP hit" }),
      "FALLBACK"
    );

    expect(result.direction).toBe("SELL");
    expect(result.sl).toBe(1.13);
    expect(result.tp).toBe(1.11);
    expect(result.comment).toBe("TP hit");
  });

  it("rejects balance deals", () => {
    expect(() => validateAndNormalizeDeal(makeDeal({ type: "balance" }), "FALLBACK")).toThrow(
      TradeFactValidationError
    );
  });

  it("rejects invalid type", () => {
    expect(() => validateAndNormalizeDeal(makeDeal({ type: "unknown" }), "FALLBACK")).toThrow(
      TradeFactValidationError
    );
  });

  it("rejects non-positive ticket", () => {
    expect(() => validateAndNormalizeDeal(makeDeal({ ticket: 0 }), "FALLBACK")).toThrow(
      TradeFactValidationError
    );

    expect(() => validateAndNormalizeDeal(makeDeal({ ticket: -1 }), "FALLBACK")).toThrow(
      TradeFactValidationError
    );
  });

  it("rejects non-integer ticket", () => {
    expect(() => validateAndNormalizeDeal(makeDeal({ ticket: 1.5 }), "FALLBACK")).toThrow(
      TradeFactValidationError
    );
  });

  it("rejects zero volume", () => {
    expect(() => validateAndNormalizeDeal(makeDeal({ volume: 0 }), "FALLBACK")).toThrow(
      TradeFactValidationError
    );
  });

  it("rejects NaN volume", () => {
    expect(() => validateAndNormalizeDeal(makeDeal({ volume: NaN }), "FALLBACK")).toThrow(
      TradeFactValidationError
    );
  });

  it("rejects negative price", () => {
    expect(() => validateAndNormalizeDeal(makeDeal({ price: -1 }), "FALLBACK")).toThrow(
      TradeFactValidationError
    );
  });

  it("accepts zero price (valid for some instruments)", () => {
    const result = validateAndNormalizeDeal(makeDeal({ price: 0 }), "FALLBACK");
    expect(result.openPrice).toBe(0);
  });

  it("rejects NaN profit", () => {
    expect(() => validateAndNormalizeDeal(makeDeal({ profit: NaN }), "FALLBACK")).toThrow(
      TradeFactValidationError
    );
  });

  it("rejects Infinity profit", () => {
    expect(() => validateAndNormalizeDeal(makeDeal({ profit: Infinity }), "FALLBACK")).toThrow(
      TradeFactValidationError
    );
  });

  it("accepts negative profit", () => {
    const result = validateAndNormalizeDeal(makeDeal({ profit: -100 }), "FALLBACK");
    expect(result.profit).toBe(-100);
  });

  it("rejects invalid openTime", () => {
    expect(() =>
      validateAndNormalizeDeal(makeDeal({ openTime: "not-a-date" }), "FALLBACK")
    ).toThrow(TradeFactValidationError);
  });

  it("uses symbolFallback when deal.symbol is missing", () => {
    const result = validateAndNormalizeDeal(makeDeal({ symbol: undefined }), "GBPUSD");
    expect(result.symbol).toBe("GBPUSD");
  });

  it("rejects when both deal.symbol and fallback are empty", () => {
    expect(() => validateAndNormalizeDeal(makeDeal({ symbol: undefined }), "")).toThrow(
      TradeFactValidationError
    );
  });

  it("collects multiple violations in error", () => {
    try {
      validateAndNormalizeDeal(makeDeal({ ticket: -1, volume: 0, profit: NaN }), "EURUSD");
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(TradeFactValidationError);
      const validationErr = err as TradeFactValidationError;
      expect(validationErr.violations.length).toBeGreaterThanOrEqual(3);
    }
  });
});
