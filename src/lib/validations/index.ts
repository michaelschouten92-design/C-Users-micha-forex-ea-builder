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

const nodeCategorySchema = z.enum(["timing", "indicator", "condition", "trading"]);

// Session time for trading times node
const sessionTimeSchema = z.object({
  startHour: z.number().int().min(0).max(23),
  startMinute: z.number().int().min(0).max(59),
  endHour: z.number().int().min(0).max(23),
  endMinute: z.number().int().min(0).max(59),
});

// Condition rule schema
const conditionRuleSchema = z.object({
  id: z.string(),
  leftOperand: z.string(),
  operator: z.enum([">", "<", ">=", "<=", "==", "crosses_above", "crosses_below"]),
  rightOperand: z.string(),
});

// Base node data - common fields
const baseNodeDataSchema = z.object({
  label: z.string(),
  category: nodeCategorySchema,
});

// Timing node data
const tradingTimesNodeDataSchema = baseNodeDataSchema.extend({
  category: z.literal("timing"),
  timingType: z.literal("trading-times"),
  mode: z.enum(["ALWAYS", "CUSTOM"]),
  sessions: z.array(sessionTimeSchema),
  tradeMondayToFriday: z.boolean(),
});

// Indicator node data schemas
const movingAverageNodeDataSchema = baseNodeDataSchema.extend({
  category: z.literal("indicator"),
  indicatorType: z.literal("moving-average"),
  period: z.number().int().min(1).max(1000),
  method: z.enum(["SMA", "EMA", "SMMA", "LWMA"]),
  appliedPrice: appliedPriceSchema,
  shift: z.number().int().min(0).max(1000),
});

const rsiNodeDataSchema = baseNodeDataSchema.extend({
  category: z.literal("indicator"),
  indicatorType: z.literal("rsi"),
  period: z.number().int().min(1).max(1000),
  appliedPrice: appliedPriceSchema,
  overboughtLevel: z.number().min(0).max(100),
  oversoldLevel: z.number().min(0).max(100),
});

const macdNodeDataSchema = baseNodeDataSchema.extend({
  category: z.literal("indicator"),
  indicatorType: z.literal("macd"),
  fastPeriod: z.number().int().min(1).max(1000),
  slowPeriod: z.number().int().min(1).max(1000),
  signalPeriod: z.number().int().min(1).max(1000),
  appliedPrice: appliedPriceSchema,
});

const bollingerBandsNodeDataSchema = baseNodeDataSchema.extend({
  category: z.literal("indicator"),
  indicatorType: z.literal("bollinger-bands"),
  period: z.number().int().min(1).max(1000),
  deviation: z.number().min(0.1).max(10),
  appliedPrice: appliedPriceSchema,
  shift: z.number().int().min(0).max(1000),
});

const atrNodeDataSchema = baseNodeDataSchema.extend({
  category: z.literal("indicator"),
  indicatorType: z.literal("atr"),
  period: z.number().int().min(1).max(1000),
});

const adxNodeDataSchema = baseNodeDataSchema.extend({
  category: z.literal("indicator"),
  indicatorType: z.literal("adx"),
  period: z.number().int().min(1).max(1000),
  trendLevel: z.number().min(0).max(100),
});

// Condition node data schemas
const entryConditionNodeDataSchema = baseNodeDataSchema.extend({
  category: z.literal("condition"),
  conditionType: z.literal("entry"),
  direction: z.enum(["BUY", "SELL", "BOTH"]),
  logic: z.enum(["AND", "OR"]),
  rules: z.array(conditionRuleSchema),
});

const exitConditionNodeDataSchema = baseNodeDataSchema.extend({
  category: z.literal("condition"),
  conditionType: z.literal("exit"),
  exitType: z.enum(["CLOSE_ALL", "CLOSE_BUY", "CLOSE_SELL"]),
  logic: z.enum(["AND", "OR"]),
  rules: z.array(conditionRuleSchema),
});

// Trading node data schemas
const positionSizingNodeDataSchema = baseNodeDataSchema.extend({
  category: z.literal("trading"),
  tradingType: z.literal("position-sizing"),
  method: z.enum(["FIXED_LOT", "RISK_PERCENT", "BALANCE_PERCENT"]),
  fixedLot: z.number().min(0.01).max(1000),
  riskPercent: z.number().min(0.1).max(100),
  balancePercent: z.number().min(0.1).max(100),
  minLot: z.number().min(0.01).max(1000),
  maxLot: z.number().min(0.01).max(1000),
});

const stopLossNodeDataSchema = baseNodeDataSchema.extend({
  category: z.literal("trading"),
  tradingType: z.literal("stop-loss"),
  method: z.enum(["FIXED_PIPS", "ATR_BASED", "INDICATOR"]),
  fixedPips: z.number().min(1).max(10000),
  atrMultiplier: z.number().min(0.1).max(100),
  atrPeriod: z.number().int().min(1).max(1000),
  indicatorNodeId: z.string().optional(),
});

const takeProfitNodeDataSchema = baseNodeDataSchema.extend({
  category: z.literal("trading"),
  tradingType: z.literal("take-profit"),
  method: z.enum(["FIXED_PIPS", "RISK_REWARD", "ATR_BASED"]),
  fixedPips: z.number().min(1).max(10000),
  riskRewardRatio: z.number().min(0.1).max(100),
  atrMultiplier: z.number().min(0.1).max(100),
  atrPeriod: z.number().int().min(1).max(1000),
});

// Union of all node data types - use passthrough to allow extra fields from React Flow
const builderNodeDataSchema = z.union([
  tradingTimesNodeDataSchema,
  movingAverageNodeDataSchema,
  rsiNodeDataSchema,
  macdNodeDataSchema,
  bollingerBandsNodeDataSchema,
  atrNodeDataSchema,
  adxNodeDataSchema,
  entryConditionNodeDataSchema,
  exitConditionNodeDataSchema,
  positionSizingNodeDataSchema,
  stopLossNodeDataSchema,
  takeProfitNodeDataSchema,
]);

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
}).passthrough();

// React Flow edge structure
const builderEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().nullable().optional(),
  targetHandle: z.string().nullable().optional(),
}).passthrough();

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
    .max(100, "Password must be 100 characters or less"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

// ============================================
// HELPER FUNCTIONS
// ============================================

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
