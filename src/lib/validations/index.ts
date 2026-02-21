import { z } from "zod";
import { sanitizeText } from "../sanitize";

// ============================================
// COMMON SCHEMAS
// ============================================

export const idSchema = z.string().cuid();

// Sanitized string transformer - removes HTML/XSS
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const sanitizedString = (maxLength: number) =>
  z
    .string()
    .max(maxLength)
    .transform((val) => sanitizeText(val.trim()));

// ============================================
// PROJECT SCHEMAS
// ============================================

export const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, "Project name is required")
    .max(100, "Project name must be 100 characters or less")
    .transform((val) => sanitizeText(val.trim())),
  description: z
    .string()
    .max(500, "Description must be 500 characters or less")
    .optional()
    .nullable()
    .transform((val) => {
      if (!val) return null;
      const sanitized = sanitizeText(val.trim());
      return sanitized || null;
    }),
});

export const updateProjectSchema = z.object({
  name: z
    .string()
    .min(1, "Project name is required")
    .max(100, "Project name must be 100 characters or less")
    .transform((val) => sanitizeText(val.trim()))
    .optional(),
  description: z
    .string()
    .max(500, "Description must be 500 characters or less")
    .optional()
    .nullable()
    .transform((val) => {
      if (val === undefined) return undefined;
      if (!val) return null;
      const sanitized = sanitizeText(val.trim());
      return sanitized || null;
    }),
  notes: z
    .string()
    .max(5000, "Notes must be 5000 characters or less")
    .optional()
    .nullable()
    .transform((val) => {
      if (val === undefined) return undefined;
      if (!val) return null;
      const sanitized = sanitizeText(val.trim());
      return sanitized || null;
    }),
});

// ============================================
// BUILD JSON SCHEMAS (for version creation)
// ============================================

const appliedPriceSchema = z.enum([
  "CLOSE",
  "OPEN",
  "HIGH",
  "LOW",
  "MEDIAN",
  "TYPICAL",
  "WEIGHTED",
]);

const signalModeSchema = z.enum(["every_tick", "candle_close"]);

const nodeCategorySchema = z.enum([
  "timing",
  "indicator",
  "priceaction",
  "entry",
  "trading",
  "riskmanagement",
  "trademanagement",
  "entrystrategy",
]);

const timeframeSchema = z.enum(["M1", "M5", "M15", "M30", "H1", "H4", "D1", "W1", "MN1"]);

// Session time for trading times node
const timeSlotSchema = z.object({
  startHour: z.number().int().min(0).max(23),
  startMinute: z.number().int().min(0).max(59),
  endHour: z.number().int().min(0).max(23),
  endMinute: z.number().int().min(0).max(59),
});

const tradingDaysSchema = z.object({
  monday: z.boolean(),
  tuesday: z.boolean(),
  wednesday: z.boolean(),
  thursday: z.boolean(),
  friday: z.boolean(),
  saturday: z.boolean(),
  sunday: z.boolean(),
});

// Base node data - common fields
const baseNodeDataSchema = z.object({
  label: z.string(),
  category: nodeCategorySchema,
  optimizableFields: z.array(z.string()).optional(),
});

// ---- Timing node data ----
/* eslint-disable @typescript-eslint/no-unused-vars -- per-node schemas defined for future strict validation */
const alwaysNodeDataSchema = baseNodeDataSchema
  .extend({
    category: z.literal("timing"),
    timingType: z.literal("always"),
  })
  .strip();

const customTimesNodeDataSchema = baseNodeDataSchema
  .extend({
    category: z.literal("timing"),
    timingType: z.literal("custom-times"),
    days: tradingDaysSchema,
    timeSlots: z.array(timeSlotSchema),
    useServerTime: z.boolean().optional(),
  })
  .strip();

