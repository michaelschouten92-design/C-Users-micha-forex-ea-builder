/**
 * Indicator factory - maps indicator node types to their calculation functions.
 * Each indicator returns named buffers keyed by buffer name.
 */

import type { OHLCVBar } from "../types";
import { resolveAppliedPrice, type AppliedPrice } from "./applied-price";
import { calcMA, type MAMethod } from "./moving-average";
import { calcRSI } from "./rsi";
import { calcMACD } from "./macd";
import { calcBollingerBands } from "./bollinger-bands";
import { calcATR } from "./atr";
import { calcADX } from "./adx";
import { calcStochastic } from "./stochastic";
import { calcCCI } from "./cci";

export interface IndicatorBuffers {
  [bufferName: string]: number[];
}

export interface IndicatorConfig {
  id: string;
  type: string;
  params: Record<string, unknown>;
}

/**
 * Compute all buffers for a given indicator over the full bar array.
 * Returns named buffers matching the MQL5 generator buffer naming.
 */
export function computeIndicator(bars: OHLCVBar[], config: IndicatorConfig): IndicatorBuffers {
  const p = config.params;

  switch (config.type) {
    case "moving-average": {
      const period = (p.period as number) ?? 50;
      const method = (p.method as MAMethod) ?? "SMA";
      const ap = (p.appliedPrice as AppliedPrice) ?? "CLOSE";
      const data = resolveAppliedPrice(bars, ap);
      return { value: calcMA(data, period, method) };
    }

    case "rsi": {
      const period = (p.period as number) ?? 14;
      const ap = (p.appliedPrice as AppliedPrice) ?? "CLOSE";
      const data = resolveAppliedPrice(bars, ap);
      return { value: calcRSI(data, period) };
    }

    case "macd": {
      const fast = (p.fastPeriod as number) ?? 12;
      const slow = (p.slowPeriod as number) ?? 26;
      const signal = (p.signalPeriod as number) ?? 9;
      const ap = (p.appliedPrice as AppliedPrice) ?? "CLOSE";
      const data = resolveAppliedPrice(bars, ap);
      const result = calcMACD(data, fast, slow, signal);
      return { main: result.main, signal: result.signal, histogram: result.histogram };
    }

    case "bollinger-bands": {
      const period = (p.period as number) ?? 20;
      const deviation = (p.deviation as number) ?? 2.0;
      const ap = (p.appliedPrice as AppliedPrice) ?? "CLOSE";
      const data = resolveAppliedPrice(bars, ap);
      const result = calcBollingerBands(data, period, deviation);
      return { upper: result.upper, middle: result.middle, lower: result.lower };
    }

    case "atr": {
      const period = (p.period as number) ?? 14;
      return { value: calcATR(bars, period) };
    }

    case "adx": {
      const period = (p.period as number) ?? 14;
      const result = calcADX(bars, period);
      return { main: result.adx, plusDI: result.plusDI, minusDI: result.minusDI };
    }

    case "stochastic": {
      const kPeriod = (p.kPeriod as number) ?? 14;
      const dPeriod = (p.dPeriod as number) ?? 3;
      const slowing = (p.slowing as number) ?? 3;
      const method = (p.maMethod as MAMethod) ?? "SMA";
      const result = calcStochastic(bars, kPeriod, dPeriod, slowing, method);
      return { main: result.main, signal: result.signal };
    }

    case "cci": {
      const period = (p.period as number) ?? 14;
      const ap = (p.appliedPrice as AppliedPrice) ?? "TYPICAL";
      const data = resolveAppliedPrice(bars, ap);
      return { value: calcCCI(data, period) };
    }

    case "obv": {
      const signalPeriod = (p.signalPeriod as number) ?? 20;
      const obv = calcOBV(bars);
      const signal = calcMA(obv, signalPeriod, "SMA");
      return { value: obv, signal };
    }

    case "ichimoku": {
      const tenkan = (p.tenkanPeriod as number) ?? 9;
      const kijun = (p.kijunPeriod as number) ?? 26;
      const senkouB = (p.senkouBPeriod as number) ?? 52;
      const result = calcIchimoku(bars, tenkan, kijun, senkouB);
      return result;
    }

    case "bb-squeeze": {
      const bbPeriod = (p.bbPeriod as number) ?? 20;
      const bbDev = (p.bbDeviation as number) ?? 2.0;
      const kcPeriod = (p.kcPeriod as number) ?? 20;
      const kcMult = (p.kcMultiplier as number) ?? 1.5;
      return calcBBSqueeze(bars, bbPeriod, bbDev, kcPeriod, kcMult);
    }

    default:
      return {};
  }
}

// ============================================
// INLINE HELPER INDICATORS
// ============================================

