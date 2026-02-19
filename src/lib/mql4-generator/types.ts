// Types for MQL4 code generation

import type { Timeframe } from "@/types/builder";

export type { Timeframe };

export interface GeneratorContext {
  projectName: string;
  description: string;
  magicNumber: number;
  comment: string;
  maxOpenTrades: number;
  allowHedging: boolean;
  maxBuyPositions: number;
  maxSellPositions: number;
  conditionMode: "AND" | "OR";
  maxTradesPerDay: number;
  maxDailyProfitPercent: number;
  maxDailyLossPercent: number;
  cooldownAfterLossMinutes: number;
  minBarsBetweenTrades: number;
  maxTotalDrawdownPercent: number;
  equityTargetPercent: number;
  maxSlippage: number;
  /** Symbol variable name in generated MQL code. Defaults to "Symbol()", becomes "tradeSym" in multi-pair mode. */
  symbolVar: string;
  /** Whether multi-pair mode is enabled */
  multiPairEnabled: boolean;
  /** Max positions per pair in multi-pair mode */
  maxPositionsPerPair: number;
  /** Max total positions across all pairs in multi-pair mode */
  maxTotalPositions: number;
}

export interface InputParameter {
  name: string;
  type:
    | "int"
    | "double"
    | "string"
    | "bool"
    | "ENUM_MA_METHOD"
    | "ENUM_APPLIED_PRICE"
    | "ENUM_STO_PRICE";
  defaultValue: string | number | boolean;
  comment: string;
}

export interface OptimizableInput {
  name: string;
  type:
    | "int"
    | "double"
    | "string"
    | "bool"
    | "ENUM_MA_METHOD"
    | "ENUM_APPLIED_PRICE"
    | "ENUM_STO_PRICE"
    | "ENUM_TIMEFRAMES"
    | "ENUM_AS_TIMEFRAMES";
  value: number | string | boolean;
  comment: string;
  isOptimizable: boolean;
  /** When true, always show as input even if not optimizable (MQL4 has no sinput) */
  alwaysVisible?: boolean;
  group?: string;
}

export interface GeneratedCode {
  inputs: OptimizableInput[];
  globalVariables: string[];
  onInit: string[];
  onDeinit: string[];
  onTick: string[];
  helperFunctions: string[];
  /** When true, a `slSellPips` variable is generated alongside `slPips` for direction-aware SL */
  hasDirectionalSL?: boolean;
  /** Tracks the SL method used (e.g. PERCENT) so pending order logic can adjust */
  slMethod?: string;
  /** Tracks the max indicator period to calculate minimum bars needed in OnTick */
  maxIndicatorPeriod: number;
}

export type MAMethod = "SMA" | "EMA" | "SMMA" | "LWMA";
export type AppliedPrice = "CLOSE" | "OPEN" | "HIGH" | "LOW" | "MEDIAN" | "TYPICAL" | "WEIGHTED";
export type TradeDirection = "BUY" | "SELL" | "BOTH";

// MQL4 timeframe constants (same PERIOD_ names as MQL5 for common ones)
export const TIMEFRAME_MAP: Record<string, string> = {
  M1: "PERIOD_M1",
  M5: "PERIOD_M5",
  M15: "PERIOD_M15",
  M30: "PERIOD_M30",
  H1: "PERIOD_H1",
  H4: "PERIOD_H4",
  D1: "PERIOD_D1",
  W1: "PERIOD_W1",
  MN1: "PERIOD_MN1",
};

export function getTimeframe(tf: string | undefined): string {
  if (!tf) return "PERIOD_CURRENT";
  return TIMEFRAME_MAP[tf as Timeframe] ?? "PERIOD_CURRENT";
}

// Map AlgoStudio timeframes → custom enum values (restricted set for optimizer)
export const AS_TIMEFRAME_ENUM_MAP: Record<string, string> = {
  M1: "TF_M1",
  M5: "TF_M5",
  M15: "TF_M15",
  M30: "TF_M30",
  H1: "TF_H1",
  H4: "TF_H4",
  D1: "TF_D1",
  W1: "TF_W1",
  MN1: "TF_MN1",
};

export function getTimeframeEnum(tf: string | undefined): string {
  if (!tf) return "TF_H1";
  return AS_TIMEFRAME_ENUM_MAP[tf] ?? "TF_H1";
}

export const MA_METHOD_MAP: Record<MAMethod, string> = {
  SMA: "MODE_SMA",
  EMA: "MODE_EMA",
  SMMA: "MODE_SMMA",
  LWMA: "MODE_LWMA",
};

export const APPLIED_PRICE_MAP: Record<AppliedPrice, string> = {
  CLOSE: "PRICE_CLOSE",
  OPEN: "PRICE_OPEN",
  HIGH: "PRICE_HIGH",
  LOW: "PRICE_LOW",
  MEDIAN: "PRICE_MEDIAN",
  TYPICAL: "PRICE_TYPICAL",
  WEIGHTED: "PRICE_WEIGHTED",
};
