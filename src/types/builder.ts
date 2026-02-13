// TypeScript types for the Visual EA Builder

import type { Node, Edge, Viewport } from "@xyflow/react";

// ============================================
// NODE DATA TYPES
// ============================================

export type NodeCategory =
  | "timing"
  | "indicator"
  | "priceaction"
  | "entry"
  | "trading"
  | "riskmanagement"
  | "trademanagement"
  | "entrystrategy";

// Base data all nodes have
export interface BaseNodeData extends Record<string, unknown> {
  label: string;
  category: NodeCategory;
  optimizableFields?: string[]; // Field names that should be exported as input variables for optimization
}

// Timing Nodes
export type TradingSession =
  | "LONDON"
  | "NEW_YORK"
  | "TOKYO"
  | "SYDNEY"
  | "LONDON_NY_OVERLAP"
  | "CUSTOM";

export interface TradingSessionNodeData extends BaseNodeData {
  category: "timing";
  timingType: "trading-session";
  session: TradingSession;
  tradingDays: TradingDays;
  useServerTime?: boolean;
  customStartHour?: number;
  customStartMinute?: number;
  customEndHour?: number;
  customEndMinute?: number;
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
  closeOnSessionEnd?: boolean;
}

export interface MaxSpreadNodeData extends BaseNodeData {
  category: "timing";
  filterType: "max-spread";
  maxSpreadPips: number;
}

export interface VolatilityFilterNodeData extends BaseNodeData {
  category: "timing";
  filterType: "volatility-filter";
  atrPeriod: number; // 1-1000, default 14
  atrTimeframe: Timeframe; // default "H1"
  minAtrPips: number; // 0-10000, default 0 (0 = disabled)
  maxAtrPips: number; // 0-10000, default 50
}

export interface FridayCloseFilterNodeData extends BaseNodeData {
  category: "timing";
  filterType: "friday-close";
  closeHour: number; // 0-23, default 17
  closeMinute: number; // 0-59, default 0
  useServerTime?: boolean; // default true
  closePending?: boolean; // also delete pending orders, default true
}

export interface NewsFilterNodeData extends BaseNodeData {
  category: "timing";
  filterType: "news-filter";
  hoursBefore: number; // 0-24, default 0.5
  hoursAfter: number; // 0-24, default 0.5
  highImpact: boolean; // default true
  mediumImpact: boolean; // default false
  lowImpact: boolean; // default false
  closePositions: boolean; // close open positions during news, default false
}

export type TimingNodeData =
  | TradingSessionNodeData
  | AlwaysNodeData
  | CustomTimesNodeData
  | MaxSpreadNodeData
  | VolatilityFilterNodeData
  | FridayCloseFilterNodeData
  | NewsFilterNodeData;

// Session time definitions (GMT)
export const SESSION_TIMES: Record<TradingSession, { start: string; end: string; label: string }> =
  {
    LONDON: { start: "08:00", end: "17:00", label: "London Session" },
    NEW_YORK: { start: "13:00", end: "22:00", label: "New York Session" },
    TOKYO: { start: "00:00", end: "09:00", label: "Tokyo Session" },
    SYDNEY: { start: "22:00", end: "07:00", label: "Sydney Session" },
    LONDON_NY_OVERLAP: { start: "13:00", end: "17:00", label: "London/NY Overlap" },
    CUSTOM: { start: "08:00", end: "17:00", label: "Custom Session" },
  };

// Timeframe type for indicators and price action
export type Timeframe = "M1" | "M5" | "M15" | "M30" | "H1" | "H4" | "D1" | "W1" | "MN1";

// Indicator Nodes
export interface MovingAverageNodeData extends BaseNodeData {
  category: "indicator";
  indicatorType: "moving-average";
  timeframe: Timeframe;
  period: number;
  method: "SMA" | "EMA";
  appliedPrice?: "CLOSE" | "OPEN" | "HIGH" | "LOW" | "MEDIAN" | "TYPICAL" | "WEIGHTED";
  signalMode?: "every_tick" | "candle_close";
  shift: number;
}

