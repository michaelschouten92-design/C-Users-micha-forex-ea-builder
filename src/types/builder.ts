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
  | "trademanagement";

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
  closeOnSessionEnd?: boolean;
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

export type VolumeFilterMode = "ABOVE_AVERAGE" | "BELOW_AVERAGE" | "SPIKE";

export interface VolumeFilterNodeData extends BaseNodeData {
  category: "timing";
  filterType: "volume-filter";
  timeframe: Timeframe;
  volumePeriod: number; // default 20
  volumeMultiplier: number; // default 1.5
  filterMode: VolumeFilterMode; // default "ABOVE_AVERAGE"
}

export type TimingNodeData =
  | TradingSessionNodeData
  | CustomTimesNodeData
  | MaxSpreadNodeData
  | VolatilityFilterNodeData
  | FridayCloseFilterNodeData
  | NewsFilterNodeData
  | VolumeFilterNodeData;

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
  method: "SMA" | "EMA" | "SMMA" | "LWMA";
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

export type IchimokuMode = "TENKAN_KIJUN_CROSS" | "PRICE_CLOUD" | "FULL";

export interface IchimokuNodeData extends BaseNodeData {
  category: "indicator";
  indicatorType: "ichimoku";
  timeframe: Timeframe;
  tenkanPeriod: number; // default 9
  kijunPeriod: number; // default 26
  senkouBPeriod: number; // default 52
  ichimokuMode?: IchimokuMode; // default "TENKAN_KIJUN_CROSS"
  signalMode?: "every_tick" | "candle_close";
}

export type CustomIndicatorParamType = "double" | "int" | "string" | "bool" | "color";

export interface CustomIndicatorParam {
  name: string;
  value: string; // stored as string, parsed to double/int/string in codegen
  type?: CustomIndicatorParamType; // optional type hint for validation and codegen casting
}

export interface CustomIndicatorNodeData extends BaseNodeData {
  category: "indicator";
  indicatorType: "custom-indicator";
  timeframe: Timeframe;
  indicatorName: string; // file name without extension, e.g. "MyIndicator"
  params: CustomIndicatorParam[]; // up to 8 params
  bufferIndex: number; // which indicator buffer to read (default 0)
  signalMode?: "every_tick" | "candle_close";
}

export interface OBVNodeData extends BaseNodeData {
  category: "indicator";
  indicatorType: "obv";
  timeframe: Timeframe;
  signalPeriod: number; // SMA period for signal line, default 20
  signalMode?: "every_tick" | "candle_close";
}

export interface VWAPNodeData extends BaseNodeData {
  category: "indicator";
  indicatorType: "vwap";
  timeframe: Timeframe;
  resetPeriod: "daily" | "weekly" | "monthly";
  signalMode?: "every_tick" | "candle_close";
}

// Bollinger Bands Squeeze Detection
export type BBSqueezeSignalMode = "SQUEEZE" | "BREAKOUT" | "BOTH";

export interface BBSqueezeNodeData extends BaseNodeData {
  category: "indicator";
  indicatorType: "bb-squeeze";
  timeframe: Timeframe;
  bbPeriod: number; // default 20
  bbDeviation: number; // default 2.0
  kcPeriod: number; // default 20
  kcMultiplier: number; // default 1.5
  signalMode?: "every_tick" | "candle_close";
}

// Condition (Logic) Nodes
export type ConditionOperator =
  | "GREATER_THAN"
  | "LESS_THAN"
  | "GREATER_EQUAL"
  | "LESS_EQUAL"
  | "EQUAL"
  | "CROSSES_ABOVE"
  | "CROSSES_BELOW";

export interface ConditionNodeData extends BaseNodeData {
  category: "indicator";
  indicatorType: "condition";
  conditionType: ConditionOperator;
  threshold: number;
}

export type IndicatorNodeData =
  | MovingAverageNodeData
  | RSINodeData
  | MACDNodeData
  | BollingerBandsNodeData
  | ATRNodeData
  | ADXNodeData
  | StochasticNodeData
  | CCINodeData
  | IchimokuNodeData
  | CustomIndicatorNodeData
  | OBVNodeData
  | VWAPNodeData
  | BBSqueezeNodeData
  | ConditionNodeData;

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
  | "THREE_BLACK_CROWS"
  | "HARAMI_BULLISH"
  | "HARAMI_BEARISH";

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

