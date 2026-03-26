/**
 * Backtest Parser — barrel export.
 */

export { parseMT5Report } from "./html-parser";
export { computeHealthScore } from "./health-scorer";
export { detectLocale, parseLocalizedNumber } from "./locale-detector";
export { lookupMetricKey } from "./metric-labels";
export { extractSymbolFromFileName } from "./symbol-detector";
export {
  SCORE_WEIGHTS,
  MAX_FILE_SIZE,
  MIN_TABLES_FOR_MT5,
  MT5_IDENTIFIER,
  STRATEGY_TESTER_IDENTIFIERS,
} from "./constants";

export type {
  ParsedReport,
  ParsedMetadata,
  ParsedMetrics,
  ParsedDeal,
  HealthScoreResult,
  HealthScoreBreakdown,
} from "./types";