export interface RSINodeData extends BaseNodeData {
  category: "indicator";
  indicatorType: "rsi";
  timeframe: Timeframe;
  period: number;
  appliedPrice?: "CLOSE" | "OPEN" | "HIGH" | "LOW" | "MEDIAN" | "TYPICAL" | "WEIGHTED";
  signalMode?: "every_tick" | "candle_close";
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
  appliedPrice?: "CLOSE" | "OPEN" | "HIGH" | "LOW" | "MEDIAN" | "TYPICAL" | "WEIGHTED";
  signalMode?: "every_tick" | "candle_close";
}

export interface BollingerBandsNodeData extends BaseNodeData {
  category: "indicator";
  indicatorType: "bollinger-bands";
  timeframe: Timeframe;
  period: number;
  deviation: number;
  appliedPrice?: "CLOSE" | "OPEN" | "HIGH" | "LOW" | "MEDIAN" | "TYPICAL" | "WEIGHTED";
  signalMode?: "every_tick" | "candle_close";
  shift: number;
}

export interface ATRNodeData extends BaseNodeData {
  category: "indicator";
  indicatorType: "atr";
  timeframe: Timeframe;
  period: number;
  signalMode?: "every_tick" | "candle_close";
}

export interface ADXNodeData extends BaseNodeData {
  category: "indicator";
  indicatorType: "adx";
  timeframe: Timeframe;
  period: number;
  trendLevel: number;
  signalMode?: "every_tick" | "candle_close";
}

export interface StochasticNodeData extends BaseNodeData {
  category: "indicator";
  indicatorType: "stochastic";
  timeframe: Timeframe;
  kPeriod: number;
  dPeriod: number;
  slowing: number;
  maMethod?: "SMA" | "EMA";
  priceField?: "LOWHIGH" | "CLOSECLOSE";
  overboughtLevel: number;
  oversoldLevel: number;
  signalMode?: "every_tick" | "candle_close";
}

export interface CCINodeData extends BaseNodeData {
  category: "indicator";
  indicatorType: "cci";
  timeframe: Timeframe;
  period: number;
  appliedPrice?: "CLOSE" | "OPEN" | "HIGH" | "LOW" | "MEDIAN" | "TYPICAL" | "WEIGHTED";
  signalMode?: "every_tick" | "candle_close";
  overboughtLevel: number;
  oversoldLevel: number;
}

export type IndicatorNodeData =
  | MovingAverageNodeData
  | RSINodeData
  | MACDNodeData
  | BollingerBandsNodeData
  | ATRNodeData
  | ADXNodeData
  | StochasticNodeData
  | CCINodeData;

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
  // Timezone
  useServerTime?: boolean;
}

export type PriceActionNodeData =
  | CandlestickPatternNodeData
  | SupportResistanceNodeData
  | RangeBreakoutNodeData;

// Trading Nodes
export type PositionSizingMethod = "FIXED_LOT" | "RISK_PERCENT";
export type OrderType = "MARKET" | "STOP" | "LIMIT";

// Base interface for position sizing fields (shared by PlaceBuy and PlaceSell)
interface PositionSizingFields {
  method: PositionSizingMethod;
  fixedLot: number;
  riskPercent: number;
  minLot: number;
  maxLot: number;
  orderType?: OrderType;
  pendingOffset?: number;
}

export interface PlaceBuyNodeData extends BaseNodeData, PositionSizingFields {
  category: "entry" | "trading";
  tradingType: "place-buy";
}

export interface PlaceSellNodeData extends BaseNodeData, PositionSizingFields {
  category: "entry" | "trading";
  tradingType: "place-sell";
}

export type StopLossMethod =
  | "FIXED_PIPS"
  | "ATR_BASED"
  | "PERCENT"
  | "INDICATOR"
  | "RANGE_OPPOSITE";

