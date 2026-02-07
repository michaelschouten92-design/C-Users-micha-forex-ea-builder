// TypeScript types for the Visual EA Builder

import type { Node, Edge, Viewport } from "@xyflow/react";

// ============================================
// NODE DATA TYPES
// ============================================

export type NodeCategory = "timing" | "indicator" | "priceaction" | "trading" | "trademanagement";

// Base data all nodes have
export interface BaseNodeData extends Record<string, unknown> {
  label: string;
  category: NodeCategory;
  optimizableFields?: string[]; // Field names that should be exported as input variables for optimization
}

// Timing Nodes
export type TradingSession = "LONDON" | "NEW_YORK" | "TOKYO" | "SYDNEY" | "LONDON_NY_OVERLAP";

export interface TradingSessionNodeData extends BaseNodeData {
  category: "timing";
  timingType: "trading-session";
  session: TradingSession;
  tradeMondayToFriday: boolean;
  useServerTime?: boolean;
}

export interface AlwaysNodeData extends BaseNodeData {
  category: "timing";
  timingType: "always";
}

export interface TradingDays {
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
}

export interface TimeSlot {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}

export interface CustomTimesNodeData extends BaseNodeData {
  category: "timing";
  timingType: "custom-times";
  days: TradingDays;
  timeSlots: TimeSlot[];
  useServerTime?: boolean;
}

export type TimingNodeData = TradingSessionNodeData | AlwaysNodeData | CustomTimesNodeData;

// Session time definitions (GMT)
export const SESSION_TIMES: Record<TradingSession, { start: string; end: string; label: string }> = {
  LONDON: { start: "08:00", end: "17:00", label: "London Session" },
  NEW_YORK: { start: "13:00", end: "22:00", label: "New York Session" },
  TOKYO: { start: "00:00", end: "09:00", label: "Tokyo Session" },
  SYDNEY: { start: "22:00", end: "07:00", label: "Sydney Session" },
  LONDON_NY_OVERLAP: { start: "13:00", end: "17:00", label: "London/NY Overlap" },
};

// Timeframe type for indicators and price action
export type Timeframe = "M1" | "M5" | "M15" | "M30" | "H1" | "H4" | "D1" | "W1" | "MN1";

// Indicator Nodes
export interface MovingAverageNodeData extends BaseNodeData {
  category: "indicator";
  indicatorType: "moving-average";
  timeframe: Timeframe;
  period: number;
  method: "SMA" | "EMA" | "SMMA" | "LWMA";
  appliedPrice: "CLOSE" | "OPEN" | "HIGH" | "LOW" | "MEDIAN" | "TYPICAL" | "WEIGHTED";
  shift: number;
}

export interface RSINodeData extends BaseNodeData {
  category: "indicator";
  indicatorType: "rsi";
  timeframe: Timeframe;
  period: number;
  appliedPrice: "CLOSE" | "OPEN" | "HIGH" | "LOW" | "MEDIAN" | "TYPICAL" | "WEIGHTED";
  overboughtLevel: number;
  oversoldLevel: number;
}

export interface MACDNodeData extends BaseNodeData {
  category: "indicator";
  indicatorType: "macd";
  timeframe: Timeframe;
  fastPeriod: number;
  slowPeriod: number;
  signalPeriod: number;
  appliedPrice: "CLOSE" | "OPEN" | "HIGH" | "LOW" | "MEDIAN" | "TYPICAL" | "WEIGHTED";
}

export interface BollingerBandsNodeData extends BaseNodeData {
  category: "indicator";
  indicatorType: "bollinger-bands";
  timeframe: Timeframe;
  period: number;
  deviation: number;
  appliedPrice: "CLOSE" | "OPEN" | "HIGH" | "LOW" | "MEDIAN" | "TYPICAL" | "WEIGHTED";
  shift: number;
}

export interface ATRNodeData extends BaseNodeData {
  category: "indicator";
  indicatorType: "atr";
  timeframe: Timeframe;
  period: number;
}