const tradingSessionNodeDataSchema = baseNodeDataSchema
  .extend({
    category: z.literal("timing"),
    timingType: z.literal("trading-session"),
    session: z.enum(["LONDON", "NEW_YORK", "TOKYO", "SYDNEY", "LONDON_NY_OVERLAP", "CUSTOM"]),
    tradingDays: tradingDaysSchema,
    useServerTime: z.boolean().optional(),
    customStartHour: z.number().int().min(0).max(23).optional(),
    customStartMinute: z.number().int().min(0).max(59).optional(),
    customEndHour: z.number().int().min(0).max(23).optional(),
    customEndMinute: z.number().int().min(0).max(59).optional(),
  })
  .strip();

const maxSpreadNodeDataSchema = baseNodeDataSchema
  .extend({
    category: z.literal("timing"),
    filterType: z.literal("max-spread"),
    maxSpreadPips: z.number().int().min(1).max(10000),
  })
  .strip();

const volatilityFilterNodeDataSchema = baseNodeDataSchema
  .extend({
    category: z.literal("timing"),
    filterType: z.literal("volatility-filter"),
    atrPeriod: z.number().int().min(1).max(1000),
    atrTimeframe: timeframeSchema,
    minAtrPips: z.number().min(0).max(10000),
    maxAtrPips: z.number().min(0).max(10000),
  })
  .strip();

const fridayCloseFilterNodeDataSchema = baseNodeDataSchema
  .extend({
    category: z.literal("timing"),
    filterType: z.literal("friday-close"),
    closeHour: z.number().int().min(0).max(23),
    closeMinute: z.number().int().min(0).max(59),
    useServerTime: z.boolean().optional(),
    closePending: z.boolean().optional(),
  })
  .strip();

const newsFilterNodeDataSchema = baseNodeDataSchema
  .extend({
    category: z.literal("timing"),
    filterType: z.literal("news-filter"),
    hoursBefore: z.number().min(0).max(24),
    hoursAfter: z.number().min(0).max(24),
    highImpact: z.boolean(),
    mediumImpact: z.boolean(),
    lowImpact: z.boolean(),
    closePositions: z.boolean(),
  })
  .strip();

// ---- Indicator node data schemas ----
const movingAverageNodeDataSchema = baseNodeDataSchema
  .extend({
    category: z.literal("indicator"),
    indicatorType: z.literal("moving-average"),
    timeframe: timeframeSchema,
    period: z.number().int().min(1).max(1000),
    method: z.enum(["SMA", "EMA"]),
    appliedPrice: appliedPriceSchema.optional(),
    signalMode: signalModeSchema.optional(),
    shift: z.number().int().min(0).max(1000),
  })
  .strip();

const rsiNodeDataSchema = baseNodeDataSchema
  .extend({
    category: z.literal("indicator"),
    indicatorType: z.literal("rsi"),
    timeframe: timeframeSchema,
    period: z.number().int().min(1).max(1000),
    appliedPrice: appliedPriceSchema.optional(),
    signalMode: signalModeSchema.optional(),
    overboughtLevel: z.number().min(0).max(100),
    oversoldLevel: z.number().min(0).max(100),
  })
  .strip();

const macdNodeDataSchema = baseNodeDataSchema
  .extend({
    category: z.literal("indicator"),
    indicatorType: z.literal("macd"),
    timeframe: timeframeSchema,
    fastPeriod: z.number().int().min(1).max(1000),
    slowPeriod: z.number().int().min(1).max(1000),
    signalPeriod: z.number().int().min(1).max(1000),
    appliedPrice: appliedPriceSchema.optional(),
    signalMode: signalModeSchema.optional(),
  })
  .strip();

const bollingerBandsNodeDataSchema = baseNodeDataSchema
  .extend({
    category: z.literal("indicator"),
    indicatorType: z.literal("bollinger-bands"),
    timeframe: timeframeSchema,
    period: z.number().int().min(1).max(1000),
    deviation: z.number().min(0.1).max(10),
    appliedPrice: appliedPriceSchema.optional(),
    signalMode: signalModeSchema.optional(),
    shift: z.number().int().min(0).max(1000),
  })
  .strip();