function calcOBV(bars: OHLCVBar[]): number[] {
  const result = new Array<number>(bars.length).fill(0);
  if (bars.length === 0) return result;
  result[0] = 0;
  for (let i = 1; i < bars.length; i++) {
    if (bars[i].close > bars[i - 1].close) {
      result[i] = result[i - 1] + bars[i].volume;
    } else if (bars[i].close < bars[i - 1].close) {
      result[i] = result[i - 1] - bars[i].volume;
    } else {
      result[i] = result[i - 1];
    }
  }
  return result;
}

function calcIchimoku(
  bars: OHLCVBar[],
  tenkanPeriod: number,
  kijunPeriod: number,
  senkouBPeriod: number
): IndicatorBuffers {
  const len = bars.length;
  const tenkan = new Array<number>(len).fill(NaN);
  const kijun = new Array<number>(len).fill(NaN);
  const spanA = new Array<number>(len).fill(NaN);
  const spanB = new Array<number>(len).fill(NaN);

  const midpoint = (start: number, end: number) => {
    let hh = -Infinity,
      ll = Infinity;
    for (let i = start; i <= end; i++) {
      if (bars[i].high > hh) hh = bars[i].high;
      if (bars[i].low < ll) ll = bars[i].low;
    }
    return (hh + ll) / 2;
  };

  // Tenkan-sen
  for (let i = tenkanPeriod - 1; i < len; i++) {
    tenkan[i] = midpoint(i - tenkanPeriod + 1, i);
  }

  // Kijun-sen
  for (let i = kijunPeriod - 1; i < len; i++) {
    kijun[i] = midpoint(i - kijunPeriod + 1, i);
  }

  // Senkou Span A = (Tenkan + Kijun) / 2, shifted forward by kijunPeriod
  // For backtesting, we compute it at current bar (no forward shift needed)
  for (let i = kijunPeriod - 1; i < len; i++) {
    if (!isNaN(tenkan[i]) && !isNaN(kijun[i])) {
      spanA[i] = (tenkan[i] + kijun[i]) / 2;
    }
  }

  // Senkou Span B = midpoint of senkouBPeriod, shifted forward by kijunPeriod
  for (let i = senkouBPeriod - 1; i < len; i++) {
    spanB[i] = midpoint(i - senkouBPeriod + 1, i);
  }

  return { tenkan, kijun, spanA, spanB };
}

function calcBBSqueeze(
  bars: OHLCVBar[],
  bbPeriod: number,
  bbDeviation: number,
  kcPeriod: number,
  kcMultiplier: number
): IndicatorBuffers {
  const len = bars.length;
  const squeeze = new Array<number>(len).fill(NaN); // 1 = in squeeze, 0 = not

  const closeData = bars.map((b) => b.close);
  const bb = calcBollingerBands(closeData, bbPeriod, bbDeviation);
  const atrData = calcATR(bars, kcPeriod);
  const ema = calcMA(closeData, kcPeriod, "EMA");

  for (let i = 0; i < len; i++) {
    if (isNaN(bb.upper[i]) || isNaN(ema[i]) || isNaN(atrData[i])) continue;
    const kcUpper = ema[i] + kcMultiplier * atrData[i];
    const kcLower = ema[i] - kcMultiplier * atrData[i];
    // Squeeze = BB inside KC
    squeeze[i] = bb.upper[i] < kcUpper && bb.lower[i] > kcLower ? 1 : 0;
  }

  return { squeeze, middle: bb.middle };
}

/**
 * Get the minimum number of bars required before an indicator produces valid output.
 */
export function getIndicatorWarmup(config: IndicatorConfig): number {
  const p = config.params;
  switch (config.type) {
    case "moving-average":
      return (p.period as number) ?? 50;
    case "rsi":
      return ((p.period as number) ?? 14) + 1;
    case "macd":
      return ((p.slowPeriod as number) ?? 26) + ((p.signalPeriod as number) ?? 9);
    case "bollinger-bands":
      return (p.period as number) ?? 20;
    case "atr":
      return ((p.period as number) ?? 14) + 1;
    case "adx":
      return ((p.period as number) ?? 14) * 2 + 1;
    case "stochastic":
      return (
        ((p.kPeriod as number) ?? 14) + ((p.slowing as number) ?? 3) + ((p.dPeriod as number) ?? 3)
      );
    case "cci":
      return (p.period as number) ?? 14;
    case "obv":
      return (p.signalPeriod as number) ?? 20;
    case "ichimoku":
      return (p.senkouBPeriod as number) ?? 52;
    case "bb-squeeze":
      return Math.max((p.bbPeriod as number) ?? 20, (p.kcPeriod as number) ?? 20) + 1;
    default:
      return 50;
  }
}
