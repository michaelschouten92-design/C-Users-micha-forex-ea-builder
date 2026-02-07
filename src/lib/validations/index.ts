import { z } from "zod";
import { sanitizeText } from "../sanitize";

// ============================================
// COMMON SCHEMAS
// ============================================

export const idSchema = z.string().cuid();

// Sanitized string transformer - removes HTML/XSS
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

const nodeCategorySchema = z.enum(["timing", "indicator", "priceaction", "trading", "trademanagement"]);

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
const alwaysNodeDataSchema = baseNodeDataSchema.extend({
  category: z.literal("timing"),
  timingType: z.literal("always"),
}).strip();

const customTimesNodeDataSchema = baseNodeDataSchema.extend({
  category: z.literal("timing"),
  timingType: z.literal("custom-times"),
  days: tradingDaysSchema,
  timeSlots: z.array(timeSlotSchema),
}).strip();

const tradingSessionNodeDataSchema = baseNodeDataSchema.extend({
  category: z.literal("timing"),
  timingType: z.literal("trading-session"),
  session: z.enum(["LONDON", "NEW_YORK", "TOKYO", "SYDNEY", "LONDON_NY_OVERLAP"]),
  tradeMondayToFriday: z.boolean(),
}).strip();

// ---- Indicator node data schemas ----
const movingAverageNodeDataSchema = baseNodeDataSchema.extend({
  category: z.literal("indicator"),
  indicatorType: z.literal("moving-average"),
  timeframe: timeframeSchema,
  period: z.number().int().min(1).max(1000),
  method: z.enum(["SMA", "EMA"]),
  appliedPrice: appliedPriceSchema,
  shift: z.number().int().min(0).max(1000),
}).strip();

const rsiNodeDataSchema = baseNodeDataSchema.extend({
  category: z.literal("indicator"),
  indicatorType: z.literal("rsi"),
  timeframe: timeframeSchema,
  period: z.number().int().min(1).max(1000),
  appliedPrice: appliedPriceSchema,
  overboughtLevel: z.number().min(0).max(100),
  oversoldLevel: z.number().min(0).max(100),
}).strip();

const macdNodeDataSchema = baseNodeDataSchema.extend({
  category: z.literal("indicator"),
  indicatorType: z.literal("macd"),
  timeframe: timeframeSchema,
  fastPeriod: z.number().int().min(1).max(1000),
  slowPeriod: z.number().int().min(1).max(1000),
  signalPeriod: z.number().int().min(1).max(1000),
  appliedPrice: appliedPriceSchema,
}).strip();

const bollingerBandsNodeDataSchema = baseNodeDataSchema.extend({
  category: z.literal("indicator"),
  indicatorType: z.literal("bollinger-bands"),
  timeframe: timeframeSchema,
  period: z.number().int().min(1).max(1000),
  deviation: z.number().min(0.1).max(10),
  appliedPrice: appliedPriceSchema,
  shift: z.number().int().min(0).max(1000),
}).strip();

const atrNodeDataSchema = baseNodeDataSchema.extend({
  category: z.literal("indicator"),
  indicatorType: z.literal("atr"),
  timeframe: timeframeSchema,
  period: z.number().int().min(1).max(1000),
}).strip();

const adxNodeDataSchema = baseNodeDataSchema.extend({
  category: z.literal("indicator"),
  indicatorType: z.literal("adx"),
  timeframe: timeframeSchema,
  period: z.number().int().min(1).max(1000),
  trendLevel: z.number().min(0).max(100),
}).strip();

// ---- Price Action node data schemas ----
const candlestickPatternNodeDataSchema = baseNodeDataSchema.extend({
  category: z.literal("priceaction"),
  priceActionType: z.literal("candlestick-pattern"),
  timeframe: timeframeSchema,
  patterns: z.array(z.enum([
    "ENGULFING_BULLISH", "ENGULFING_BEARISH", "DOJI", "HAMMER",
    "SHOOTING_STAR", "MORNING_STAR", "EVENING_STAR",
    "THREE_WHITE_SOLDIERS", "THREE_BLACK_CROWS",
  ])),
  minBodySize: z.number().min(0).max(1000),
}).strip();

const supportResistanceNodeDataSchema = baseNodeDataSchema.extend({
  category: z.literal("priceaction"),
  priceActionType: z.literal("support-resistance"),
  timeframe: timeframeSchema,
  lookbackPeriod: z.number().int().min(1).max(10000),
  touchCount: z.number().int().min(1).max(100),
  zoneSize: z.number().min(0).max(1000),
}).strip();

const rangeBreakoutNodeDataSchema = baseNodeDataSchema.extend({
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
}).strip();

// ---- Trading node data schemas ----
const positionSizingFieldsSchema = z.object({
  method: z.enum(["FIXED_LOT", "RISK_PERCENT"]),
  fixedLot: z.number().min(0.01).max(1000),
  riskPercent: z.number().min(0.1).max(100),
  minLot: z.number().min(0.01).max(1000),
  maxLot: z.number().min(0.01).max(1000),
});

const placeBuyNodeDataSchema = baseNodeDataSchema.merge(positionSizingFieldsSchema).extend({
  category: z.literal("trading"),
  tradingType: z.literal("place-buy"),
}).strip();