const atrNodeDataSchema = baseNodeDataSchema
  .extend({
    category: z.literal("indicator"),
    indicatorType: z.literal("atr"),
    timeframe: timeframeSchema,
    period: z.number().int().min(1).max(1000),
    signalMode: signalModeSchema.optional(),
  })
  .strip();

const adxNodeDataSchema = baseNodeDataSchema
  .extend({
    category: z.literal("indicator"),
    indicatorType: z.literal("adx"),
    timeframe: timeframeSchema,
    period: z.number().int().min(1).max(1000),
    trendLevel: z.number().min(0).max(100),
    signalMode: signalModeSchema.optional(),
  })
  .strip();

const stochasticNodeDataSchema = baseNodeDataSchema
  .extend({
    category: z.literal("indicator"),
    indicatorType: z.literal("stochastic"),
    timeframe: timeframeSchema,
    kPeriod: z.number().int().min(1).max(1000),
    dPeriod: z.number().int().min(1).max(1000),
    slowing: z.number().int().min(1).max(1000),
    overboughtLevel: z.number().min(0).max(100),
    oversoldLevel: z.number().min(0).max(100),
    maMethod: z.enum(["SMA", "EMA"]).optional(),
    priceField: z.enum(["LOWHIGH", "CLOSECLOSE"]).optional(),
    signalMode: signalModeSchema.optional(),
  })
  .strip();

const cciNodeDataSchema = baseNodeDataSchema
  .extend({
    category: z.literal("indicator"),
    indicatorType: z.literal("cci"),
    timeframe: timeframeSchema,
    period: z.number().int().min(1).max(1000),
    appliedPrice: appliedPriceSchema.optional(),
    overboughtLevel: z.number().min(-1000).max(1000),
    oversoldLevel: z.number().min(-1000).max(1000),
    signalMode: signalModeSchema.optional(),
  })
  .strip();

// ---- Price Action node data schemas ----
const candlestickPatternNodeDataSchema = baseNodeDataSchema
  .extend({
    category: z.literal("priceaction"),
    priceActionType: z.literal("candlestick-pattern"),
    timeframe: timeframeSchema,
    patterns: z.array(
      z.enum([
        "ENGULFING_BULLISH",
        "ENGULFING_BEARISH",
        "DOJI",
        "HAMMER",
        "SHOOTING_STAR",
        "MORNING_STAR",
        "EVENING_STAR",
        "THREE_WHITE_SOLDIERS",
        "THREE_BLACK_CROWS",
      ])
    ),
    minBodySize: z.number().min(0).max(1000),
  })
  .strip();

const supportResistanceNodeDataSchema = baseNodeDataSchema
  .extend({
    category: z.literal("priceaction"),
    priceActionType: z.literal("support-resistance"),
    timeframe: timeframeSchema,
    lookbackPeriod: z.number().int().min(1).max(10000),
    touchCount: z.number().int().min(1).max(100),
    zoneSize: z.number().min(0).max(1000),
  })
  .strip();

const rangeBreakoutNodeDataSchema = baseNodeDataSchema
  .extend({
    category: z.literal("priceaction"),
    priceActionType: z.literal("range-breakout"),
    timeframe: timeframeSchema,
    rangeType: z.enum(["PREVIOUS_CANDLES", "SESSION", "TIME_WINDOW"]),
    lookbackCandles: z.number().int().min(1).max(10000),
    rangeSession: z.enum(["ASIAN", "LONDON", "NEW_YORK", "CUSTOM"]),
    sessionStartHour: z.number().int().min(0).max(23),
    sessionStartMinute: z.number().int().min(0).max(59),
    sessionEndHour: z.number().int().min(0).max(23),
    sessionEndMinute: z.number().int().min(0).max(59),
    breakoutDirection: z.enum(["BUY_ON_HIGH", "SELL_ON_LOW", "BOTH"]),
    entryMode: z.enum(["IMMEDIATE", "ON_CLOSE", "AFTER_RETEST"]),
    bufferPips: z.number().min(0).max(1000),
    minRangePips: z.number().min(0).max(10000),
    maxRangePips: z.number().min(0).max(10000),
    useServerTime: z.boolean().optional(),
  })
  .strip();

