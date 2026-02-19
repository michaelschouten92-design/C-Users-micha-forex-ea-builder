/**
 * Applied price resolver - matches MT5's ENUM_APPLIED_PRICE.
 */

import type { OHLCVBar } from "../types";

export type AppliedPrice =
  | "CLOSE"
  | "OPEN"
  | "HIGH"
  | "LOW"
  | "MEDIAN" // (H+L)/2
  | "TYPICAL" // (H+L+C)/3
  | "WEIGHTED"; // (H+L+C+C)/4

export function getAppliedPrice(bar: OHLCVBar, ap: AppliedPrice): number {
  switch (ap) {
    case "OPEN":
      return bar.open;
    case "HIGH":
      return bar.high;
    case "LOW":
      return bar.low;
    case "CLOSE":
      return bar.close;
    case "MEDIAN":
      return (bar.high + bar.low) / 2;
    case "TYPICAL":
      return (bar.high + bar.low + bar.close) / 3;
    case "WEIGHTED":
      return (bar.high + bar.low + bar.close + bar.close) / 4;
    default:
      return bar.close;
  }
}

export function resolveAppliedPrice(bars: OHLCVBar[], ap: AppliedPrice): number[] {
  return bars.map((b) => getAppliedPrice(b, ap));
}
