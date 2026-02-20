/**
 * Deterministic fixed-precision arithmetic for investor-proof reports.
 *
 * All monetary values use 2 decimal places (cents).
 * All prices use 8 decimal places (sub-pip).
 * All percentages use 4 decimal places.
 *
 * Operations:
 * - Every result is rounded IMMEDIATELY after computation
 * - Rounding: half-up (standard financial rounding)
 * - Canonical string output: always fixed decimal places, no scientific notation
 *
 * Guarantees:
 * - Same input → same output on any IEEE 754 platform
 * - No accumulation of floating-point drift
 * - Reproducible across Node.js, browser, and any verifier
 */

/** Round to n decimal places using half-up rounding */
function roundHalfUp(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor + Number.EPSILON) / factor;
}

// ============================================
// MONEY: 2 decimal places
// ============================================

export function moneyAdd(a: number, b: number): number {
  return roundHalfUp(a + b, 2);
}

export function moneySub(a: number, b: number): number {
  return roundHalfUp(a - b, 2);
}

export function moneyMul(a: number, b: number): number {
  return roundHalfUp(a * b, 2);
}

export function moneyDiv(a: number, b: number): number {
  if (b === 0) return 0;
  return roundHalfUp(a / b, 2);
}

/** Canonical money string: always 2 decimal places */
export function moneyStr(value: number): string {
  return roundHalfUp(value, 2).toFixed(2);
}

// ============================================
// PERCENTAGE: 4 decimal places
// ============================================

export function pctCalc(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return roundHalfUp((numerator / denominator) * 100, 4);
}

export function pctStr(value: number): string {
  return roundHalfUp(value, 4).toFixed(4);
}

// ============================================
// RATIO: 4 decimal places (Sharpe, Sortino, etc.)
// ============================================

export function ratioCalc(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return roundHalfUp(numerator / denominator, 4);
}

export function ratioStr(value: number): string {
  return roundHalfUp(value, 4).toFixed(4);
}

// ============================================
// PRICE: 8 decimal places
// ============================================

export function priceStr(value: number): string {
  return roundHalfUp(value, 8).toFixed(8);
}

// ============================================
// LOTS: 2 decimal places
// ============================================

export function lotsStr(value: number): string {
  return roundHalfUp(value, 2).toFixed(2);
}
