import type { BuildJsonSchema } from "@/types/builder";
import type { PlanTier } from "./plans";

export interface StrategyPreset {
  id: string;
  name: string;
  description: string;
  tier: PlanTier;
  buildJson: BuildJsonSchema;
}

// ============================================
// PRESET TRADING DEFAULTS
// ============================================

/** Base magic number — each preset adds its own offset (1, 2, …). */
export const PRESET_MAGIC_BASE = 300_000;

/** Default fixed lot size for preset strategies. */
export const DEFAULT_FIXED_LOT = 0.1;

/** Risk per trade as percentage of account balance. */
export const DEFAULT_RISK_PERCENT = 1;

/** Minimum lot size (MT5 micro lot). */
export const DEFAULT_MIN_LOT = 0.01;

/** Maximum lot size cap. */
export const DEFAULT_MAX_LOT = 10;

/** Pending order offset in pips. */
export const DEFAULT_PENDING_OFFSET_PIPS = 10;

/** Fixed stop-loss distance in pips (fallback when ATR unavailable). */
export const DEFAULT_SL_FIXED_PIPS = 50;

/** Stop-loss as percentage of balance (for PERCENT SL method). */
export const DEFAULT_SL_PERCENT = 1;

/** ATR multiplier for stop-loss placement. */
export const DEFAULT_SL_ATR_MULTIPLIER = 1.5;

/** ATR lookback period for SL/TP calculation. */
export const DEFAULT_ATR_PERIOD = 14;

/** Fixed take-profit distance in pips (fallback when ATR unavailable). */
export const DEFAULT_TP_FIXED_PIPS = 100;

/** Reward-to-risk ratio for take-profit. */
export const DEFAULT_TP_RISK_REWARD = 2;

/** ATR multiplier for take-profit placement. */
export const DEFAULT_TP_ATR_MULTIPLIER = 3;

/** Maximum simultaneous open trades per preset. */
export const DEFAULT_MAX_OPEN_TRADES = 1;

const now = new Date().toISOString();
const meta = { createdAt: now, updatedAt: now };

// Shared timing node for standalone presets
function timingNode(y = 0) {
  return {
    id: "timing1",
    type: "trading-session",
    position: { x: 300, y },
    data: {
      label: "Trading Sessions",
      category: "timing" as const,
      timingType: "trading-session" as const,
      session: "LONDON" as const,
      tradingDays: {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: false,
        sunday: false,
      },
    },
  };
}

// Shared buy/sell nodes for standalone presets (SL/TP embedded)
function tradingNodes() {
  return [
    {
      id: "buy1",
      type: "place-buy",
      position: { x: 100, y: 360 },
      data: {
        label: "Place Buy",
        category: "trading" as const,
        tradingType: "place-buy" as const,
        method: "RISK_PERCENT" as const,
        fixedLot: DEFAULT_FIXED_LOT,
        riskPercent: DEFAULT_RISK_PERCENT,
        minLot: DEFAULT_MIN_LOT,
        maxLot: DEFAULT_MAX_LOT,
        orderType: "MARKET" as const,
        pendingOffset: DEFAULT_PENDING_OFFSET_PIPS,
        slMethod: "ATR_BASED" as const,
        slFixedPips: DEFAULT_SL_FIXED_PIPS,
        slPercent: DEFAULT_SL_PERCENT,
        slAtrMultiplier: DEFAULT_SL_ATR_MULTIPLIER,
        slAtrPeriod: DEFAULT_ATR_PERIOD,
        tpMethod: "RISK_REWARD" as const,
        tpFixedPips: DEFAULT_TP_FIXED_PIPS,
        tpRiskRewardRatio: DEFAULT_TP_RISK_REWARD,
        tpAtrMultiplier: DEFAULT_TP_ATR_MULTIPLIER,
        tpAtrPeriod: DEFAULT_ATR_PERIOD,
      },
    },
    {
      id: "sell1",
      type: "place-sell",
      position: { x: 500, y: 360 },
      data: {
        label: "Place Sell",
        category: "trading" as const,
        tradingType: "place-sell" as const,
        method: "RISK_PERCENT" as const,
        fixedLot: DEFAULT_FIXED_LOT,
        riskPercent: DEFAULT_RISK_PERCENT,
        minLot: DEFAULT_MIN_LOT,
        maxLot: DEFAULT_MAX_LOT,
        orderType: "MARKET" as const,
        pendingOffset: DEFAULT_PENDING_OFFSET_PIPS,
        slMethod: "ATR_BASED" as const,
        slFixedPips: DEFAULT_SL_FIXED_PIPS,
        slPercent: DEFAULT_SL_PERCENT,
        slAtrMultiplier: DEFAULT_SL_ATR_MULTIPLIER,
        slAtrPeriod: DEFAULT_ATR_PERIOD,
        tpMethod: "RISK_REWARD" as const,
        tpFixedPips: DEFAULT_TP_FIXED_PIPS,
        tpRiskRewardRatio: DEFAULT_TP_RISK_REWARD,
        tpAtrMultiplier: DEFAULT_TP_ATR_MULTIPLIER,
        tpAtrPeriod: DEFAULT_ATR_PERIOD,
      },
    },
  ];
}