// ---- Trading node data schemas ----
const positionSizingFieldsSchema = z.object({
  method: z.enum(["FIXED_LOT", "RISK_PERCENT"]),
  fixedLot: z.number().min(0.01).max(1000),
  riskPercent: z.number().min(0.1).max(100),
  minLot: z.number().min(0.01).max(1000),
  maxLot: z.number().min(0.01).max(1000),
  orderType: z.enum(["MARKET", "STOP", "LIMIT"]).default("MARKET"),
  pendingOffset: z.number().min(0).max(10000).default(10),
});

const embeddedStopLossSchema = z.object({
  slMethod: z.enum(["FIXED_PIPS", "ATR_BASED", "PERCENT", "INDICATOR", "RANGE_OPPOSITE"]),
  slFixedPips: z.number().min(1).max(10000),
  slPercent: z.number().min(0.01).max(50),
  slAtrMultiplier: z.number().min(0.1).max(100),
  slAtrPeriod: z.number().int().min(1).max(1000),
  slAtrTimeframe: z.enum(["M1", "M5", "M15", "M30", "H1", "H4", "D1", "W1", "MN1"]).optional(),
  slIndicatorNodeId: z.string().optional(),
});

const embeddedTakeProfitSchema = z.object({
  tpMethod: z.enum(["FIXED_PIPS", "RISK_REWARD", "ATR_BASED"]),
  tpFixedPips: z.number().min(1).max(10000),
  tpRiskRewardRatio: z.number().min(0.1).max(100),
  tpAtrMultiplier: z.number().min(0.1).max(100),
  tpAtrPeriod: z.number().int().min(1).max(1000),
  tpMultipleTPEnabled: z.boolean().optional(),
  tpLevels: z
    .array(
      z.object({
        method: z.enum(["FIXED_PIPS", "RISK_REWARD", "ATR_BASED"]),
        fixedPips: z.number(),
        riskRewardRatio: z.number(),
        atrMultiplier: z.number(),
        atrPeriod: z.number(),
        closePercent: z.number(),
      })
    )
    .optional(),
});

const placeBuyNodeDataSchema = baseNodeDataSchema
  .merge(positionSizingFieldsSchema)
  .merge(embeddedStopLossSchema)
  .merge(embeddedTakeProfitSchema)
  .extend({
    category: z.enum(["entry", "trading"]),
    tradingType: z.literal("place-buy"),
  })
  .strip();

const placeSellNodeDataSchema = baseNodeDataSchema
  .merge(positionSizingFieldsSchema)
  .merge(embeddedStopLossSchema)
  .merge(embeddedTakeProfitSchema)
  .extend({
    category: z.enum(["entry", "trading"]),
    tradingType: z.literal("place-sell"),
  })
  .strip();

const stopLossNodeDataSchema = baseNodeDataSchema
  .extend({
    category: z.enum(["riskmanagement", "trading"]),
    tradingType: z.literal("stop-loss"),
    method: z.enum(["FIXED_PIPS", "ATR_BASED", "PERCENT", "INDICATOR", "RANGE_OPPOSITE"]),
    fixedPips: z.number().min(1).max(10000),
    slPercent: z.number().min(0.01).max(50).optional(),
    atrMultiplier: z.number().min(0.1).max(100),
    atrPeriod: z.number().int().min(1).max(1000),
    indicatorNodeId: z.string().optional(),
  })
  .strip();

const takeProfitNodeDataSchema = baseNodeDataSchema
  .extend({
    category: z.enum(["riskmanagement", "trading"]),
    tradingType: z.literal("take-profit"),
    method: z.enum(["FIXED_PIPS", "RISK_REWARD", "ATR_BASED"]),
    fixedPips: z.number().min(1).max(10000),
    riskRewardRatio: z.number().min(0.1).max(100),
    atrMultiplier: z.number().min(0.1).max(100),
    atrPeriod: z.number().int().min(1).max(1000),
  })
  .strip();

