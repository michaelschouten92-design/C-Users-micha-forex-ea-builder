// Types for MQL5 code generation

export interface GeneratorContext {
  projectName: string;
  magicNumber: number;
  comment: string;
  maxOpenTrades: number;
  allowHedging: boolean;
}

export interface IndicatorVariable {
  name: string;
  handle: string;
  bufferIndex: number;
  type: "ma" | "rsi" | "macd" | "bb";
}

export interface InputParameter {
  name: string;
  type: "int" | "double" | "string" | "bool" | "ENUM_MA_METHOD" | "ENUM_APPLIED_PRICE";
  defaultValue: string | number | boolean;
  comment: string;
}

export interface GeneratedCode {
  inputs: string[];
  globalVariables: string[];
  onInit: string[];
  onDeinit: string[];
  onTick: string[];
  helperFunctions: string[];
}

export type MAMethod = "SMA" | "EMA" | "SMMA" | "LWMA";
export type AppliedPrice = "CLOSE" | "OPEN" | "HIGH" | "LOW" | "MEDIAN" | "TYPICAL" | "WEIGHTED";
export type TradeDirection = "BUY" | "SELL" | "BOTH";

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