// Shared edges for standalone presets: timing→ind, ind→buy, ind→sell
function standaloneEdges() {
  return [
    { id: "e1", source: "timing1", target: "ind1" },
    { id: "e2", source: "ind1", target: "buy1" },
    { id: "e3", source: "ind1", target: "sell1" },
  ];
}

export const STRATEGY_PRESETS: StrategyPreset[] = [
  // ---- Standalone-node presets ----
  {
    id: "range-breakout",
    name: "Range Breakout",
    description:
      "Session range breakout with stop loss and take profit. Uses London session timing, ATR-based stop, 2:1 reward-to-risk.",
    tier: "FREE",
    buildJson: {
      version: "1.3",
      nodes: [
        timingNode(),
        {
          id: "ind1",
          type: "range-breakout",
          position: { x: 300, y: 180 },
          data: {
            label: "Range Breakout",
            category: "priceaction" as const,
            priceActionType: "range-breakout" as const,
            timeframe: "H1" as const,
            rangeType: "SESSION" as const,
            lookbackCandles: 20,
            rangeSession: "ASIAN" as const,
            sessionStartHour: 0,
            sessionStartMinute: 0,
            sessionEndHour: 8,
            sessionEndMinute: 0,
            breakoutDirection: "BOTH" as const,
            entryMode: "ON_CLOSE" as const,
            bufferPips: 2,
            minRangePips: 0,
            maxRangePips: 0,
          },
        },
        ...tradingNodes(),
      ],
      edges: standaloneEdges(),
      viewport: { x: 0, y: 0, zoom: 0.8 },
      metadata: meta,
      settings: {
        magicNumber: PRESET_MAGIC_BASE + 1,
        comment: "Range Breakout",
        maxOpenTrades: DEFAULT_MAX_OPEN_TRADES,
        allowHedging: false,
      },
    } as BuildJsonSchema,
  },
  {
    id: "ema-crossover",
    name: "EMA Crossover",
    description:
      "Classic trend following. EMA(50)/EMA(200) crossover with 1% risk, ATR×1.5 stop, 2R take profit.",
    tier: "FREE",
    buildJson: {
      version: "1.3",
      nodes: [
        timingNode(),
        {
          id: "ind1",
          type: "moving-average",
          position: { x: 200, y: 180 },
          data: {
            label: "Fast EMA(50)",
            category: "indicator" as const,
            indicatorType: "moving-average" as const,
            timeframe: "H1" as const,
            period: 50,
            method: "EMA" as const,
            appliedPrice: "CLOSE" as const,
            signalMode: "candle_close" as const,
            shift: 0,
          },
        },
        {
          id: "ind2",
          type: "moving-average",
          position: { x: 400, y: 180 },
          data: {
            label: "Slow EMA(200)",
            category: "indicator" as const,
            indicatorType: "moving-average" as const,
            timeframe: "H1" as const,
            period: 200,
            method: "EMA" as const,
            appliedPrice: "CLOSE" as const,
            signalMode: "candle_close" as const,
            shift: 0,
          },
        },
        ...tradingNodes(),
      ],
      edges: [
        { id: "e1", source: "timing1", target: "ind1" },
        { id: "e1b", source: "timing1", target: "ind2" },
        { id: "e2", source: "ind1", target: "buy1" },
        { id: "e3", source: "ind1", target: "sell1" },
        { id: "e4", source: "ind2", target: "buy1" },
        { id: "e5", source: "ind2", target: "sell1" },
      ],
      viewport: { x: 0, y: 0, zoom: 0.8 },
      metadata: meta,
      settings: {
        magicNumber: PRESET_MAGIC_BASE + 2,
        comment: "EMA Crossover",
        maxOpenTrades: DEFAULT_MAX_OPEN_TRADES,
        allowHedging: false,
      },
    } as BuildJsonSchema,
  },
  {
    id: "trend-pullback",
    name: "Trend Pullback",
    description:
      "EMA(200) trend + RSI pullback entry. Enters on RSI dip below 40 in uptrend (above 60 in downtrend). 1% risk, ATR×1.5 stop.",
    tier: "FREE",
    buildJson: {
      version: "1.3",
      nodes: [
        timingNode(),
        {
          id: "ind1",
          type: "moving-average",
          position: { x: 200, y: 180 },
          data: {
            label: "Trend EMA(200)",
            category: "indicator" as const,
            indicatorType: "moving-average" as const,
            timeframe: "H1" as const,
            period: 200,
            method: "EMA" as const,
            appliedPrice: "CLOSE" as const,
            signalMode: "candle_close" as const,
            shift: 0,
          },
        },
        {
          id: "ind2",
          type: "rsi",
          position: { x: 400, y: 180 },
          data: {
            label: "Pullback RSI(14)",
            category: "indicator" as const,
            indicatorType: "rsi" as const,
            timeframe: "H1" as const,
            period: 14,
            appliedPrice: "CLOSE" as const,
            signalMode: "candle_close" as const,
            overboughtLevel: 60,
            oversoldLevel: 40,
          },
        },
        ...tradingNodes(),
      ],
      edges: [
        { id: "e1", source: "timing1", target: "ind1" },
        { id: "e1b", source: "timing1", target: "ind2" },
        { id: "e2", source: "ind1", target: "buy1" },
        { id: "e3", source: "ind1", target: "sell1" },
        { id: "e4", source: "ind2", target: "buy1" },
        { id: "e5", source: "ind2", target: "sell1" },
      ],
      viewport: { x: 0, y: 0, zoom: 0.8 },
      metadata: meta,
      settings: {
        magicNumber: PRESET_MAGIC_BASE + 3,
        comment: "Trend Pullback",
        maxOpenTrades: DEFAULT_MAX_OPEN_TRADES,
        allowHedging: false,
      },
    } as BuildJsonSchema,
  },
  {
    id: "rsi-reversal",
    name: "RSI Reversal",
    description:
      "Mean reversion at RSI extremes. Buys when RSI crosses up from 30, sells when RSI crosses down from 70. 1% risk, ATR stop, 2:1 R:R.",
    tier: "FREE",
    buildJson: {
      version: "1.3",
      nodes: [
        timingNode(),
        {
          id: "ind1",
          type: "rsi",
          position: { x: 300, y: 180 },
          data: {
            label: "RSI(14)",
            category: "indicator" as const,
            indicatorType: "rsi" as const,
            timeframe: "H1" as const,
            period: 14,
            appliedPrice: "CLOSE" as const,
            signalMode: "candle_close" as const,
            overboughtLevel: 70,
            oversoldLevel: 30,
          },
        },
        ...tradingNodes(),
      ],
      edges: standaloneEdges(),
      viewport: { x: 0, y: 0, zoom: 0.8 },
      metadata: meta,
      settings: {
        magicNumber: PRESET_MAGIC_BASE + 4,
        comment: "RSI Reversal",
        maxOpenTrades: DEFAULT_MAX_OPEN_TRADES,
        allowHedging: false,
      },
    } as BuildJsonSchema,
  },
  {
    id: "macd-crossover",
    name: "MACD Crossover",
    description:
      "MACD(12,26,9) signal line crossover. Momentum / trend shift strategy. 1% risk, ATR stop, 2:1 R:R.",
    tier: "FREE",
    buildJson: {
      version: "1.3",
      nodes: [
        timingNode(),
        {
          id: "ind1",
          type: "macd",
          position: { x: 300, y: 180 },
          data: {
            label: "MACD(12,26,9)",
            category: "indicator" as const,
            indicatorType: "macd" as const,
            timeframe: "H1" as const,
            fastPeriod: 12,
            slowPeriod: 26,
            signalPeriod: 9,
            appliedPrice: "CLOSE" as const,
            signalMode: "candle_close" as const,
          },
        },
        ...tradingNodes(),
      ],
      edges: standaloneEdges(),
      viewport: { x: 0, y: 0, zoom: 0.8 },
      metadata: meta,
      settings: {
        magicNumber: PRESET_MAGIC_BASE + 6,
        comment: "MACD Crossover",
        maxOpenTrades: DEFAULT_MAX_OPEN_TRADES,
        allowHedging: false,
      },
    } as BuildJsonSchema,
  },
  {
    id: "divergence",
    name: "RSI/MACD Divergence",
    description:
      "Reversal on price/indicator divergence. RSI(14) with 20-bar lookback for swing detection. 1% risk, ATR×1.5 stop, 2R take profit.",
    tier: "FREE",
    buildJson: {
      version: "1.3",
      nodes: [
        timingNode(),
        {
          id: "ind1",
          type: "rsi",
          position: { x: 300, y: 180 },
          data: {
            label: "RSI(14)",
            category: "indicator" as const,
            indicatorType: "rsi" as const,
            timeframe: "H1" as const,
            period: 14,
            appliedPrice: "CLOSE" as const,
            signalMode: "candle_close" as const,
            overboughtLevel: 70,
            oversoldLevel: 30,
          },
        },
        ...tradingNodes(),
      ],
      edges: standaloneEdges(),
      viewport: { x: 0, y: 0, zoom: 0.8 },
      metadata: meta,
      settings: {
        magicNumber: PRESET_MAGIC_BASE + 7,
        comment: "RSI/MACD Divergence",
        maxOpenTrades: DEFAULT_MAX_OPEN_TRADES,
        allowHedging: false,
      },
    } as BuildJsonSchema,
  },
  {
    id: "bollinger-band",
    name: "Bollinger Bands",
    description:
      "Band touch reversal strategy. Buys at lower band, sells at upper band. BB(20,2) on H1. 1% risk, ATR stop, 2:1 R:R.",
    tier: "FREE",
    buildJson: {
      version: "1.3",
      nodes: [
        timingNode(),
        {
          id: "ind1",
          type: "bollinger-bands",
          position: { x: 300, y: 180 },
          data: {
            label: "Bollinger Bands(20)",
            category: "indicator" as const,
            indicatorType: "bollinger-bands" as const,
            timeframe: "H1" as const,
            period: 20,
            deviation: 2.0,
            appliedPrice: "CLOSE" as const,
            signalMode: "candle_close" as const,
            shift: 0,
          },
        },
        ...tradingNodes(),
      ],
      edges: standaloneEdges(),
      viewport: { x: 0, y: 0, zoom: 0.8 },
      metadata: meta,
      settings: {
        magicNumber: PRESET_MAGIC_BASE + 8,
        comment: "Bollinger Bands",
        maxOpenTrades: DEFAULT_MAX_OPEN_TRADES,
        allowHedging: false,
      },
    } as BuildJsonSchema,
  },
  {
    id: "adx-trend",
    name: "ADX Trend Strength",
    description:
      "Trend strength entry using ADX(14) DI+/DI- crossover when ADX > 25. 1% risk, ATR stop, 2:1 R:R.",
    tier: "FREE",
    buildJson: {
      version: "1.3",
      nodes: [
        timingNode(),
        {
          id: "ind1",
          type: "adx",
          position: { x: 300, y: 180 },
          data: {
            label: "ADX(14)",
            category: "indicator" as const,
            indicatorType: "adx" as const,
            timeframe: "H1" as const,
            period: 14,
            trendLevel: 25,
            signalMode: "candle_close" as const,
          },
        },
        ...tradingNodes(),
      ],
      edges: standaloneEdges(),
      viewport: { x: 0, y: 0, zoom: 0.8 },
      metadata: meta,
      settings: {
        magicNumber: PRESET_MAGIC_BASE + 9,
        comment: "ADX Trend Strength",
        maxOpenTrades: DEFAULT_MAX_OPEN_TRADES,
        allowHedging: false,
      },
    } as BuildJsonSchema,
  },
  {
    id: "stochastic-reversal",
    name: "Stochastic Reversal",
    description:
      "Stochastic oscillator reversal at oversold/overbought zones. K(14)/D(3) with 80/20 levels. 1% risk, ATR stop, 2:1 R:R.",
    tier: "FREE",
    buildJson: {
      version: "1.3",
      nodes: [
        timingNode(),
        {
          id: "ind1",
          type: "stochastic",
          position: { x: 300, y: 180 },
          data: {
            label: "Stochastic(14,3,3)",
            category: "indicator" as const,
            indicatorType: "stochastic" as const,
            timeframe: "H1" as const,
            kPeriod: 14,
            dPeriod: 3,
            slowing: 3,
            overboughtLevel: 80,
            oversoldLevel: 20,
            maMethod: "SMA" as const,
            priceField: "LOWHIGH" as const,
            signalMode: "candle_close" as const,
          },
        },
        ...tradingNodes(),
      ],
      edges: standaloneEdges(),
      viewport: { x: 0, y: 0, zoom: 0.8 },
      metadata: meta,
      settings: {
        magicNumber: PRESET_MAGIC_BASE + 10,
        comment: "Stochastic Reversal",
        maxOpenTrades: DEFAULT_MAX_OPEN_TRADES,
        allowHedging: false,
      },
    } as BuildJsonSchema,
  },
  {
    id: "ichimoku-cloud",
    name: "Ichimoku Cloud",
    description:
      "Ichimoku Tenkan(9)/Kijun(26) crossover + cloud filter. 1% risk, ATR stop, 2:1 R:R.",
    tier: "FREE",
    buildJson: {
      version: "1.3",
      nodes: [
        timingNode(),
        {
          id: "ind1",
          type: "ichimoku",
          position: { x: 300, y: 180 },
          data: {
            label: "Ichimoku(9,26,52)",
            category: "indicator" as const,
            indicatorType: "ichimoku" as const,
            timeframe: "H1" as const,
            tenkanPeriod: 9,
            kijunPeriod: 26,
            senkouSpanBPeriod: 52,
            signalMode: "candle_close" as const,
          },
        },
        ...tradingNodes(),
      ],
      edges: standaloneEdges(),
      viewport: { x: 0, y: 0, zoom: 0.8 },
      metadata: meta,
      settings: {
        magicNumber: PRESET_MAGIC_BASE + 11,
        comment: "Ichimoku Cloud",
        maxOpenTrades: DEFAULT_MAX_OPEN_TRADES,
        allowHedging: false,
      },
    } as BuildJsonSchema,
  },
];