export interface StopLossNodeData extends BaseNodeData {
  category: "riskmanagement" | "trading";
  tradingType: "stop-loss";
  method: StopLossMethod;
  fixedPips: number;
  slPercent: number;
  atrMultiplier: number;
  atrPeriod: number;
  indicatorNodeId?: string;
}

export type TakeProfitMethod = "FIXED_PIPS" | "RISK_REWARD" | "ATR_BASED";

export interface TakeProfitNodeData extends BaseNodeData {
  category: "riskmanagement" | "trading";
  tradingType: "take-profit";
  method: TakeProfitMethod;
  fixedPips: number;
  riskRewardRatio: number;
  atrMultiplier: number;
  atrPeriod: number;
}

export type CloseDirection = "BUY" | "SELL" | "BOTH";

export interface CloseConditionNodeData extends BaseNodeData {
  category: "riskmanagement" | "trading";
  tradingType: "close-condition";
  closeDirection: CloseDirection;
}

export interface TimeExitNodeData extends BaseNodeData {
  category: "riskmanagement" | "trading";
  tradingType: "time-exit";
  exitAfterBars: number;
  exitTimeframe: Timeframe;
}

export type TradingNodeData =
  | PlaceBuyNodeData
  | PlaceSellNodeData
  | StopLossNodeData
  | TakeProfitNodeData
  | CloseConditionNodeData
  | TimeExitNodeData;

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

export type PartialCloseTrigger = "PIPS" | "PERCENT";