export interface ADXNodeData extends BaseNodeData {
  category: "indicator";
  indicatorType: "adx";
  timeframe: Timeframe;
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

// Price Action Nodes
export type CandlestickPattern =
  | "ENGULFING_BULLISH"
  | "ENGULFING_BEARISH"
  | "DOJI"
  | "HAMMER"
  | "SHOOTING_STAR"
  | "MORNING_STAR"
  | "EVENING_STAR"
  | "THREE_WHITE_SOLDIERS"
  | "THREE_BLACK_CROWS";

export interface CandlestickPatternNodeData extends BaseNodeData {
  category: "priceaction";
  priceActionType: "candlestick-pattern";
  timeframe: Timeframe;
  patterns: CandlestickPattern[];
  minBodySize: number; // Minimum body size in pips
}

export interface SupportResistanceNodeData extends BaseNodeData {
  category: "priceaction";
  priceActionType: "support-resistance";
  timeframe: Timeframe;
  lookbackPeriod: number;
  touchCount: number; // Minimum touches to confirm level
  zoneSize: number; // Zone size in pips
}

// Range Breakout Node
export type RangeType = "PREVIOUS_CANDLES" | "SESSION" | "TIME_WINDOW";
export type RangeSession = "ASIAN" | "LONDON" | "NEW_YORK" | "CUSTOM";
export type BreakoutDirection = "BUY_ON_HIGH" | "SELL_ON_LOW" | "BOTH";
export type EntryMode = "IMMEDIATE" | "ON_CLOSE" | "AFTER_RETEST";

export interface RangeBreakoutNodeData extends BaseNodeData {
  category: "priceaction";
  priceActionType: "range-breakout";
  timeframe: Timeframe;
  // Range definition
  rangeType: RangeType;
  lookbackCandles: number; // For PREVIOUS_CANDLES
  rangeSession: RangeSession; // For SESSION
  sessionStartHour: number; // For CUSTOM session or TIME_WINDOW
  sessionStartMinute: number;
  sessionEndHour: number;
  sessionEndMinute: number;
  // Breakout settings
  breakoutDirection: BreakoutDirection;
  entryMode: EntryMode;
  bufferPips: number; // Extra pips above/below range for confirmation
  // Filters
  minRangePips: number;
  maxRangePips: number; // 0 = no maximum
}

export type PriceActionNodeData =
  | CandlestickPatternNodeData
  | SupportResistanceNodeData
  | RangeBreakoutNodeData;

// Trading Nodes
export type PositionSizingMethod = "FIXED_LOT" | "RISK_PERCENT";

// Base interface for position sizing fields (shared by PlaceBuy and PlaceSell)
interface PositionSizingFields {
  method: PositionSizingMethod;
  fixedLot: number;
  riskPercent: number;
  minLot: number;
  maxLot: number;
}

export interface PlaceBuyNodeData extends BaseNodeData, PositionSizingFields {
  category: "trading";
  tradingType: "place-buy";
}

export interface PlaceSellNodeData extends BaseNodeData, PositionSizingFields {
  category: "trading";
  tradingType: "place-sell";
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

export type CloseDirection = "BUY" | "SELL" | "BOTH";

export interface CloseConditionNodeData extends BaseNodeData {
  category: "trading";
  tradingType: "close-condition";
  closeDirection: CloseDirection;
}

export type TradingNodeData =
  | PlaceBuyNodeData
  | PlaceSellNodeData
  | StopLossNodeData
  | TakeProfitNodeData
  | CloseConditionNodeData;

// Trade Management Nodes (Pro only)
export type BreakevenTrigger = "PIPS" | "ATR" | "PERCENTAGE";

export interface BreakevenStopNodeData extends BaseNodeData {
  category: "trademanagement";
  managementType: "breakeven-stop";
  trigger: BreakevenTrigger;
  triggerPips: number;
  triggerPercent: number; // Percentage of position value as profit
  triggerAtrMultiplier: number;
  triggerAtrPeriod: number;
  lockPips: number; // Extra pips above breakeven to lock
}

export type TrailingStopMethod = "FIXED_PIPS" | "ATR_BASED" | "PERCENTAGE";

export interface TrailingStopNodeData extends BaseNodeData {
  category: "trademanagement";
  managementType: "trailing-stop";
  method: TrailingStopMethod;
  trailPips: number;
  trailAtrMultiplier: number;
  trailAtrPeriod: number;
  trailPercent: number;
  startAfterPips: number; // Only start trailing after X pips profit
}

export interface PartialCloseNodeData extends BaseNodeData {
  category: "trademanagement";
  managementType: "partial-close";
  closePercent: number; // Percentage of position to close
  triggerPips: number; // Close when profit reaches X pips
  moveSLToBreakeven: boolean; // Move SL to breakeven after partial close
}

export type LockProfitMethod = "PERCENTAGE" | "FIXED_PIPS";

export interface LockProfitNodeData extends BaseNodeData {
  category: "trademanagement";
  managementType: "lock-profit";
  method: LockProfitMethod;
  lockPercent: number; // Lock X% of current profit
  lockPips: number; // Or lock at X pips profit
  checkIntervalPips: number; // Re-check every X pips of new profit
}

export type TradeManagementNodeData =
  | BreakevenStopNodeData
  | TrailingStopNodeData
  | PartialCloseNodeData
  | LockProfitNodeData;

// Union of all node data types
export type BuilderNodeData =
  | TimingNodeData
  | IndicatorNodeData
  | PriceActionNodeData
  | TradingNodeData
  | TradeManagementNodeData;

// ============================================
// NODE TYPES
// ============================================

export type BuilderNodeType =
  | "trading-session"
  | "always"
  | "custom-times"
  | "moving-average"
  | "rsi"
  | "macd"
  | "bollinger-bands"
  | "atr"
  | "adx"
  | "candlestick-pattern"
  | "support-resistance"
  | "range-breakout"
  | "place-buy"
  | "place-sell"
  | "stop-loss"
  | "take-profit"
  | "close-condition"
  | "breakeven-stop"
  | "trailing-stop"
  | "partial-close"
  | "lock-profit";

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
  maxBuyPositions?: number;
  maxSellPositions?: number;
  conditionMode?: "AND" | "OR";
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
  proOnly?: boolean; // Only available for Pro users
}

export const NODE_TEMPLATES: NodeTemplate[] = [
  // Timing (When to trade)
  {
    type: "always",
    label: "Always",
    category: "timing",
    description: "Trade at all times",
    defaultData: {
      label: "Always",
      category: "timing",
      timingType: "always",
    } as AlwaysNodeData,
  },
  {
    type: "custom-times",
    label: "Custom Times",
    category: "timing",
    description: "Custom days and time slots",
    defaultData: {
      label: "Custom Times",
      category: "timing",
      timingType: "custom-times",
      days: {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: false,
        sunday: false,
      },
      timeSlots: [{ startHour: 8, startMinute: 0, endHour: 17, endMinute: 0 }],
    } as CustomTimesNodeData,
  },
  {
    type: "trading-session",
    label: "Trading Sessions",
    category: "timing",
    description: "Predefined market sessions",
    defaultData: {
      label: "Trading Sessions",
      category: "timing",
      timingType: "trading-session",
      session: "LONDON",
      tradeMondayToFriday: true,
    } as TradingSessionNodeData,
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
      timeframe: "H1",
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
      timeframe: "H1",
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
      timeframe: "H1",
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
      timeframe: "H1",
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
      timeframe: "H1",
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
      timeframe: "H1",
      period: 14,
      trendLevel: 25,
    } as ADXNodeData,
  },
  // Price Action
  {
    type: "candlestick-pattern",
    label: "Candlestick Patterns",
    category: "priceaction",
    description: "Detect candle patterns",
    defaultData: {
      label: "Candlestick Patterns",
      category: "priceaction",
      priceActionType: "candlestick-pattern",
      timeframe: "H1",
      patterns: ["ENGULFING_BULLISH", "ENGULFING_BEARISH"],
      minBodySize: 5,
    } as CandlestickPatternNodeData,
  },
  {
    type: "support-resistance",
    label: "Support/Resistance",
    category: "priceaction",
    description: "Key price levels",
    defaultData: {
      label: "Support/Resistance",
      category: "priceaction",
      priceActionType: "support-resistance",
      timeframe: "H1",
      lookbackPeriod: 100,
      touchCount: 2,
      zoneSize: 10,
    } as SupportResistanceNodeData,
  },
  {
    type: "range-breakout",
    label: "Range Breakout",
    category: "priceaction",
    description: "Trade breakouts from price ranges",
    defaultData: {
      label: "Range Breakout",
      category: "priceaction",
      priceActionType: "range-breakout",
      timeframe: "H1",
      rangeType: "PREVIOUS_CANDLES",
      lookbackCandles: 20,
      rangeSession: "ASIAN",
      sessionStartHour: 0,
      sessionStartMinute: 0,
      sessionEndHour: 8,
      sessionEndMinute: 0,
      breakoutDirection: "BOTH",
      entryMode: "ON_CLOSE",
      bufferPips: 2,
      minRangePips: 10,
      maxRangePips: 0,
    } as RangeBreakoutNodeData,
  },
  // Trading
  {
    type: "place-buy",
    label: "Place Buy",
    category: "trading",
    description: "Open a buy position",
    defaultData: {
      label: "Place Buy",
      category: "trading",
      tradingType: "place-buy",
      method: "FIXED_LOT",
      fixedLot: 0.1,
      riskPercent: 2,
      minLot: 0.01,
      maxLot: 10,
    } as PlaceBuyNodeData,
  },
  {
    type: "place-sell",
    label: "Place Sell",
    category: "trading",
    description: "Open a sell position",
    defaultData: {
      label: "Place Sell",
      category: "trading",
      tradingType: "place-sell",
      method: "FIXED_LOT",
      fixedLot: 0.1,
      riskPercent: 2,
      minLot: 0.01,
      maxLot: 10,
    } as PlaceSellNodeData,
  },
  {
    type: "stop-loss",
    label: "Stoploss",
    category: "trading",
    description: "Stop loss placement",
    defaultData: {
      label: "Stoploss",
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
    description: "Take profit placement",
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
  {
    type: "close-condition",
    label: "Close Condition",
    category: "trading",
    description: "Close positions when conditions reverse",
    defaultData: {
      label: "Close Condition",
      category: "trading",
      tradingType: "close-condition",
      closeDirection: "BOTH",
    } as CloseConditionNodeData,
  },
  // Trade Management (Pro only)
  {
    type: "breakeven-stop",
    label: "Breakeven Stop",
    category: "trademanagement",
    description: "Move SL to breakeven at profit target",
    proOnly: true,
    defaultData: {
      label: "Breakeven Stop",
      category: "trademanagement",
      managementType: "breakeven-stop",
      trigger: "PIPS",
      triggerPips: 20,
      triggerPercent: 1,
      triggerAtrMultiplier: 1,
      triggerAtrPeriod: 14,
      lockPips: 5,
    } as BreakevenStopNodeData,
  },
  {
    type: "trailing-stop",
    label: "Trailing Stop",
    category: "trademanagement",
    description: "Dynamic stop that follows price",
    proOnly: true,
    defaultData: {
      label: "Trailing Stop",
      category: "trademanagement",
      managementType: "trailing-stop",
      method: "FIXED_PIPS",
      trailPips: 15,
      trailAtrMultiplier: 1,
      trailAtrPeriod: 14,
      trailPercent: 50,
      startAfterPips: 10,
    } as TrailingStopNodeData,
  },
  {
    type: "partial-close",
    label: "Partial Close",
    category: "trademanagement",
    description: "Close portion of position at target",
    proOnly: true,
    defaultData: {
      label: "Partial Close",
      category: "trademanagement",
      managementType: "partial-close",
      closePercent: 50,
      triggerPips: 30,
      moveSLToBreakeven: true,
    } as PartialCloseNodeData,
  },
  {
    type: "lock-profit",
    label: "Lock Profit",
    category: "trademanagement",
    description: "Move SL to lock in profits",
    proOnly: true,
    defaultData: {
      label: "Lock Profit",
      category: "trademanagement",
      managementType: "lock-profit",
      method: "PERCENTAGE",
      lockPercent: 50,
      lockPips: 20,
      checkIntervalPips: 10,
    } as LockProfitNodeData,
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
    case "priceaction":
      return "yellow";
    case "trading":
      return "green";
    case "trademanagement":
      return "purple";
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
    case "priceaction":
      return "Price Action";
    case "trading":
      return "Trade Execution";
    case "trademanagement":
      return "Trade Management";
    default:
      return "Other";
  }
}