const placeSellNodeDataSchema = baseNodeDataSchema.merge(positionSizingFieldsSchema).extend({
  category: z.literal("trading"),
  tradingType: z.literal("place-sell"),
}).strip();

const stopLossNodeDataSchema = baseNodeDataSchema.extend({
  category: z.literal("trading"),
  tradingType: z.literal("stop-loss"),
  method: z.enum(["FIXED_PIPS", "ATR_BASED", "INDICATOR"]),
  fixedPips: z.number().min(1).max(10000),
  atrMultiplier: z.number().min(0.1).max(100),
  atrPeriod: z.number().int().min(1).max(1000),
  indicatorNodeId: z.string().optional(),
}).strip();

const takeProfitNodeDataSchema = baseNodeDataSchema.extend({
  category: z.literal("trading"),
  tradingType: z.literal("take-profit"),
  method: z.enum(["FIXED_PIPS", "RISK_REWARD", "ATR_BASED"]),
  fixedPips: z.number().min(1).max(10000),
  riskRewardRatio: z.number().min(0.1).max(100),
  atrMultiplier: z.number().min(0.1).max(100),
  atrPeriod: z.number().int().min(1).max(1000),
}).strip();

const closeConditionNodeDataSchema = baseNodeDataSchema.extend({
  category: z.literal("trading"),
  tradingType: z.literal("close-condition"),
  closeDirection: z.enum(["BUY", "SELL", "BOTH"]),
}).strip();

// ---- Trade Management node data schemas (Pro only) ----
const breakevenStopNodeDataSchema = baseNodeDataSchema.extend({
  category: z.literal("trademanagement"),
  managementType: z.literal("breakeven-stop"),
  trigger: z.enum(["PIPS", "ATR", "PERCENTAGE"]),
  triggerPips: z.number().min(0).max(10000),
  triggerPercent: z.number().min(0).max(100),
  triggerAtrMultiplier: z.number().min(0.1).max(100),
  triggerAtrPeriod: z.number().int().min(1).max(1000),
  lockPips: z.number().min(0).max(10000),
}).strip();

const trailingStopNodeDataSchema = baseNodeDataSchema.extend({
  category: z.literal("trademanagement"),
  managementType: z.literal("trailing-stop"),
  method: z.enum(["FIXED_PIPS", "ATR_BASED", "PERCENTAGE"]),
  trailPips: z.number().min(0).max(10000),
  trailAtrMultiplier: z.number().min(0.1).max(100),
  trailAtrPeriod: z.number().int().min(1).max(1000),
  trailPercent: z.number().min(0).max(100),
  startAfterPips: z.number().min(0).max(10000),
}).strip();

const partialCloseNodeDataSchema = baseNodeDataSchema.extend({
  category: z.literal("trademanagement"),
  managementType: z.literal("partial-close"),
  closePercent: z.number().min(1).max(100),
  triggerPips: z.number().min(0).max(10000),
  moveSLToBreakeven: z.boolean(),
}).strip();

const lockProfitNodeDataSchema = baseNodeDataSchema.extend({
  category: z.literal("trademanagement"),
  managementType: z.literal("lock-profit"),
  method: z.enum(["PERCENTAGE", "FIXED_PIPS"]),
  lockPercent: z.number().min(0).max(100),
  lockPips: z.number().min(0).max(10000),
  checkIntervalPips: z.number().min(0).max(10000),
}).strip();

// Node data schema - permissive validation with base field check.
// Business logic validation (required node types etc.) is handled by validateBuildJson.
const builderNodeDataSchema = z.object({
  label: z.string(),
  category: nodeCategorySchema,
}).strip();

// React Flow node structure
const builderNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  data: builderNodeDataSchema,
  // Allow additional React Flow properties
  width: z.number().optional(),
  height: z.number().optional(),
  selected: z.boolean().optional(),
  dragging: z.boolean().optional(),
  measured: z.object({
    width: z.number().optional(),
    height: z.number().optional(),
  }).optional(),
}).strip();

// React Flow edge structure
const builderEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().nullable().optional(),
  targetHandle: z.string().nullable().optional(),
}).strip();

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
  conditionMode: z.enum(["AND", "OR"]).optional(),
});

// Build metadata schema
const buildMetadataSchema = z.object({
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Complete BuildJson schema
export const buildJsonSchema = z.object({
  version: z.literal("1.0"),
  nodes: z.array(builderNodeSchema),
  edges: z.array(builderEdgeSchema),
  viewport: viewportSchema,
  metadata: buildMetadataSchema,
  settings: buildSettingsSchema,
});

export const createVersionSchema = z.object({
  buildJson: buildJsonSchema,
  expectedVersion: z.number().int().min(0).optional(),
});

// ============================================
// EXPORT SCHEMAS
// ============================================

export const exportRequestSchema = z.object({
  versionId: z.string().cuid().optional(),
  exportType: z.enum(["MQ5"]).default("MQ5"),
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
  plan: z.enum(["STARTER", "PRO"]),
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
 */
export function checkBodySize(request: Request, maxBytes: number = MAX_BODY_SIZE): Response | null {
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > maxBytes) {
    return Response.json(
      { error: "Request too large", details: `Maximum request size is ${Math.round(maxBytes / 1024)}KB` },
      { status: 413 }
    );
  }
  return null;
}

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: z.ZodError };

export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
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
