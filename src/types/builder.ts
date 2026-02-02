// TypeScript types for the Visual EA Builder

import type { Node, Edge, Viewport } from "@xyflow/react";

// ============================================
// NODE DATA TYPES
// ============================================

export type NodeCategory = "timing" | "indicator" | "condition" | "trading";

// Base data all nodes have
export interface BaseNodeData extends Record<string, unknown> {
  label: string;
  category: NodeCategory;
}

// Timing Nodes
export type TradingTimesMode = "ALWAYS" | "CUSTOM";

export interface SessionTime {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}

export interface TradingTimesNodeData extends BaseNodeData {
  category: "timing";
  timingType: "trading-times";
  mode: TradingTimesMode;
  sessions: SessionTime[];
  tradeMondayToFriday: boolean;
}

export type TimingNodeData = TradingTimesNodeData;

// Indicator Nodes
export interface MovingAverageNodeData extends BaseNodeData {
  category: "indicator";
  indicatorType: "moving-average";
  period: number;
  method: "SMA" | "EMA" | "SMMA" | "LWMA";
  appliedPrice: "CLOSE" | "OPEN" | "HIGH" | "LOW" | "MEDIAN" | "TYPICAL" | "WEIGHTED";
  shift: number;
}

export interface RSINodeData extends BaseNodeData {
  category: "indicator";
  indicatorType: "rsi";
  period: number;
  appliedPrice: "CLOSE" | "OPEN" | "HIGH" | "LOW" | "MEDIAN" | "TYPICAL" | "WEIGHTED";
  overboughtLevel: number;
  oversoldLevel: number;
}

export interface MACDNodeData extends BaseNodeData {
  category: "indicator";
  indicatorType: "macd";
  fastPeriod: number;
  slowPeriod: number;
  signalPeriod: number;
  appliedPrice: "CLOSE" | "OPEN" | "HIGH" | "LOW" | "MEDIAN" | "TYPICAL" | "WEIGHTED";
}

export interface BollingerBandsNodeData extends BaseNodeData {
  category: "indicator";
  indicatorType: "bollinger-bands";
  period: number;
  deviation: number;
  appliedPrice: "CLOSE" | "OPEN" | "HIGH" | "LOW" | "MEDIAN" | "TYPICAL" | "WEIGHTED";
  shift: number;
}

export interface ATRNodeData extends BaseNodeData {
  category: "indicator";
  indicatorType: "atr";
  period: number;
}

export interface ADXNodeData extends BaseNodeData {
  category: "indicator";
  indicatorType: "adx";
  period: number;
  trendLevel: number; // Level above which market is considered trending (default: 25)
}

export type IndicatorNodeData =
  | MovingAverageNodeData
  | RSINodeData
  | MACDNodeData
  | BollingerBandsNodeData
  | ATRNodeData
  | ADXNodeData;

// Condition Nodes
export type ComparisonOperator = ">" | "<" | ">=" | "<=" | "==" | "crosses_above" | "crosses_below";

export interface ConditionRule {
  id: string;
  leftOperand: string; // Reference to node output or price
  operator: ComparisonOperator;
  rightOperand: string; // Reference to node output, value, or price
}

export interface EntryConditionNodeData extends BaseNodeData {
  category: "condition";
  conditionType: "entry";
  direction: "BUY" | "SELL" | "BOTH";
  logic: "AND" | "OR";
  rules: ConditionRule[];
}

export interface ExitConditionNodeData extends BaseNodeData {
  category: "condition";
  conditionType: "exit";
  exitType: "CLOSE_ALL" | "CLOSE_BUY" | "CLOSE_SELL";
  logic: "AND" | "OR";
  rules: ConditionRule[];
}

export type ConditionNodeData = EntryConditionNodeData | ExitConditionNodeData;

// Trading Nodes
export type PositionSizingMethod = "FIXED_LOT" | "RISK_PERCENT" | "BALANCE_PERCENT";

export interface PositionSizingNodeData extends BaseNodeData {
  category: "trading";
  tradingType: "position-sizing";
  method: PositionSizingMethod;
  fixedLot: number;
  riskPercent: number;
  balancePercent: number;
  minLot: number;
  maxLot: number;
}