const closeConditionNodeDataSchema = baseNodeDataSchema
  .extend({
    category: z.enum(["riskmanagement", "trading"]),
    tradingType: z.literal("close-condition"),
    closeDirection: z.enum(["BUY", "SELL", "BOTH"]),
  })
  .strip();

const timeExitNodeDataSchema = baseNodeDataSchema
  .extend({
    category: z.enum(["riskmanagement", "trading"]),
    tradingType: z.literal("time-exit"),
    exitAfterBars: z.number().int().min(1).max(10000),
    exitTimeframe: timeframeSchema,
  })
  .strip();

// ---- Trade Management node data schemas (Pro only) ----
const breakevenStopNodeDataSchema = baseNodeDataSchema
  .extend({
    category: z.literal("trademanagement"),
    managementType: z.literal("breakeven-stop"),
    trigger: z.enum(["PIPS", "ATR", "PERCENTAGE"]),
    triggerPips: z.number().min(0).max(10000),
    triggerPercent: z.number().min(0).max(100),
    triggerAtrMultiplier: z.number().min(0.1).max(100),
    triggerAtrPeriod: z.number().int().min(1).max(1000),
    lockPips: z.number().min(0).max(10000),
  })
  .strip();

const trailingStopNodeDataSchema = baseNodeDataSchema
  .extend({
    category: z.literal("trademanagement"),
    managementType: z.literal("trailing-stop"),
    method: z.enum(["FIXED_PIPS", "ATR_BASED", "PERCENTAGE"]),
    trailPips: z.number().min(0).max(10000),
    trailAtrMultiplier: z.number().min(0.1).max(100),
    trailAtrPeriod: z.number().int().min(1).max(1000),
    trailPercent: z.number().min(0).max(100),
    startAfterPips: z.number().min(0).max(10000),
  })
  .strip();

const partialCloseNodeDataSchema = baseNodeDataSchema
  .extend({
    category: z.literal("trademanagement"),
    managementType: z.literal("partial-close"),
    closePercent: z.number().min(1).max(100),
    triggerMethod: z.enum(["PIPS", "PERCENT"]).default("PIPS"),
    triggerPips: z.number().min(0).max(10000),
    triggerPercent: z.number().min(0.01).max(100).default(1),
    moveSLToBreakeven: z.boolean(),
  })
  .strip();

const lockProfitNodeDataSchema = baseNodeDataSchema
  .extend({
    category: z.literal("trademanagement"),
    managementType: z.literal("lock-profit"),
    method: z.enum(["PERCENTAGE", "FIXED_PIPS"]),
    lockPercent: z.number().min(0).max(100),
    lockPips: z.number().min(0).max(10000),
    checkIntervalPips: z.number().min(0).max(10000),
  })
  .strip();

/* eslint-enable @typescript-eslint/no-unused-vars */

