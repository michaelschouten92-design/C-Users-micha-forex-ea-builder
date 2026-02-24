/**
 * Validation schemas and helpers for backtest upload.
 */

import { z } from "zod";
import { MAX_FILE_SIZE, MIN_TABLES_FOR_MT5, MT5_IDENTIFIER } from "../backtest-parser/constants";

/**
 * Max file size for backtest upload (5MB).
 */
export const BACKTEST_MAX_FILE_SIZE = MAX_FILE_SIZE;

/**
 * Quick structural validation: checks if the HTML looks like an MT5 report.
 * Does NOT do full parsing — this is a cheap pre-check to reject obvious non-reports.
 */
export function isLikelyMT5Report(html: string): { valid: boolean; reason?: string } {
  // Check for "Strategy Tester" text
  if (
    !html.includes(MT5_IDENTIFIER) &&
    !html.includes("Тестер стратегий") &&
    !html.includes("Probador de estrategias") &&
    !html.includes("Strategietester") &&
    !html.includes("Testeur de stratégie") &&
    !html.includes("Testador de estratégia")
  ) {
    return { valid: false, reason: "File does not appear to be a Strategy Tester report" };
  }

  // Count <table> tags (case insensitive)
  const tableCount = (html.match(/<table[\s>]/gi) || []).length;
  if (tableCount < MIN_TABLES_FOR_MT5) {
    return {
      valid: false,
      reason: `Expected at least ${MIN_TABLES_FOR_MT5} tables, found ${tableCount}`,
    };
  }

  return { valid: true };
}

/**
 * Zod schema for upload metadata (optional project linkage).
 */
export const backtestUploadSchema = z.object({
  projectId: z.string().cuid().optional().nullable(),
});
