import { describe, it, expect } from "vitest";
import { detectLocale, parseLocalizedNumber } from "./locale-detector";

describe("detectLocale", () => {
  it("detects EN locale from comma-thousands + period-decimal", () => {
    expect(detectLocale(["1,234.56", "5,678.90"])).toBe("EN");
  });

  it("detects EU locale from period-thousands + comma-decimal", () => {
    expect(detectLocale(["1.234,56", "5.678,90"])).toBe("EU");
  });

  it("detects FR locale from space-thousands + comma-decimal", () => {
    expect(detectLocale(["1 234,56", "5 678,90"])).toBe("FR");
  });

  it("returns null for empty input", () => {
    expect(detectLocale([])).toBeNull();
  });
});

describe("parseLocalizedNumber", () => {
  it("parses EN format correctly", () => {
    expect(parseLocalizedNumber("1,234.56", "EN")).toBeCloseTo(1234.56);
  });

  it("parses EU format correctly", () => {
    expect(parseLocalizedNumber("1.234,56", "EU")).toBeCloseTo(1234.56);
  });

  it("parses FR format correctly", () => {
    expect(parseLocalizedNumber("1 234,56", "FR")).toBeCloseTo(1234.56);
  });

  it("strips percentage sign", () => {
    expect(parseLocalizedNumber("55.50%", "EN")).toBeCloseTo(55.5);
  });

  it("returns 0 for empty string", () => {
    expect(parseLocalizedNumber("", "EN")).toBe(0);
  });

  it("handles negative numbers", () => {
    expect(parseLocalizedNumber("-1,234.56", "EN")).toBeCloseTo(-1234.56);
  });
});