export interface OrderBlockNodeData extends BaseNodeData {
  category: "priceaction";
  priceActionType: "order-block";
  timeframe: Timeframe;
  lookbackPeriod: number;
  minBlockSize: number;
  maxBlockAge: number;
  signalMode?: "every_tick" | "candle_close";
}

export interface FairValueGapNodeData extends BaseNodeData {
  category: "priceaction";
  priceActionType: "fair-value-gap";
  timeframe: Timeframe;
  minGapSize: number;
  maxGapAge: number;
  fillPercentage: number;
  signalMode?: "every_tick" | "candle_close";
}

export interface MarketStructureNodeData extends BaseNodeData {
  category: "priceaction";
  priceActionType: "market-structure";
  timeframe: Timeframe;
  swingStrength: number;
  detectBOS: boolean;
  detectChoCh: boolean;
  signalMode?: "every_tick" | "candle_close";
}

export type PriceActionNodeData =
  | CandlestickPatternNodeData
  | SupportResistanceNodeData
  | RangeBreakoutNodeData
  | OrderBlockNodeData
  | FairValueGapNodeData
  | MarketStructureNodeData;

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

// Embedded SL/TP fields (merged into PlaceBuy/PlaceSell nodes)
export interface EmbeddedStopLossFields {
  slMethod: StopLossMethod;
  slFixedPips: number;
  slPercent: number;
  slAtrMultiplier: number;
  slAtrPeriod: number;
  slAtrTimeframe?: Timeframe;
  slIndicatorNodeId?: string;
}

export interface EmbeddedTakeProfitFields {
  tpMethod: TakeProfitMethod;
  tpFixedPips: number;
  tpRiskRewardRatio: number;
  tpAtrMultiplier: number;
  tpAtrPeriod: number;
  tpMultipleTPEnabled?: boolean;
  tpLevels?: TPLevel[];
}

export interface PlaceBuyNodeData
  extends BaseNodeData, PositionSizingFields, EmbeddedStopLossFields, EmbeddedTakeProfitFields {
  category: "entry" | "trading";
  tradingType: "place-buy";
}

export interface PlaceSellNodeData
  extends BaseNodeData, PositionSizingFields, EmbeddedStopLossFields, EmbeddedTakeProfitFields {
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
  atrTimeframe?: Timeframe;
  indicatorNodeId?: string;
}

export type TakeProfitMethod = "FIXED_PIPS" | "RISK_REWARD" | "ATR_BASED";

export interface TPLevel {
  method: TakeProfitMethod;
  fixedPips: number;
  riskRewardRatio: number;
  atrMultiplier: number;
  atrPeriod: number;
  closePercent: number; // percentage of remaining position to close at this level
}

export interface TakeProfitNodeData extends BaseNodeData {
  category: "riskmanagement" | "trading";
  tradingType: "take-profit";
  method: TakeProfitMethod;
  fixedPips: number;
  riskRewardRatio: number;
  atrMultiplier: number;
  atrPeriod: number;
  // Multiple TP levels (optional — when undefined, uses single TP above)
  multipleTPEnabled?: boolean;
  tpLevels?: TPLevel[];
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

export interface GridPyramidNodeData extends BaseNodeData {
  category: "trading";
  tradingType: "grid-pyramid";
  gridMode: "GRID" | "PYRAMID";
  gridSpacing: number; // pips between levels, default 20
  maxGridLevels: number; // maximum grid levels, default 5
  lotMultiplier: number; // lot multiplier for martingale/anti-martingale, default 1.0
  direction: "BUY_ONLY" | "SELL_ONLY" | "BOTH";
}

export type TradingNodeData =
  | PlaceBuyNodeData
  | PlaceSellNodeData
  | StopLossNodeData
  | TakeProfitNodeData
  | CloseConditionNodeData
  | TimeExitNodeData
  | GridPyramidNodeData;

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
  checkIntervalPips: number; // Minimum profit in pips before lock activates
}

export type MoveSLAfterTP = "BREAKEVEN" | "TRAIL" | "NONE";

export interface MultiLevelTPNodeData extends BaseNodeData {
  category: "trademanagement";
  tradeManagementType: "multi-level-tp";
  tp1Pips: number;
  tp1Percent: number; // close % at TP1
  tp2Pips: number;
  tp2Percent: number; // close % at TP2
  tp3Pips: number;
  tp3Percent: number; // close remainder at TP3
  moveSLAfterTP1: MoveSLAfterTP;
}

