/**
 * Detect a trading symbol from a backtest file name.
 *
 * Used as a fallback when the MT5 HTML report does not contain a parseable
 * "Symbol" row. The function tries several heuristics in order:
 *
 * 1. Match a known forex pair (e.g. "EURUSD", "XAUUSD", "USDJPY") anywhere
 *    in the filename, with optional broker suffix (e.g. "EURUSD.r", "GBPJPY_i").
 * 2. Match a 6-letter uppercase prefix that looks like a currency pair
 *    (two 3-letter ISO-4217–style codes).
 *
 * Returns the canonical symbol (no suffix) or null if nothing matches.
 */

// Major, minor, and exotic forex pairs + metals + indices
const KNOWN_SYMBOLS = new Set([
  // Majors
  "EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD", "NZDUSD",
  // Crosses
  "EURGBP", "EURJPY", "EURCHF", "EURAUD", "EURCAD", "EURNZD",
  "GBPJPY", "GBPCHF", "GBPAUD", "GBPCAD", "GBPNZD",
  "AUDJPY", "AUDCHF", "AUDCAD", "AUDNZD",
  "NZDJPY", "NZDCHF", "NZDCAD",
  "CADJPY", "CADCHF", "CHFJPY",
  // Metals
  "XAUUSD", "XAGUSD", "XAUEUR",
  // Indices (common CFDs)
  "US30", "US500", "US100", "DE40", "UK100", "JP225", "NAS100",
  // Crypto pairs (common in MT5 brokers)
  "BTCUSD", "ETHUSD", "LTCUSD", "XRPUSD",
  // Oil
  "USOIL", "UKOIL", "XTIUSD", "XBRUSD",
]);

// 3-letter currency codes that commonly appear in forex pairs
const CURRENCY_CODES = new Set([
  "EUR", "USD", "GBP", "JPY", "CHF", "AUD", "CAD", "NZD",
  "SEK", "NOK", "DKK", "PLN", "HUF", "CZK", "ZAR", "TRY",
  "MXN", "SGD", "HKD", "CNH", "CNY", "INR", "THB", "KRW",
  "XAU", "XAG",
]);

/**
 * Attempt to extract a trading symbol from a file name.
 *
 * @param fileName - Original file name (e.g. "EURUSD_H1_backtest.html")
 * @returns The detected symbol (uppercase, no broker suffix) or null
 */
export function extractSymbolFromFileName(fileName: string): string | null {
  // Strip extension and path separators
  const base = fileName
    .replace(/\.[^.]+$/, "")           // remove extension
    .replace(/[/\\]/g, " ")            // path separators → space
    .toUpperCase();

  // Strategy 1: find a known symbol anywhere in the string
  // Accounts for broker suffixes like ".r", "_i", ".ecn"
  for (const sym of KNOWN_SYMBOLS) {
    // Match the symbol followed by a non-alphanumeric char, suffix, or end-of-string
    const regex = new RegExp(`(?:^|[^A-Z0-9])${sym}(?:[._][A-Z0-9]{1,4})?(?:[^A-Z0-9]|$)`);
    if (regex.test(base)) {
      return sym;
    }
  }

  // Strategy 2: find a 6-letter sequence that looks like two currency codes
  const sixLetterMatch = base.match(/(?:^|[^A-Z])([A-Z]{6})(?:[^A-Z]|$)/);
  if (sixLetterMatch) {
    const candidate = sixLetterMatch[1];
    const first = candidate.slice(0, 3);
    const second = candidate.slice(3, 6);
    if (CURRENCY_CODES.has(first) && CURRENCY_CODES.has(second) && first !== second) {
      return candidate;
    }
  }

  return null;
}