export interface PartialCloseNodeData extends BaseNodeData {
  category: "trademanagement";
  managementType: "partial-close";
  closePercent: number; // Percentage of position to close
  triggerMethod: PartialCloseTrigger;
  triggerPips: number; // Close when profit reaches X pips
  triggerPercent: number; // Close when profit reaches X %
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

// ============================================
// ENTRY STRATEGY NODES (composite blocks)
// ============================================

// Consistent risk model across all entry strategies:
//   Risk % → position sizing
//   SL = ATR(14) * slAtrMultiplier
//   TP = tpRMultiple * SL distance
export type EntryDirection = "BUY" | "SELL" | "BOTH";

export type EntrySlMethod = "ATR" | "PIPS" | "PERCENT" | "RANGE_OPPOSITE";

export interface BaseEntryStrategyFields {
  direction: EntryDirection;
  timeframe: Timeframe;
  riskPercent: number;
  slMethod: EntrySlMethod;
  slFixedPips: number;
  slPercent: number;
  slAtrMultiplier: number;
  slAtrPeriod?: number;
  slAtrTimeframe?: Timeframe;
  tpRMultiple: number;
}

// 1) EMA Crossover — trend following
export interface EMACrossoverEntryData extends BaseNodeData, BaseEntryStrategyFields {
  category: "entrystrategy";
  entryType: "ema-crossover";
  // Basic
  fastEma: number;
  slowEma: number;
  appliedPrice?: "CLOSE" | "OPEN" | "HIGH" | "LOW";
  // Advanced toggles
  htfTrendFilter: boolean;
  htfTimeframe: Timeframe;
  htfEma: number;
  rsiConfirmation: boolean;
  rsiPeriod: number;
  rsiLongMax: number;
  rsiShortMin: number;
  minEmaSeparation?: number; // pips, 0 = disabled
}

// 2) Range Breakout — breakout of recent range
export type BreakoutEntryMode = "CANDLE_CLOSE" | "CURRENT_PRICE";

export interface RangeBreakoutEntryData extends BaseNodeData, BaseEntryStrategyFields {
  category: "entrystrategy";
  entryType: "range-breakout";
  // Basic
  rangePeriod: number;
  rangeMethod: "CANDLES" | "CUSTOM_TIME";
  rangeTimeframe: Timeframe;
  breakoutEntry: BreakoutEntryMode;
  breakoutTimeframe: Timeframe;
  customStartHour: number;
  customStartMinute: number;
  customEndHour: number;
  customEndMinute: number;
  useServerTime: boolean;
  bufferPips: number;
  // Advanced toggles
  cancelOpposite: boolean;
  closeAtTime: boolean;
  closeAtHour: number;
  closeAtMinute: number;
  htfTrendFilter: boolean;
  htfTimeframe: Timeframe;
  htfEma: number;
  minRangePips: number;
  maxRangePips: number;
}

// 3) RSI Reversal — mean reversion
export interface RSIReversalEntryData extends BaseNodeData, BaseEntryStrategyFields {
  category: "entrystrategy";
  entryType: "rsi-reversal";
  // Basic
  rsiPeriod: number;
  oversoldLevel: number;
  overboughtLevel: number;
  appliedPrice?: "CLOSE" | "OPEN" | "HIGH" | "LOW" | "MEDIAN" | "TYPICAL" | "WEIGHTED";
  // Advanced toggles
  trendFilter: boolean;
  trendEma: number;
}

// 4) Trend Pullback — EMA trend + RSI dip entry
export interface TrendPullbackEntryData extends BaseNodeData, BaseEntryStrategyFields {
  category: "entrystrategy";
  entryType: "trend-pullback";
  // Basic
  trendEma: number;
  pullbackRsiPeriod: number;
  rsiPullbackLevel: number; // long threshold; short = 100 - this
  pullbackMaxDistance: number; // max % distance from EMA (default 2.0)
  // Advanced toggles
  requireEmaBuffer: boolean;
  useAdxFilter: boolean;
  adxPeriod: number;
  adxThreshold: number;
  appliedPrice?: "CLOSE" | "OPEN" | "HIGH" | "LOW" | "MEDIAN" | "TYPICAL" | "WEIGHTED";
}

// 5) MACD Crossover — momentum / trend shift
export interface MACDCrossoverEntryData extends BaseNodeData, BaseEntryStrategyFields {
  category: "entrystrategy";
  entryType: "macd-crossover";
  // Basic
  macdFast: number;
  macdSlow: number;
  macdSignal: number;
  appliedPrice?: "CLOSE" | "OPEN" | "HIGH" | "LOW" | "MEDIAN" | "TYPICAL" | "WEIGHTED";
  macdSignalType?: "SIGNAL_CROSS" | "ZERO_CROSS" | "HISTOGRAM_SIGN";
  // Advanced toggles
  htfTrendFilter: boolean;
  htfTimeframe: Timeframe;
  htfEma: number;
}

export type EntryStrategyNodeData =
  | EMACrossoverEntryData
  | RangeBreakoutEntryData
  | RSIReversalEntryData
  | TrendPullbackEntryData
  | MACDCrossoverEntryData;

// Union of all node data types
export type BuilderNodeData =
  | TimingNodeData
  | IndicatorNodeData
  | PriceActionNodeData
  | TradingNodeData
  | TradeManagementNodeData
  | EntryStrategyNodeData;

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
  | "stochastic"
  | "cci"
  | "candlestick-pattern"
  | "support-resistance"
  | "range-breakout"
  | "place-buy"
  | "place-sell"
  | "stop-loss"
  | "take-profit"
  | "close-condition"
  | "time-exit"
  | "breakeven-stop"
  | "trailing-stop"
  | "partial-close"
  | "lock-profit"
  | "ema-crossover-entry"
  | "range-breakout-entry"
  | "rsi-reversal-entry"
  | "trend-pullback-entry"
  | "macd-crossover-entry"
  | "max-spread"
  | "volatility-filter"
  | "friday-close"
  | "news-filter";

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
  maxTradesPerDay?: number; // 0 = unlimited
  maxDailyProfitPercent?: number; // 0 = disabled
  maxDailyLossPercent?: number; // 0 = disabled (drawdown protection)
}

export interface BuildJsonMetadata {
  createdAt: string;
  updatedAt: string;
}

export interface BuildJsonSchema {
  version: "1.0" | "1.1";
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
  maxTradesPerDay: 0,
  maxDailyProfitPercent: 0,
  maxDailyLossPercent: 0,
};