// ---- Entry Strategy node data schemas ----
// Consistent risk model: Risk %, ATR-based SL, R-multiple TP
const baseEntryStrategyFieldsSchema = z.object({
  direction: z.enum(["BUY", "SELL", "BOTH"]).default("BOTH"),
  timeframe: timeframeSchema.default("H1"),
  riskPercent: z.number().min(0.1).max(10),
  slMethod: z.enum(["ATR", "PIPS", "PERCENT", "RANGE_OPPOSITE"]).default("ATR"),
  slFixedPips: z.number().min(1).max(10000).default(50),
  slPercent: z.number().min(0.01).max(50).default(1),
  slAtrMultiplier: z.number().min(0.1).max(20),
  slAtrPeriod: z.number().int().min(1).max(500).optional(),
  slAtrTimeframe: timeframeSchema.optional(),
  tpRMultiple: z.number().min(0.1).max(20),
  closeOnOpposite: z.boolean().optional(),
  mtfConfirmation: z
    .object({
      enabled: z.boolean(),
      timeframe: timeframeSchema,
      method: z.enum(["ema", "adx"]),
      emaPeriod: z.number().int().min(1).max(1000).optional(),
      adxPeriod: z.number().int().min(1).max(500).optional(),
      adxThreshold: z.number().min(1).max(100).optional(),
    })
    .optional(),
  multipleTP: z
    .object({
      enabled: z.boolean(),
      tp1RMultiple: z.number().min(0.5).max(20),
      tp1Percent: z.number().int().min(10).max(90),
      tp2RMultiple: z.number().min(0.5).max(20),
    })
    .superRefine((data, ctx) => {
      if (data.enabled && data.tp2RMultiple <= data.tp1RMultiple) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "TP2 R-multiple must be greater than TP1 R-multiple",
          path: ["tp2RMultiple"],
        });
      }
    })
    .optional(),
  trailingStop: z
    .object({
      enabled: z.boolean(),
      method: z.enum(["atr", "fixed-pips"]),
      atrMultiplier: z.number().min(0.1).max(20).optional(),
      atrPeriod: z.number().int().min(1).max(500).optional(),
      atrTimeframe: z.string().optional(),
      fixedPips: z.number().min(1).max(10000).optional(),
    })
    .optional(),
});

const emaCrossoverEntryDataSchema = baseNodeDataSchema
  .merge(baseEntryStrategyFieldsSchema)
  .extend({
    category: z.literal("entrystrategy"),
    entryType: z.literal("ema-crossover"),
    fastEma: z.number().int().min(1).max(1000),
    slowEma: z.number().int().min(1).max(1000),
    appliedPrice: z.enum(["CLOSE", "OPEN", "HIGH", "LOW"]).optional(),
    htfTrendFilter: z.boolean(),
    htfTimeframe: timeframeSchema,
    htfEma: z.number().int().min(1).max(1000),
    rsiConfirmation: z.boolean(),
    rsiPeriod: z.number().int().min(1).max(1000),
    rsiLongMax: z.number().min(0).max(100),
    rsiShortMin: z.number().min(0).max(100),
    minEmaSeparation: z.number().min(0).max(10000).optional(),
  })
  .strip();

const trendPullbackEntryDataSchema = baseNodeDataSchema
  .merge(baseEntryStrategyFieldsSchema)
  .extend({
    category: z.literal("entrystrategy"),
    entryType: z.literal("trend-pullback"),
    trendEma: z.number().int().min(1).max(1000),
    pullbackRsiPeriod: z.number().int().min(1).max(500),
    rsiPullbackLevel: z.number().min(10).max(50),
    pullbackMaxDistance: z.number().min(0.1).max(100),
    requireEmaBuffer: z.boolean(),
    useAdxFilter: z.boolean(),
    adxPeriod: z.number().int().min(1).max(500),
    adxThreshold: z.number().min(1).max(100),
    appliedPrice: appliedPriceSchema.optional(),
  })
  .strip();

const divergenceEntryDataSchema = baseNodeDataSchema
  .merge(baseEntryStrategyFieldsSchema)
  .extend({
    category: z.literal("entrystrategy"),
    entryType: z.literal("divergence"),
    indicator: z.enum(["RSI", "MACD"]),
    rsiPeriod: z.number().int().min(1).max(1000),
    appliedPrice: appliedPriceSchema.optional(),
    macdFast: z.number().int().min(1).max(1000),
    macdSlow: z.number().int().min(1).max(1000),
    macdSignal: z.number().int().min(1).max(1000),
    lookbackBars: z.number().int().min(5).max(200),
    minSwingBars: z.number().int().min(2).max(50),
  })
  .strip();

// Node data schema - validates entry strategy nodes strictly, other nodes permissively.
// Business logic validation (required node types etc.) is handled by validateBuildJson.
const entryStrategyNodeDataSchema = z.discriminatedUnion("entryType", [
  emaCrossoverEntryDataSchema,
  trendPullbackEntryDataSchema,
  divergenceEntryDataSchema,
]);

