import type {
  TradingSession,
  CandlestickPattern,
  RangeType,
  RangeSession,
  BreakoutDirection,
  EntryMode,
  Timeframe,
  EntrySlMethod,
  EntryDirection,
} from "@/types/builder";

export const SIGNAL_MODE_OPTIONS = [
  { value: "every_tick", label: "Every tick (current price)" },
  { value: "candle_close", label: "Wait for candle close" },
] as const;

export const TIMEFRAME_OPTIONS: { value: Timeframe; label: string }[] = [
  { value: "M1", label: "1 Minute" },
  { value: "M5", label: "5 Minutes" },
  { value: "M15", label: "15 Minutes" },
  { value: "M30", label: "30 Minutes" },
  { value: "H1", label: "1 Hour" },
  { value: "H4", label: "4 Hours" },
  { value: "D1", label: "1 Day" },
  { value: "W1", label: "1 Week" },
  { value: "MN1", label: "1 Month" },
];

export const TRADING_SESSION_OPTIONS: { value: TradingSession; label: string }[] = [
  { value: "LONDON", label: "London Session (08:00-17:00 GMT)" },
  { value: "NEW_YORK", label: "New York Session (13:00-22:00 GMT)" },
  { value: "TOKYO", label: "Tokyo Session (00:00-09:00 GMT)" },
  { value: "SYDNEY", label: "Sydney Session (22:00-07:00 GMT)" },
  { value: "LONDON_NY_OVERLAP", label: "London/NY Overlap (13:00-17:00 GMT)" },
  { value: "CUSTOM", label: "Custom Session" },
];

export const DAY_LABELS: {
  key: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
  label: string;
}[] = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

export const CANDLESTICK_PATTERN_OPTIONS: { value: CandlestickPattern; label: string }[] = [
  { value: "ENGULFING_BULLISH", label: "Bullish Engulfing" },
  { value: "ENGULFING_BEARISH", label: "Bearish Engulfing" },
  { value: "DOJI", label: "Doji" },
  { value: "HAMMER", label: "Hammer" },
  { value: "SHOOTING_STAR", label: "Shooting Star" },
  { value: "MORNING_STAR", label: "Morning Star" },
  { value: "EVENING_STAR", label: "Evening Star" },
  { value: "THREE_WHITE_SOLDIERS", label: "Three White Soldiers" },
  { value: "THREE_BLACK_CROWS", label: "Three Black Crows" },
];

export const RANGE_TYPE_OPTIONS: { value: RangeType; label: string }[] = [
  { value: "PREVIOUS_CANDLES", label: "Previous Candles" },
  { value: "SESSION", label: "Trading Session" },
  { value: "TIME_WINDOW", label: "Custom Time Window" },
];

export const RANGE_SESSION_OPTIONS: { value: RangeSession; label: string }[] = [
  { value: "ASIAN", label: "Asian Session (00:00-08:00)" },
  { value: "LONDON", label: "London Session (08:00-16:00)" },
  { value: "NEW_YORK", label: "New York Session (13:00-21:00)" },
  { value: "CUSTOM", label: "Custom Hours" },
];

export const BREAKOUT_DIRECTION_OPTIONS: { value: BreakoutDirection; label: string }[] = [
  { value: "BOTH", label: "Both (Buy High, Sell Low)" },
  { value: "BUY_ON_HIGH", label: "Buy Only (Break High)" },
  { value: "SELL_ON_LOW", label: "Sell Only (Break Low)" },
];

export const ENTRY_MODE_OPTIONS: { value: EntryMode; label: string }[] = [
  { value: "ON_CLOSE", label: "On Candle Close" },
  { value: "IMMEDIATE", label: "Immediate (on touch)" },
  { value: "AFTER_RETEST", label: "After Retest" },
];

export const BASE_SL_OPTIONS: { value: EntrySlMethod; label: string }[] = [
  { value: "ATR", label: "ATR Based" },
  { value: "PIPS", label: "Fixed Pips" },
  { value: "PERCENT", label: "Percentage (%)" },
];

export const RANGE_SL_OPTIONS: { value: EntrySlMethod; label: string }[] = [
  { value: "ATR", label: "ATR Based" },
  { value: "PIPS", label: "Fixed Pips" },
  { value: "PERCENT", label: "Percentage (%)" },
  { value: "RANGE_OPPOSITE", label: "Range Opposite" },
];

export const TRADING_SESSION_OPTIONS_SHORT: { value: TradingSession; label: string }[] = [
  { value: "LONDON", label: "London" },
  { value: "NEW_YORK", label: "New York" },
  { value: "TOKYO", label: "Tokyo" },
  { value: "LONDON_NY_OVERLAP", label: "London/NY Overlap" },
  { value: "CUSTOM", label: "Custom" },
];

export const DIRECTION_OPTIONS: { value: EntryDirection; label: string }[] = [
  { value: "BOTH", label: "Buy & Sell" },
  { value: "BUY", label: "Buy Only" },
  { value: "SELL", label: "Sell Only" },
];

export const APPLIED_PRICE_OPTIONS: { value: string; label: string }[] = [
  { value: "CLOSE", label: "Close" },
  { value: "OPEN", label: "Open" },
  { value: "HIGH", label: "High" },
  { value: "LOW", label: "Low" },
  { value: "MEDIAN", label: "Median (HL/2)" },
  { value: "TYPICAL", label: "Typical (HLC/3)" },
  { value: "WEIGHTED", label: "Weighted (HLCC/4)" },
];

export const MA_METHOD_OPTIONS: { value: string; label: string }[] = [
  { value: "SMA", label: "Simple (SMA)" },
  { value: "EMA", label: "Exponential (EMA)" },
];

export const STO_PRICE_FIELD_OPTIONS: { value: string; label: string }[] = [
  { value: "LOWHIGH", label: "Low/High" },
  { value: "CLOSECLOSE", label: "Close/Close" },
];

export const RANGE_METHOD_OPTIONS: { value: "CANDLES" | "CUSTOM_TIME"; label: string }[] = [
  { value: "CUSTOM_TIME", label: "Custom Time" },
  { value: "CANDLES", label: "Candles" },
];

export const BREAKOUT_ENTRY_OPTIONS: { value: "CANDLE_CLOSE" | "CURRENT_PRICE"; label: string }[] =
  [
    { value: "CANDLE_CLOSE", label: "Candle Close" },
    { value: "CURRENT_PRICE", label: "Current Price" },
  ];
