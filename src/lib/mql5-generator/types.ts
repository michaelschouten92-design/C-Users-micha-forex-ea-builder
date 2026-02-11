// Types for MQL5 code generation

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
}

export interface IndicatorVariable {
  name: string;
  handle: string;
  bufferIndex: number;
  type: "ma" | "rsi" | "macd" | "bb";
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
    | "ENUM_STO_PRICE";
  value: number | string | boolean;
  comment: string;
  isOptimizable: boolean;
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
}

export type MAMethod = "SMA" | "EMA";
export type AppliedPrice = "CLOSE" | "OPEN" | "HIGH" | "LOW" | "MEDIAN" | "TYPICAL" | "WEIGHTED";
export type TradeDirection = "BUY" | "SELL" | "BOTH";

export type Timeframe = "M1" | "M5" | "M15" | "M30" | "H1" | "H4" | "D1" | "W1" | "MN1";

export const TIMEFRAME_MAP: Record<Timeframe, string> = {
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

export const MA_METHOD_MAP: Record<MAMethod, string> = {
  SMA: "MODE_SMA",
  EMA: "MODE_EMA",
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