const builderNodeDataSchema = z
  .object({
    label: z.string(),
    category: nodeCategorySchema,
  })
  .passthrough()
  .superRefine((data, ctx) => {
    // Entry strategy nodes get strict per-field validation
    if (data.category === "entrystrategy" && "entryType" in data) {
      const result = entryStrategyNodeDataSchema.safeParse(data);
      if (!result.success) {
        for (const issue of result.error.issues) {
          ctx.addIssue(issue);
        }
      }
      // Cross-field validation for EMA crossover
      if (data.entryType === "ema-crossover") {
        const d = data as { fastEma?: number; slowEma?: number };
        if (d.fastEma != null && d.slowEma != null && d.fastEma >= d.slowEma) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Fast EMA period must be less than Slow EMA period",
            path: ["fastEma"],
          });
        }
      }
      // Cross-field validation for divergence (MACD fast < slow)
      if (data.entryType === "divergence") {
        const d = data as { indicator?: string; macdFast?: number; macdSlow?: number };
        if (
          d.indicator === "MACD" &&
          d.macdFast != null &&
          d.macdSlow != null &&
          d.macdFast >= d.macdSlow
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "MACD Fast period must be less than Slow period",
            path: ["macdFast"],
          });
        }
      }
    }
    // Timing filter nodes get strict validation
    if (data.category === "timing" && "filterType" in data) {
      const filterSchemaMap: Record<string, z.ZodType> = {
        "max-spread": maxSpreadNodeDataSchema,
        "volatility-filter": volatilityFilterNodeDataSchema,
        "friday-close": fridayCloseFilterNodeDataSchema,
        "news-filter": newsFilterNodeDataSchema,
      };
      const schema = filterSchemaMap[(data as Record<string, unknown>).filterType as string];
      if (schema) {
        const result = schema.safeParse(data);
        if (!result.success) {
          for (const issue of (result as { success: false; error: z.ZodError }).error.issues) {
            ctx.addIssue(issue);
          }
        }
      }
    }
  });

// React Flow node structure - passthrough() preserves additional React Flow internal properties
const builderNodeSchema = z
  .object({
    id: z.string(),
    type: z.string(),
    position: z.object({
      x: z.number(),
      y: z.number(),
    }),
    data: builderNodeDataSchema,
    width: z.number().optional(),
    height: z.number().optional(),
    selected: z.boolean().optional(),
    dragging: z.boolean().optional(),
    measured: z
      .object({
        width: z.number().optional(),
        height: z.number().optional(),
      })
      .optional(),
  })
  .passthrough();

// React Flow edge structure
const builderEdgeSchema = z
  .object({
    id: z.string(),
    source: z.string(),
    target: z.string(),
    sourceHandle: z.string().nullable().optional(),
    targetHandle: z.string().nullable().optional(),
  })
  .strip();

// Viewport schema
const viewportSchema = z.object({
  x: z.number(),
  y: z.number(),
  zoom: z.number().min(0.1).max(10),
});

// Build settings schema
const buildSettingsSchema = z.object({
  magicNumber: z.number().int().min(1).max(2147483647),
  comment: z.string().max(100),
  maxOpenTrades: z.number().int().min(1).max(100),
  allowHedging: z.boolean(),
  maxBuyPositions: z.number().int().min(0).max(100).optional(),
  maxSellPositions: z.number().int().min(0).max(100).optional(),
  conditionMode: z.enum(["AND", "OR"]).optional(),
  maxTradesPerDay: z.number().int().min(0).max(100).optional(),
  maxDailyProfitPercent: z.number().min(0).max(100).optional(),
  maxDailyLossPercent: z.number().min(0).max(100).optional(),
  cooldownAfterLossMinutes: z.number().int().min(1).max(1440).optional(),
  minBarsBetweenTrades: z.number().int().min(1).max(500).optional(),
  maxTotalDrawdownPercent: z.number().min(1).max(50).optional(),
  equityTargetPercent: z.number().min(1).max(1000).optional(),
});

