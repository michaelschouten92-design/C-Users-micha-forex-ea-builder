import type { BuildJsonSchema } from "@/types/builder";
import type { PlanTier } from "./plans";

export interface StrategyPreset {
  id: string;
  name: string;
  description: string;
  tier: PlanTier;
  buildJson: BuildJsonSchema;
}

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

// Shared buy/sell/sl/tp nodes for standalone presets
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
        fixedLot: 0.1,
        riskPercent: 1,
        minLot: 0.01,
        maxLot: 10,
        orderType: "MARKET" as const,
        pendingOffset: 10,
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
        fixedLot: 0.1,
        riskPercent: 1,
        minLot: 0.01,
        maxLot: 10,
        orderType: "MARKET" as const,
        pendingOffset: 10,
      },
    },
    {
      id: "sl1",
      type: "stop-loss",
      position: { x: 300, y: 540 },
      data: {
        label: "Stop Loss",
        category: "riskmanagement" as const,
        tradingType: "stop-loss" as const,
        method: "ATR_BASED" as const,
        fixedPips: 50,
        atrMultiplier: 1.5,
        atrPeriod: 14,
      },
    },
    {
      id: "tp1",
      type: "take-profit",
      position: { x: 300, y: 720 },
      data: {
        label: "Take Profit",
        category: "riskmanagement" as const,
        tradingType: "take-profit" as const,
        method: "RISK_REWARD" as const,
        fixedPips: 100,
        riskRewardRatio: 2,
        atrMultiplier: 3,
        atrPeriod: 14,
      },
    },
  ];
}

// Shared edges for standalone presets: timing→ind, ind→buy, ind→sell, buy→sl, sell→sl, sl→tp
function standaloneEdges() {
  return [
    { id: "e1", source: "timing1", target: "ind1" },
    { id: "e2", source: "ind1", target: "buy1" },
    { id: "e3", source: "ind1", target: "sell1" },
    { id: "e4", source: "buy1", target: "sl1" },
    { id: "e5", source: "sell1", target: "sl1" },
    { id: "e6", source: "sl1", target: "tp1" },
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
      version: "1.0",
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
        magicNumber: 300001,
        comment: "Range Breakout",
        maxOpenTrades: 1,
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
      version: "1.0",
      nodes: [
        timingNode(),
        {
          id: "entry1",
          type: "ema-crossover-entry",
          position: { x: 300, y: 180 },
          data: {
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
          },
        },
      ],
      edges: [{ id: "e1", source: "timing1", target: "entry1" }],
      viewport: { x: 0, y: 0, zoom: 0.8 },
      metadata: meta,
      settings: {
        magicNumber: 300002,
        comment: "EMA Crossover",
        maxOpenTrades: 1,
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
      version: "1.0",
      nodes: [
        timingNode(),
        {
          id: "entry1",
          type: "trend-pullback-entry",
          position: { x: 300, y: 180 },
          data: {
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
          },
        },
      ],
      edges: [{ id: "e1", source: "timing1", target: "entry1" }],
      viewport: { x: 0, y: 0, zoom: 0.8 },
      metadata: meta,
      settings: {
        magicNumber: 300003,
        comment: "Trend Pullback",
        maxOpenTrades: 1,
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
      version: "1.0",
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
        magicNumber: 300004,
        comment: "RSI Reversal",
        maxOpenTrades: 1,
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
      version: "1.0",
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
        magicNumber: 300006,
        comment: "MACD Crossover",
        maxOpenTrades: 1,
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
      version: "1.0",
      nodes: [
        timingNode(),
        {
          id: "entry1",
          type: "divergence-entry",
          position: { x: 300, y: 180 },
          data: {
            label: "RSI/MACD Divergence",
            category: "entrystrategy",
            entryType: "divergence",
            direction: "BOTH",
            timeframe: "H1",
            indicator: "RSI",
            rsiPeriod: 14,
            appliedPrice: "CLOSE",
            macdFast: 12,
            macdSlow: 26,
            macdSignal: 9,
            lookbackBars: 20,
            minSwingBars: 5,
            riskPercent: 1,
            slMethod: "ATR",
            slFixedPips: 50,
            slPercent: 1,
            slAtrMultiplier: 1.5,
            tpRMultiple: 2,
          },
        },
      ],
      edges: [{ id: "e1", source: "timing1", target: "entry1" }],
      viewport: { x: 0, y: 0, zoom: 0.8 },
      metadata: meta,
      settings: {
        magicNumber: 300007,
        comment: "RSI/MACD Divergence",
        maxOpenTrades: 1,
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
      version: "1.0",
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
        magicNumber: 300008,
        comment: "Bollinger Bands",
        maxOpenTrades: 1,
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
      version: "1.0",
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
        magicNumber: 300009,
        comment: "ADX Trend Strength",
        maxOpenTrades: 1,
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
      version: "1.0",
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
        magicNumber: 300010,
        comment: "Stochastic Reversal",
        maxOpenTrades: 1,
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
      version: "1.0",
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
        magicNumber: 300011,
        comment: "Ichimoku Cloud",
        maxOpenTrades: 1,
        allowHedging: false,
      },
    } as BuildJsonSchema,
  },
];