export type StopLossMethod = "FIXED_PIPS" | "ATR_BASED" | "INDICATOR";

export interface StopLossNodeData extends BaseNodeData {
  category: "trading";
  tradingType: "stop-loss";
  method: StopLossMethod;
  fixedPips: number;
  atrMultiplier: number;
  atrPeriod: number;
  indicatorNodeId?: string;
}

export type TakeProfitMethod = "FIXED_PIPS" | "RISK_REWARD" | "ATR_BASED";

export interface TakeProfitNodeData extends BaseNodeData {
  category: "trading";
  tradingType: "take-profit";
  method: TakeProfitMethod;
  fixedPips: number;
  riskRewardRatio: number;
  atrMultiplier: number;
  atrPeriod: number;
}

export type TradingNodeData =
  | PositionSizingNodeData
  | StopLossNodeData
  | TakeProfitNodeData;

// Union of all node data types
export type BuilderNodeData =
  | TimingNodeData
  | IndicatorNodeData
  | ConditionNodeData
  | TradingNodeData;

// ============================================
// NODE TYPES
// ============================================

export type BuilderNodeType =
  | "trading-times"
  | "moving-average"
  | "rsi"
  | "macd"
  | "bollinger-bands"
  | "atr"
  | "adx"
  | "entry-condition"
  | "exit-condition"
  | "position-sizing"
  | "stop-loss"
  | "take-profit";

export type BuilderNode = Node<BuilderNodeData, BuilderNodeType>;
export type BuilderEdge = Edge;

// ============================================
// BUILD JSON SCHEMA (stored in DB)
// ============================================

export interface BuildJsonSettings {
  magicNumber: number;
  comment: string;
  maxOpenTrades: number;
  allowHedging: boolean;
}

export interface BuildJsonMetadata {
  createdAt: string;
  updatedAt: string;
}

export interface BuildJsonSchema {
  version: "1.0";
  nodes: BuilderNode[];
  edges: BuilderEdge[];
  viewport: Viewport;
  metadata: BuildJsonMetadata;
  settings: BuildJsonSettings;
}

// ============================================
// DEFAULT VALUES
// ============================================

export const DEFAULT_SETTINGS: BuildJsonSettings = {
  magicNumber: 123456,
  comment: "EA Builder Strategy",
  maxOpenTrades: 1,
  allowHedging: false,
};

