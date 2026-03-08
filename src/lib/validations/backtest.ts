/**
 * Validation schemas and helpers for backtest upload.
 */

import { z } from "zod";
import {
  MAX_FILE_SIZE,
  MIN_TABLES_FOR_MT5,
  STRATEGY_TESTER_IDENTIFIERS,
} from "../backtest-parser/constants";

/**
 * Max file size for backtest upload (5MB).
 */
export const BACKTEST_MAX_FILE_SIZE = MAX_FILE_SIZE;

/**
 * Quick structural validation: checks if the HTML looks like an MT4/MT5 report.
 * Does NOT do full parsing — this is a cheap pre-check to reject obvious non-reports.
 *
 * - Case-insensitive identifier matching across 11 languages
 * - Strips UTF-8 BOM before checking
 * - Requires at least 1 <table> tag (MT4 reports use a single table)
 */
export function isLikelyMT5Report(html: string): { valid: boolean; reason?: string } {
  // Strip UTF-8 BOM if present
  const cleaned = html.charCodeAt(0) === 0xfeff ? html.slice(1) : html;
  const lower = cleaned.toLowerCase();

  // Check for any known Strategy Tester identifier (all entries are already lowercase)
  const hasIdentifier = STRATEGY_TESTER_IDENTIFIERS.some((id) => lower.includes(id));
  if (!hasIdentifier) {
    return { valid: false, reason: "File does not appear to be a Strategy Tester report" };
  }

  // Count <table> tags — MT4 reports may have only 1 large table
  const tableCount = (cleaned.match(/<table[\s\r\n>]/gi) || []).length;
  if (tableCount < MIN_TABLES_FOR_MT5) {
    return {
      valid: false,
      reason: `Expected at least ${MIN_TABLES_FOR_MT5} table(s), found ${tableCount}`,
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
