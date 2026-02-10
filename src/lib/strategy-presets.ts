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

export const STRATEGY_PRESETS: StrategyPreset[] = [
  // Template-first entry strategy presets (ordered by UX appeal)
  {
    id: "range-breakout",
    name: "Range Breakout",
    description:
      "Breakout of the last 20 candles' range. 1% risk, ATR×1.5 stop, 2R take profit. Enable London session filter for FX focus.",
    tier: "FREE",
    buildJson: {
      version: "1.0",
      nodes: [
        {
          id: "timing1",
          type: "trading-session",
          position: { x: 300, y: 0 },
          data: {
            label: "Trading Sessions",
            category: "timing",
            timingType: "trading-session",
            session: "LONDON",
            tradeMondayToFriday: true,
          },
        },
        {
          id: "entry1",
          type: "range-breakout-entry",
          position: { x: 300, y: 180 },
          data: {
            label: "Range Breakout",
            category: "entrystrategy",
            entryType: "range-breakout",
            rangePeriod: 20,
            riskPercent: 1,
            slAtrMultiplier: 1.5,
            tpRMultiple: 2,
            londonSessionOnly: false,
            cancelOpposite: true,
            htfTrendFilter: false,
            htfTimeframe: "H4",
            htfEma: 200,
          },
        },
      ],
      edges: [{ id: "e1", source: "timing1", target: "entry1" }],
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
        {
          id: "timing1",
          type: "trading-session",
          position: { x: 300, y: 0 },
          data: {
            label: "Trading Sessions",
            category: "timing",
            timingType: "trading-session",
            session: "LONDON",
            tradeMondayToFriday: true,
          },
        },
        {
          id: "entry1",
          type: "ema-crossover-entry",
          position: { x: 300, y: 180 },
          data: {
            label: "EMA Crossover",
            category: "entrystrategy",
            entryType: "ema-crossover",
            fastEma: 50,
            slowEma: 200,
            riskPercent: 1,
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
        {
          id: "timing1",
          type: "trading-session",
          position: { x: 300, y: 0 },
          data: {
            label: "Trading Sessions",
            category: "timing",
            timingType: "trading-session",
            session: "LONDON",
            tradeMondayToFriday: true,
          },
        },
        {
          id: "entry1",
          type: "trend-pullback-entry",
          position: { x: 300, y: 180 },
          data: {
            label: "Trend Pullback",
            category: "entrystrategy",
            entryType: "trend-pullback",
            trendEma: 200,
            pullbackRsiPeriod: 14,
            rsiPullbackLevel: 40,
            riskPercent: 1,
            slAtrMultiplier: 1.5,
            tpRMultiple: 2,
            londonSessionOnly: false,
            requireEmaBuffer: false,
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
      "Mean reversion at RSI extremes. Buys when RSI crosses up from 30, sells when RSI crosses down from 70. 1% risk, 1.2× ATR stop.",
    tier: "FREE",
    buildJson: {
      version: "1.0",
      nodes: [
        {
          id: "timing1",
          type: "trading-session",
          position: { x: 300, y: 0 },
          data: {
            label: "Trading Sessions",
            category: "timing",
            timingType: "trading-session",
            session: "LONDON",
            tradeMondayToFriday: true,
          },
        },
        {
          id: "entry1",
          type: "rsi-reversal-entry",
          position: { x: 300, y: 180 },
          data: {
            label: "RSI Reversal",
            category: "entrystrategy",
            entryType: "rsi-reversal",
            rsiPeriod: 14,
            oversoldLevel: 30,
            overboughtLevel: 70,
            riskPercent: 1,
            slAtrMultiplier: 1.2,
            tpRMultiple: 1.5,
            sessionFilter: false,
            sessionChoice: "LONDON",
            trendFilter: false,
            trendEma: 200,
          },
        },
      ],
      edges: [{ id: "e1", source: "timing1", target: "entry1" }],
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
      "MACD(12,26,9) signal line crossover. Momentum / trend shift strategy. 1% risk, ATR×1.5 stop, 2R take profit.",
    tier: "FREE",
    buildJson: {
      version: "1.0",
      nodes: [
        {
          id: "timing1",
          type: "trading-session",
          position: { x: 300, y: 0 },
          data: {
            label: "Trading Sessions",
            category: "timing",
            timingType: "trading-session",
            session: "LONDON",
            tradeMondayToFriday: true,
          },
        },
        {
          id: "entry1",
          type: "macd-crossover-entry",
          position: { x: 300, y: 180 },
          data: {
            label: "MACD Crossover",
            category: "entrystrategy",
            entryType: "macd-crossover",
            macdFast: 12,
            macdSlow: 26,
            macdSignal: 9,
            riskPercent: 1,
            slAtrMultiplier: 1.5,
            tpRMultiple: 2,
            htfTrendFilter: false,
            htfTimeframe: "H4",
            htfEma: 200,
          },
        },
      ],
      edges: [{ id: "e1", source: "timing1", target: "entry1" }],
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
];