export const DEFAULT_BUILD_JSON: BuildJsonSchema = {
  version: "1.1",
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
    type: "trading-session",
    label: "Trading Sessions",
    category: "timing",
    description: "Predefined market sessions",
    defaultData: {
      label: "Trading Sessions",
      category: "timing",
      timingType: "trading-session",
      session: "LONDON",
      tradingDays: {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: false,
        sunday: false,
      },
    } as TradingSessionNodeData,
  },
  {
    type: "max-spread",
    label: "Max Spread",
    category: "timing",
    description: "Skip trading when spread is too wide",
    defaultData: {
      label: "Max Spread",
      category: "timing",
      filterType: "max-spread",
      maxSpreadPips: 30,
    } as MaxSpreadNodeData,
  },
  {
    type: "volatility-filter",
    label: "Volatility Filter",
    category: "timing",
    description: "Skip trading when volatility (ATR) is too low or too high",
    defaultData: {
      label: "Volatility Filter",
      category: "timing",
      filterType: "volatility-filter",
      atrPeriod: 14,
      atrTimeframe: "H1",
      minAtrPips: 0,
      maxAtrPips: 50,
    } as VolatilityFilterNodeData,
  },
  {
    type: "friday-close",
    label: "Friday Close",
    category: "timing",
    description: "Close all positions on Friday at specified time",
    defaultData: {
      label: "Friday Close",
      category: "timing",
      filterType: "friday-close",
      closeHour: 17,
      closeMinute: 0,
      useServerTime: true,
      closePending: true,
    } as FridayCloseFilterNodeData,
  },
  {
    type: "news-filter",
    label: "News Filter",
    category: "timing",
    description: "Block trades around economic news events (supports backtest via CSV)",
    defaultData: {
      label: "News Filter",
      category: "timing",
      filterType: "news-filter",
      hoursBefore: 0.5,
      hoursAfter: 0.5,
      highImpact: true,
      mediumImpact: false,
      lowImpact: false,
      closePositions: false,
    } as NewsFilterNodeData,
  },
  // Entry Strategies (composite blocks) — ordered by UX appeal
  {
    type: "range-breakout-entry",
    label: "Range Breakout",
    category: "entrystrategy",
    description: "Breakout of recent price range",
    defaultData: {
      label: "Range Breakout",
      category: "entrystrategy",
      entryType: "range-breakout",
      direction: "BOTH",
      timeframe: "H1",
      rangePeriod: 20,
      rangeMethod: "CUSTOM_TIME",
      rangeTimeframe: "H1",
      breakoutEntry: "CANDLE_CLOSE",
      breakoutTimeframe: "H1",
      customStartHour: 0,
      customStartMinute: 0,
      customEndHour: 8,
      customEndMinute: 0,
      useServerTime: true,
      bufferPips: 2,
      riskPercent: 1,
      slMethod: "ATR",
      slFixedPips: 50,
      slPercent: 1,
      slAtrMultiplier: 1.5,
      tpRMultiple: 2,
      cancelOpposite: true,
      closeAtTime: false,
      closeAtHour: 17,
      closeAtMinute: 0,
      minRangePips: 0,
      maxRangePips: 0,
      htfTrendFilter: false,
      htfTimeframe: "H4",
      htfEma: 200,
    } as RangeBreakoutEntryData,
  },
  {
    type: "ema-crossover-entry",
    label: "EMA Crossover",
    category: "entrystrategy",
    description: "Classic trend following with EMAs",
    defaultData: {
      label: "EMA Crossover",
      category: "entrystrategy",
      entryType: "ema-crossover",
      direction: "BOTH",
      timeframe: "H1",
      fastEma: 50,
      slowEma: 200,
      riskPercent: 1,
      slMethod: "ATR",
      slFixedPips: 50,
      slPercent: 1,
      slAtrMultiplier: 1.5,
      tpRMultiple: 2,
      htfTrendFilter: false,
      htfTimeframe: "H4",
      htfEma: 200,
      rsiConfirmation: false,
      rsiPeriod: 14,
      rsiLongMax: 60,
      rsiShortMin: 40,
      minEmaSeparation: 0,
    } as EMACrossoverEntryData,
  },
  {
    type: "trend-pullback-entry",
    label: "Trend Pullback",
    category: "entrystrategy",
    description: "Enter on pullback in a trending market",
    defaultData: {
      label: "Trend Pullback",
      category: "entrystrategy",
      entryType: "trend-pullback",
      direction: "BOTH",
      timeframe: "H1",
      trendEma: 200,
      pullbackRsiPeriod: 14,
      rsiPullbackLevel: 40,
      pullbackMaxDistance: 2.0,
      riskPercent: 1,
      slMethod: "ATR",
      slFixedPips: 50,
      slPercent: 1,
      slAtrMultiplier: 1.5,
      tpRMultiple: 2,
      requireEmaBuffer: false,
      useAdxFilter: false,
      adxPeriod: 14,
      adxThreshold: 25,
    } as TrendPullbackEntryData,
  },
  {
    type: "rsi-reversal-entry",
    label: "RSI Reversal",
    category: "entrystrategy",
    description: "Mean reversion at RSI extremes",
    defaultData: {
      label: "RSI Reversal",
      category: "entrystrategy",
      entryType: "rsi-reversal",
      direction: "BOTH",
      timeframe: "H1",
      rsiPeriod: 14,
      oversoldLevel: 30,
      overboughtLevel: 70,
      riskPercent: 1,
      slMethod: "ATR",
      slFixedPips: 50,
      slPercent: 1,
      slAtrMultiplier: 1.2,
      tpRMultiple: 1.5,
      trendFilter: false,
      trendEma: 200,
    } as RSIReversalEntryData,
  },
  {
    type: "macd-crossover-entry",
    label: "MACD Crossover",
    category: "entrystrategy",
    description: "Momentum shift on MACD signal cross",
    defaultData: {
      label: "MACD Crossover",
      category: "entrystrategy",
      entryType: "macd-crossover",
      direction: "BOTH",
      timeframe: "H1",
      macdFast: 12,
      macdSlow: 26,
      macdSignal: 9,
      riskPercent: 1,
      slMethod: "ATR",
      slFixedPips: 50,
      slPercent: 1,
      slAtrMultiplier: 1.5,
      tpRMultiple: 2,
      htfTrendFilter: false,
      htfTimeframe: "H4",
      htfEma: 200,
    } as MACDCrossoverEntryData,
  },
  // Trade Management
  {
    type: "breakeven-stop",
    label: "Stoploss to Breakeven",
    category: "trademanagement",
    description: "Move SL to breakeven at profit target",
    defaultData: {
      label: "Stoploss to Breakeven",
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
    defaultData: {
      label: "Partial Close",
      category: "trademanagement",
      managementType: "partial-close",
      closePercent: 50,
      triggerMethod: "PIPS",
      triggerPips: 30,
      triggerPercent: 1,
      moveSLToBreakeven: true,
    } as PartialCloseNodeData,
  },
  {
    type: "lock-profit",
    label: "Lock Profit",
    category: "trademanagement",
    description: "Move SL to lock in profits",
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
    case "entry":
    case "trading":
    case "entrystrategy":
      return "green";
    case "riskmanagement":
      return "rose";
    case "trademanagement":
      return "purple";
    default:
      return "gray";
  }
}

export function getCategoryLabel(category: NodeCategory): string {
  switch (category) {
    case "timing":
      return "Filters";
    case "indicator":
      return "Indicators";
    case "priceaction":
      return "Price Action";
    case "entry":
      return "Entry";
    case "entrystrategy":
      return "Entry Strategies";
    case "trading":
      return "Trade Execution";
    case "riskmanagement":
      return "Risk Management";
    case "trademanagement":
      return "Trade Management";
    default:
      return "Other";
  }
}
