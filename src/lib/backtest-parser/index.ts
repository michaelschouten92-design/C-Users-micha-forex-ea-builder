/**
 * Backtest Parser — barrel export.
 */

export { parseMT5Report } from "./html-parser";
export { computeHealthScore } from "./health-scorer";
export { detectLocale, parseLocalizedNumber } from "./locale-detector";
export { lookupMetricKey } from "./metric-labels";
export { SCORE_WEIGHTS, MAX_FILE_SIZE, MIN_TABLES_FOR_MT5, MT5_IDENTIFIER } from "./constants";

export type {
  ParsedReport,
  ParsedMetadata,
  ParsedMetrics,
  ParsedDeal,
  HealthScoreResult,
  HealthScoreBreakdown,
} from "./types";