// Build metadata schema
const buildMetadataSchema = z.object({
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Complete BuildJson schema
// Accept any known version string — migrations will upgrade to CURRENT_VERSION before use
export const buildJsonSchema = z.object({
  version: z.string().regex(/^\d+\.\d+$/, "Version must be in X.Y format"),
  nodes: z.array(builderNodeSchema).max(500, "Maximum 500 nodes allowed"),
  edges: z.array(builderEdgeSchema).max(1000, "Maximum 1000 edges allowed"),
  viewport: viewportSchema,
  metadata: buildMetadataSchema,
  settings: buildSettingsSchema,
});

export const createVersionSchema = z.object({
  buildJson: buildJsonSchema,
  expectedVersion: z.number().int().min(0).optional(),
  isAutosave: z.boolean().optional(),
});

// ============================================
// EXPORT SCHEMAS
// ============================================

export const exportRequestSchema = z.object({
  versionId: z.string().cuid().optional(),
  exportType: z.literal("MQ5").default("MQ5"),
  magicNumber: z.number().int().min(1).max(2147483647).optional(),
});

// ============================================
// AUTH SCHEMAS
// ============================================

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be 72 characters or less"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

// ============================================
// STRIPE SCHEMAS
// ============================================

export const checkoutRequestSchema = z.object({
  plan: z.enum(["PRO", "ELITE"]),
  interval: z.enum(["monthly", "yearly"]),
});

export type CheckoutRequestInput = z.infer<typeof checkoutRequestSchema>;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check that Content-Type header is application/json.
 * Returns an error Response if invalid, null if OK.
 */
export function checkContentType(request: Request): Response | null {
  const contentType = request.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    return Response.json(
      { error: "Content-Type must be application/json", code: "VALIDATION_FAILED" },
      { status: 415 }
    );
  }
  return null;
}

/** Max request body size in bytes (1MB default) */
const MAX_BODY_SIZE = 1 * 1024 * 1024;

/**
 * Check Content-Length header and reject oversized requests.
 * Returns an error Response if too large, null if OK.
 * Note: This is an early-reject optimization based on Content-Length header.
 * Clients using chunked transfer encoding may omit Content-Length, so callers
 * handling untrusted input should also verify the actual body size after reading.
 */
export function checkBodySize(request: Request, maxBytes: number = MAX_BODY_SIZE): Response | null {
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > maxBytes) {
    return Response.json(
      {
        error: "Request too large",
        details: `Maximum request size is ${Math.round(maxBytes / 1024)}KB`,
      },
      { status: 413 }
    );
  }
  return null;
}

/**
 * Safely read and parse JSON body with actual size enforcement.
 * Use this instead of request.json() when body size must be strictly enforced.
 * Returns the parsed body or an error Response.
 */
export async function safeReadJson(
  request: Request,
  maxBytes: number = MAX_BODY_SIZE
): Promise<{ data: unknown } | { error: Response }> {
  const rawBody = await request.text();
  if (rawBody.length > maxBytes) {
    return {
      error: Response.json(
        {
          error: "Request too large",
          details: `Maximum request size is ${Math.round(maxBytes / 1024)}KB`,
        },
        { status: 413 }
      ),
    };
  }
  try {
    return { data: JSON.parse(rawBody) };
  } catch {
    return {
      error: Response.json({ error: "Invalid JSON" }, { status: 400 }),
    };
  }
}

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: z.ZodError };

export function validate<T>(schema: z.ZodSchema<T>, data: unknown): ValidationResult<T> {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

export function formatZodErrors(error: z.ZodError): string[] {
  return error.errors.map((err) => {
    const path = err.path.join(".");
    return path ? `${path}: ${err.message}` : err.message;
  });
}

// Type exports
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type BuildJsonInput = z.infer<typeof buildJsonSchema>;
export type CreateVersionInput = z.infer<typeof createVersionSchema>;
export type ExportRequestInput = z.infer<typeof exportRequestSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