export type TradeManagementNodeData =
  | BreakevenStopNodeData
  | TrailingStopNodeData
  | PartialCloseNodeData
  | LockProfitNodeData
  | MultiLevelTPNodeData;

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
  | "custom-times"
  | "moving-average"
  | "rsi"
  | "macd"
  | "bollinger-bands"
  | "atr"
  | "adx"
  | "stochastic"
  | "cci"
  | "ichimoku"
  | "custom-indicator"
  | "condition"
  | "candlestick-pattern"
  | "support-resistance"
  | "range-breakout"
  | "order-block"
  | "fair-value-gap"
  | "market-structure"
  | "place-buy"
  | "place-sell"
  | "close-condition"
  | "time-exit"
  | "breakeven-stop"
  | "trailing-stop"
  | "partial-close"
  | "lock-profit"
  | "max-spread"
  | "volatility-filter"
  | "friday-close"
  | "news-filter"
  | "obv"
  | "vwap"
  | "grid-pyramid"
  | "multi-level-tp"
  | "bb-squeeze"
  | "volume-filter"
  | "stop-loss"
  | "take-profit"
  | "always";

export type BuilderNode = Node<BuilderNodeData, BuilderNodeType>;
export type BuilderEdge = Edge;

// ============================================
// MULTI-PAIR SETTINGS
// ============================================

export interface PerSymbolOverride {
  symbol: string;
  enabled: boolean;
  lotSizeOverride?: number;
  riskPercentOverride?: number;
  // Indicator period overrides
  emaPeriodOverride?: number;
  rsiPeriodOverride?: number;
  spreadOverride?: number;
}

export interface MultiPairSettings {
  enabled: boolean;
  symbols: string[]; // e.g., ["EURUSD", "GBPUSD", "USDJPY"]
  perSymbolOverrides: PerSymbolOverride[];
  correlationFilter: boolean;
  correlationThreshold: number; // 0.0-1.0
  correlationPeriod: number; // lookback bars
  maxTotalPositions: number;
  maxPositionsPerPair: number;
}

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
  cooldownAfterLossMinutes?: number;
  minBarsBetweenTrades?: number;
  maxTotalDrawdownPercent?: number;
  equityTargetPercent?: number; // Stop trading when equity grows by this % from starting balance
  maxSlippage?: number; // Max slippage in points (default 10)
  multiPair?: MultiPairSettings; // Future: multi-pair strategy support
}

// Prop Firm Presets
export interface PropFirmPreset {
  name: string;
  dailyLossPercent: number;
  totalDrawdownPercent: number;
  maxOpenTrades: number;
  equityTargetPercent?: number;
}

export const PROP_FIRM_PRESETS: PropFirmPreset[] = [
  {
    name: "FTMO",
    dailyLossPercent: 5,
    totalDrawdownPercent: 10,
    maxOpenTrades: 3,
    equityTargetPercent: 10,
  },
  {
    name: "The 5%ers",
    dailyLossPercent: 4,
    totalDrawdownPercent: 6,
    maxOpenTrades: 3,
    equityTargetPercent: 10,
  },
  {
    name: "Funding Pips",
    dailyLossPercent: 5,
    totalDrawdownPercent: 8,
    maxOpenTrades: 5,
    equityTargetPercent: 10,
  },
];

export interface BuildJsonMetadata {
  createdAt: string;
  updatedAt: string;
}

export interface BuildJsonSchema {
  version: "1.0" | "1.1" | "1.2" | "1.3";
  nodes: BuilderNode[];
  edges: BuilderEdge[];
  viewport: Viewport;
  metadata: BuildJsonMetadata;
  settings: BuildJsonSettings;
}

// ============================================
// DEFAULT VALUES
// ============================================

/** Generate a random magic number between 100000 and 999999 */
export function generateMagicNumber(): number {
  return Math.floor(Math.random() * 900000) + 100000;
}

export const DEFAULT_MULTI_PAIR: MultiPairSettings = {
  enabled: false,
  symbols: ["EURUSD", "GBPUSD", "USDJPY"],
  perSymbolOverrides: [],
  correlationFilter: false,
  correlationThreshold: 0.7,
  correlationPeriod: 50,
  maxTotalPositions: 6,
  maxPositionsPerPair: 2,
};