export const DEFAULT_BUILD_JSON: BuildJsonSchema = {
  version: "1.0",
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  metadata: {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  settings: DEFAULT_SETTINGS,
};

// ============================================
// NODE TEMPLATES (for toolbar)
// ============================================

export interface NodeTemplate {
  type: BuilderNodeType;
  label: string;
  category: NodeCategory;
  description: string;
  defaultData: Partial<BuilderNodeData>;
}

export const NODE_TEMPLATES: NodeTemplate[] = [
  // Timing (When to trade)
  {
    type: "trading-times",
    label: "Always",
    category: "timing",
    description: "Trade at any time",
    defaultData: {
      label: "Always",
      category: "timing",
      timingType: "trading-times",
      mode: "ALWAYS",
      sessions: [],
      tradeMondayToFriday: true,
    } as TradingTimesNodeData,
  },
  {
    type: "trading-times",
    label: "Custom Sessions",
    category: "timing",
    description: "Define specific trading hours",
    defaultData: {
      label: "Custom Sessions",
      category: "timing",
      timingType: "trading-times",
      mode: "CUSTOM",
      sessions: [{ startHour: 8, startMinute: 0, endHour: 17, endMinute: 0 }],
      tradeMondayToFriday: true,
    } as TradingTimesNodeData,
  },
  // Indicators
  {
    type: "moving-average",
    label: "Moving Average",
    category: "indicator",
    description: "SMA, EMA, SMMA, LWMA",
    defaultData: {
      label: "Moving Average",
      category: "indicator",
      indicatorType: "moving-average",
      period: 14,
      method: "SMA",
      appliedPrice: "CLOSE",
      shift: 0,
    } as MovingAverageNodeData,
  },
  {
    type: "rsi",
    label: "RSI",
    category: "indicator",
    description: "Relative Strength Index",
    defaultData: {
      label: "RSI",
      category: "indicator",
      indicatorType: "rsi",
      period: 14,
      appliedPrice: "CLOSE",
      overboughtLevel: 70,
      oversoldLevel: 30,
    } as RSINodeData,
  },
  {
    type: "macd",
    label: "MACD",
    category: "indicator",
    description: "Moving Average Convergence Divergence",
    defaultData: {
      label: "MACD",
      category: "indicator",
      indicatorType: "macd",
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      appliedPrice: "CLOSE",
    } as MACDNodeData,
  },
  {
    type: "bollinger-bands",
    label: "Bollinger Bands",
    category: "indicator",
    description: "Bollinger Bands indicator",
    defaultData: {
      label: "Bollinger Bands",
      category: "indicator",
      indicatorType: "bollinger-bands",
      period: 20,
      deviation: 2,
      appliedPrice: "CLOSE",
      shift: 0,
    } as BollingerBandsNodeData,
  },
  {
    type: "atr",
    label: "ATR",
    category: "indicator",
    description: "Average True Range (volatility)",
    defaultData: {
      label: "ATR",
      category: "indicator",
      indicatorType: "atr",
      period: 14,
    } as ATRNodeData,
  },
  {
    type: "adx",
    label: "ADX",
    category: "indicator",
    description: "Average Directional Index (trend strength)",
    defaultData: {
      label: "ADX",
      category: "indicator",
      indicatorType: "adx",
      period: 14,
      trendLevel: 25,
    } as ADXNodeData,
  },
  // Conditions
  {
    type: "entry-condition",
    label: "Entry Condition",
    category: "condition",
    description: "When to open trades",
    defaultData: {
      label: "Entry Condition",
      category: "condition",
      conditionType: "entry",
      direction: "BUY",
      logic: "AND",
      rules: [],
    } as EntryConditionNodeData,
  },
  {
    type: "exit-condition",
    label: "Exit Condition",
    category: "condition",
    description: "When to close trades",
    defaultData: {
      label: "Exit Condition",
      category: "condition",
      conditionType: "exit",
      exitType: "CLOSE_ALL",
      logic: "AND",
      rules: [],
    } as ExitConditionNodeData,
  },
  // Trading
  {
    type: "position-sizing",
    label: "Position Sizing",
    category: "trading",
    description: "Lot size calculation",
    defaultData: {
      label: "Position Sizing",
      category: "trading",
      tradingType: "position-sizing",
      method: "FIXED_LOT",
      fixedLot: 0.1,
      riskPercent: 2,
      balancePercent: 5,
      minLot: 0.01,
      maxLot: 10,
    } as PositionSizingNodeData,
  },
  {
    type: "stop-loss",
    label: "Stop Loss",
    category: "trading",
    description: "SL placement",
    defaultData: {
      label: "Stop Loss",
      category: "trading",
      tradingType: "stop-loss",
      method: "FIXED_PIPS",
      fixedPips: 50,
      atrMultiplier: 1.5,
      atrPeriod: 14,
    } as StopLossNodeData,
  },
  {
    type: "take-profit",
    label: "Take Profit",
    category: "trading",
    description: "TP placement",
    defaultData: {
      label: "Take Profit",
      category: "trading",
      tradingType: "take-profit",
      method: "FIXED_PIPS",
      fixedPips: 100,
      riskRewardRatio: 2,
      atrMultiplier: 3,
      atrPeriod: 14,
    } as TakeProfitNodeData,
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getNodeTemplate(type: BuilderNodeType): NodeTemplate | undefined {
  return NODE_TEMPLATES.find((t) => t.type === type);
}

export function getCategoryColor(category: NodeCategory): string {
  switch (category) {
    case "timing":
      return "orange";
    case "indicator":
      return "blue";
    case "condition":
      return "amber";
    case "trading":
      return "green";
    default:
      return "gray";
  }
}

export function getCategoryLabel(category: NodeCategory): string {
  switch (category) {
    case "timing":
      return "When to trade";
    case "indicator":
      return "Indicators";
    case "condition":
      return "Conditions";
    case "trading":
      return "Trading";
    default:
      return "Other";
  }
}