export const DEFAULT_SETTINGS: BuildJsonSettings = {
  magicNumber: 123456,
  comment: "EA Builder Strategy",
  maxOpenTrades: 1,
  allowHedging: false,
  maxTradesPerDay: 0,
  maxDailyProfitPercent: 0,
  maxDailyLossPercent: 0,
  multiPair: DEFAULT_MULTI_PAIR,
};

export const DEFAULT_BUILD_JSON: BuildJsonSchema = {
  version: "1.2",
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
    description: "Only trade during selected market sessions (filter)",
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
    description: "Block new trades when spread exceeds your limit (filter)",
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
    description: "Block trades when volatility (ATR) is outside your range (filter)",
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
    type: "volume-filter",
    label: "Volume Filter",
    category: "timing",
    description: "Block trades when volume is below or above average (filter)",
    defaultData: {
      label: "Volume Filter",
      category: "timing",
      filterType: "volume-filter",
      timeframe: "H1",
      volumePeriod: 20,
      volumeMultiplier: 1.5,
      filterMode: "ABOVE_AVERAGE",
    } as VolumeFilterNodeData,
  },
  {
    type: "friday-close",
    label: "Friday Close",
    category: "timing",
    description: "Automatically close all positions on Friday at a set time",
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
    description: "Block trades before and after economic news events (filter)",
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
  // Indicators
  {
    type: "moving-average",
    label: "Moving Average",
    category: "indicator",
    description: "SMA, EMA, SMMA, or LWMA with configurable period and shift",
    defaultData: {
      label: "Moving Average",
      category: "indicator",
      indicatorType: "moving-average",
      timeframe: "H1",
      period: 50,
      method: "EMA",
      appliedPrice: "CLOSE",
      shift: 0,
    } as MovingAverageNodeData,
  },
  {
    type: "rsi",
    label: "RSI",
    category: "indicator",
    description: "Relative Strength Index with overbought/oversold levels",
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
    description: "Moving Average Convergence Divergence histogram and signal",
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
    description: "Upper and lower bands based on standard deviation",
    defaultData: {
      label: "Bollinger Bands",
      category: "indicator",
      indicatorType: "bollinger-bands",
      timeframe: "H1",
      period: 20,
      deviation: 2.0,
      appliedPrice: "CLOSE",
      shift: 0,
    } as BollingerBandsNodeData,
  },
  {
    type: "atr",
    label: "ATR",
    category: "indicator",
    description: "Average True Range — measure of market volatility",
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
    description: "Average Directional Index — trend strength measurement",
    defaultData: {
      label: "ADX",
      category: "indicator",
      indicatorType: "adx",
      timeframe: "H1",
      period: 14,
      trendLevel: 25,
    } as ADXNodeData,
  },
  {
    type: "stochastic",
    label: "Stochastic",
    category: "indicator",
    description: "Stochastic Oscillator with %K and %D lines",
    defaultData: {
      label: "Stochastic",
      category: "indicator",
      indicatorType: "stochastic",
      timeframe: "H1",
      kPeriod: 14,
      dPeriod: 3,
      slowing: 3,
      maMethod: "SMA",
      priceField: "LOWHIGH",
      overboughtLevel: 80,
      oversoldLevel: 20,
    } as StochasticNodeData,
  },
  {
    type: "cci",
    label: "CCI",
    category: "indicator",
    description: "Commodity Channel Index — cyclical trend detection",
    defaultData: {
      label: "CCI",
      category: "indicator",
      indicatorType: "cci",
      timeframe: "H1",
      period: 14,
      appliedPrice: "TYPICAL",
      overboughtLevel: 100,
      oversoldLevel: -100,
    } as CCINodeData,
  },
  {
    type: "ichimoku",
    label: "Ichimoku Cloud",
    category: "indicator",
    description: "All-in-one trend, momentum, and support/resistance indicator",
    defaultData: {
      label: "Ichimoku Cloud",
      category: "indicator",
      indicatorType: "ichimoku",
      timeframe: "H1",
      tenkanPeriod: 9,
      kijunPeriod: 26,
      senkouBPeriod: 52,
      ichimokuMode: "TENKAN_KIJUN_CROSS",
    } as IchimokuNodeData,
  },
  {
    type: "obv",
    label: "OBV (On-Balance Volume)",
    category: "indicator",
    description: "Volume-based trend confirmation using OBV with SMA signal line",
    defaultData: {
      label: "OBV",
      category: "indicator",
      indicatorType: "obv",
      timeframe: "H1",
      signalPeriod: 20,
    } as OBVNodeData,
  },
  {
    type: "vwap",
    label: "VWAP",
    category: "indicator",
    description:
      "Volume Weighted Average Price (uses tick volume — not true exchange volume on forex)",
    defaultData: {
      label: "VWAP",
      category: "indicator",
      indicatorType: "vwap",
      timeframe: "H1",
      resetPeriod: "daily",
    } as VWAPNodeData,
  },
  {
    type: "bb-squeeze",
    label: "BB Squeeze",
    category: "indicator",
    description:
      "Detect Bollinger Bands squeeze inside Keltner Channel — breakout signal on expansion",
    defaultData: {
      label: "BB Squeeze",
      category: "indicator",
      indicatorType: "bb-squeeze",
      timeframe: "H1",
      bbPeriod: 20,
      bbDeviation: 2.0,
      kcPeriod: 20,
      kcMultiplier: 1.5,
    } as BBSqueezeNodeData,
  },
  {
    type: "custom-indicator",
    label: "Custom Indicator",
    category: "indicator",
    description: "Use any custom indicator via iCustom() call",
    defaultData: {
      label: "Custom Indicator",
      category: "indicator",
      indicatorType: "custom-indicator",
      timeframe: "H1",
      indicatorName: "",
      params: [],
      bufferIndex: 0,
    } as CustomIndicatorNodeData,
  },
  {
    type: "condition",
    label: "Condition (IF/THEN)",
    category: "indicator",
    description: "Compare indicator value against a threshold with True/False outputs",
    defaultData: {
      label: "Condition",
      category: "indicator",
      indicatorType: "condition",
      conditionType: "GREATER_THAN",
      threshold: 0,
    } as ConditionNodeData,
  },
  // Price Action
  {
    type: "candlestick-pattern",
    label: "Candlestick Pattern",
    category: "priceaction",
    description: "Detect engulfing, doji, hammer, and other candlestick patterns",
    defaultData: {
      label: "Candlestick Pattern",
      category: "priceaction",
      priceActionType: "candlestick-pattern",
      timeframe: "H1",
      patterns: ["ENGULFING_BULLISH", "ENGULFING_BEARISH"],
      minBodySize: 5,
    } as CandlestickPatternNodeData,
  },
  {
    type: "support-resistance",
    label: "Support & Resistance",
    category: "priceaction",
    description: "Identify key support and resistance levels from price history",
    defaultData: {
      label: "Support & Resistance",
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
    description: "Detect breakout of a defined price range (session, candles, or time window)",
    defaultData: {
      label: "Range Breakout",
      category: "priceaction",
      priceActionType: "range-breakout",
      timeframe: "H1",
      rangeType: "SESSION",
      lookbackCandles: 20,
      rangeSession: "ASIAN",
      sessionStartHour: 0,
      sessionStartMinute: 0,
      sessionEndHour: 8,
      sessionEndMinute: 0,
      breakoutDirection: "BOTH",
      entryMode: "IMMEDIATE",
      bufferPips: 2,
      minRangePips: 10,
      maxRangePips: 0,
      useServerTime: true,
    } as RangeBreakoutNodeData,
  },
  // Price Action (ICT/SMC)
  {
    type: "order-block",
    label: "Order Block",
    category: "priceaction",
    description: "Detect bullish/bearish order blocks (ICT)",
    defaultData: {
      label: "Order Block",
      category: "priceaction",
      priceActionType: "order-block",
      timeframe: "H1",
      lookbackPeriod: 50,
      minBlockSize: 10,
      maxBlockAge: 100,
    } as OrderBlockNodeData,
  },
  {
    type: "fair-value-gap",
    label: "Fair Value Gap",
    category: "priceaction",
    description: "Detect FVG imbalances in price action (ICT)",
    defaultData: {
      label: "Fair Value Gap",
      category: "priceaction",
      priceActionType: "fair-value-gap",
      timeframe: "H1",
      minGapSize: 5,
      maxGapAge: 50,
      fillPercentage: 50,
    } as FairValueGapNodeData,
  },
  {
    type: "market-structure",
    label: "Market Structure",
    category: "priceaction",
    description: "Track HH/HL/LL/LH and structure breaks (SMC)",
    defaultData: {
      label: "Market Structure",
      category: "priceaction",
      priceActionType: "market-structure",
      timeframe: "H1",
      swingStrength: 5,
      detectBOS: true,
      detectChoCh: true,
    } as MarketStructureNodeData,
  },
  // Trading (manual building blocks)
  {
    type: "place-buy",
    label: "Place Buy",
    category: "trading",
    description: "Open a buy position with configurable lot sizing",
    defaultData: {
      label: "Place Buy",
      category: "trading",
      tradingType: "place-buy",
      method: "FIXED_LOT",
      fixedLot: 0.01,
      riskPercent: 1,
      minLot: 0.01,
      maxLot: 10,
      orderType: "MARKET",
      pendingOffset: 0,
      slMethod: "FIXED_PIPS",
      slFixedPips: 50,
      slPercent: 1,
      slAtrMultiplier: 1.5,
      slAtrPeriod: 14,
      tpMethod: "FIXED_PIPS",
      tpFixedPips: 100,
      tpRiskRewardRatio: 2,
      tpAtrMultiplier: 2,
      tpAtrPeriod: 14,
    } as PlaceBuyNodeData,
  },
  {
    type: "place-sell",
    label: "Place Sell",
    category: "trading",
    description: "Open a sell position with configurable lot sizing",
    defaultData: {
      label: "Place Sell",
      category: "trading",
      tradingType: "place-sell",
      method: "FIXED_LOT",
      fixedLot: 0.01,
      riskPercent: 1,
      minLot: 0.01,
      maxLot: 10,
      orderType: "MARKET",
      pendingOffset: 0,
      slMethod: "FIXED_PIPS",
      slFixedPips: 50,
      slPercent: 1,
      slAtrMultiplier: 1.5,
      slAtrPeriod: 14,
      tpMethod: "FIXED_PIPS",
      tpFixedPips: 100,
      tpRiskRewardRatio: 2,
      tpAtrMultiplier: 2,
      tpAtrPeriod: 14,
    } as PlaceSellNodeData,
  },
  {
    type: "close-condition",
    label: "Close Condition",
    category: "trading",
    description: "Close positions on opposite signal or custom condition",
    defaultData: {
      label: "Close Condition",
      category: "trading",
      tradingType: "close-condition",
      closeDirection: "BOTH",
    } as CloseConditionNodeData,
  },
  {
    type: "time-exit",
    label: "Time Exit",
    category: "trading",
    description: "Close positions after a set number of bars",
    defaultData: {
      label: "Time Exit",
      category: "trading",
      tradingType: "time-exit",
      exitAfterBars: 10,
      exitTimeframe: "H1",
    } as TimeExitNodeData,
  },
  // Trade Management
  {
    type: "breakeven-stop",
    label: "Stop Loss to Breakeven",
    category: "trademanagement",
    description: "Move SL to breakeven at profit target",
    defaultData: {
      label: "Stop Loss to Breakeven",
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
  {
    type: "multi-level-tp",
    label: "Multi-Level TP",
    category: "trademanagement",
    description: "Three staged take profit levels with automatic SL management",
    defaultData: {
      label: "Multi-Level TP",
      category: "trademanagement",
      tradeManagementType: "multi-level-tp",
      tp1Pips: 20,
      tp1Percent: 30,
      tp2Pips: 40,
      tp2Percent: 30,
      tp3Pips: 60,
      tp3Percent: 40,
      moveSLAfterTP1: "BREAKEVEN",
    } as MultiLevelTPNodeData,
  },
  {
    type: "grid-pyramid",
    label: "Grid / Pyramid Entry",
    category: "trading",
    description: "Place orders at regular intervals (grid) or add to winning positions (pyramid)",
    defaultData: {
      label: "Grid / Pyramid",
      category: "trading",
      tradingType: "grid-pyramid",
      gridMode: "GRID",
      gridSpacing: 20,
      maxGridLevels: 5,
      lotMultiplier: 1.0,
      direction: "BOTH",
    } as GridPyramidNodeData,
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
