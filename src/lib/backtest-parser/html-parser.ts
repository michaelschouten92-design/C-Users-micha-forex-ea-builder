/**
 * Core MT5 Strategy Tester HTML report parser.
 *
 * Pure function — no side effects, no DB calls.
 * Uses node-html-parser for fast, lightweight parsing.
 *
 * MT5 reports have a consistent structure:
 * 1. A header section with EA name, symbol, timeframe, period
 * 2. A metrics table with label-value rows (Total Net Profit, Profit Factor, etc.)
 * 3. A deals/orders table with 13-column rows (ticket, time, type, volume, price, etc.)
 */

import { parse as parseHTML, HTMLElement } from "node-html-parser";
import { lookupMetricKey } from "./metric-labels";
import { detectLocale, parseLocalizedNumber, type NumberLocale } from "./locale-detector";
import type { ParsedReport, ParsedMetadata, ParsedMetrics, ParsedDeal } from "./types";

/**
 * Parse an MT5 Strategy Tester HTML report.
 * Returns a structured ParsedReport with metadata, metrics, deals, and warnings.
 */
export function parseMT5Report(html: string): ParsedReport {
  const warnings: string[] = [];
  const root = parseHTML(html, { lowerCaseTagName: true });

  // Collect all tables
  const tables = root.querySelectorAll("table");
  if (tables.length < 2) {
    warnings.push(`Expected >=2 tables, found ${tables.length}`);
  }

  // ========================================
  // 1. Extract header metadata
  // ========================================
  const metadata = extractMetadata(root, warnings);

  // ========================================
  // 2. Detect locale from number samples
  // ========================================
  const numberSamples = collectNumberSamples(root);
  const locale = detectLocale(numberSamples);

  // ========================================
  // 3. Extract metrics from label-value table(s)
  // ========================================
  const metrics = extractMetrics(tables, locale, warnings);

  // Fill initialDeposit from metrics if found
  if (metadata.initialDeposit === 0 && metrics._initialDeposit !== undefined) {
    metadata.initialDeposit = metrics._initialDeposit;
  }

  // ========================================
  // 4. Extract deals from deals table
  // ========================================
  const deals = extractDeals(tables, locale, warnings);

  // ========================================
  // 5. Derive win rate if not parsed directly
  // ========================================
  if (metrics.winRate === 0 && metrics.totalTrades > 0 && deals.length > 0) {
    // Use only exit deals (profit ≠ 0) as a heuristic for completed trades.
    // Entry deals in MT5 hedging mode have profit=0 and would inflate the denominator.
    const exitDeals = deals.filter((d) => d.type !== "balance" && d.profit !== 0);
    if (exitDeals.length > 0) {
      const profitableExits = exitDeals.filter((d) => d.profit > 0);
      metrics.winRate = (profitableExits.length / exitDeals.length) * 100;
      warnings.push(
        "Win rate derived from deal exit rows (not from metrics table). " +
          "May be inaccurate for strategies with partial closes."
      );
    }
  }

  return {
    metadata,
    metrics: {
      totalNetProfit: metrics.totalNetProfit,
      profitFactor: metrics.profitFactor,
      maxDrawdownPct: metrics.maxDrawdownPct,
      maxDrawdownAbs: metrics.maxDrawdownAbs,
      sharpeRatio: metrics.sharpeRatio,
      recoveryFactor: metrics.recoveryFactor,
      expectedPayoff: metrics.expectedPayoff,
      totalTrades: metrics.totalTrades,
      winRate: metrics.winRate,
      longWinRate: metrics.longWinRate,
      shortWinRate: metrics.shortWinRate,
      grossProfit: metrics.grossProfit,
      grossLoss: metrics.grossLoss,
      largestProfitTrade: metrics.largestProfitTrade,
      largestLossTrade: metrics.largestLossTrade,
      avgProfitTrade: metrics.avgProfitTrade,
      avgLossTrade: metrics.avgLossTrade,
      maxConsecutiveWins: metrics.maxConsecutiveWins,
      maxConsecutiveLosses: metrics.maxConsecutiveLosses,
    },
    deals,
    detectedLocale: locale,
    parseWarnings: warnings,
  };
}

// ============================================
// METADATA EXTRACTION
// ============================================

function extractMetadata(root: HTMLElement, warnings: string[]): ParsedMetadata {
  const metadata: ParsedMetadata = {
    eaName: null,
    symbol: "UNKNOWN",
    timeframe: "UNKNOWN",
    period: "UNKNOWN",
    initialDeposit: 0,
  };

  // MT5 reports typically have the EA name in a bold/title element near the top.
  // The structure is often: first <b> or <title> text, then symbol/timeframe in a row.

  // Try title element first
  const title = root.querySelector("title");
  if (title) {
    const titleText = title.text.trim();
    if (titleText && titleText !== "Strategy Tester") {
      metadata.eaName = titleText.replace(/Strategy Tester:?\s*/i, "").trim() || null;
    }
  }

  // Look for the header row pattern: "Symbol", "Period", etc. in table cells
  const allCells = root.querySelectorAll("td");
  for (let i = 0; i < allCells.length; i++) {
    const cellText = allCells[i].text.trim().toLowerCase();
    const nextCell = allCells[i + 1];
    const nextText = nextCell?.text?.trim() || "";

    if (!nextText) continue;

    if (
      cellText === "symbol" ||
      cellText === "символ" ||
      cellText === "símbolo" ||
      cellText === "symbole"
    ) {
      metadata.symbol = nextText;
    } else if (
      cellText === "period" ||
      cellText === "zeitraum" ||
      cellText === "período" ||
      cellText === "période"
    ) {
      // Period often includes timeframe: "H1 (2020.01.01 - 2023.12.31)"
      const periodMatch = nextText.match(/^(\w+)\s*\((.+)\)$/);
      if (periodMatch) {
        metadata.timeframe = periodMatch[1];
        metadata.period = periodMatch[2].trim();
      } else {
        metadata.period = nextText;
        // Try to extract timeframe from separate row
        const tfMatch = nextText.match(/^(M1|M5|M15|M30|H1|H4|D1|W1|MN1?)\b/i);
        if (tfMatch) {
          metadata.timeframe = tfMatch[1].toUpperCase();
        }
      }
    } else if (
      cellText === "broker" ||
      cellText === "makler" ||
      cellText === "брокер" ||
      cellText === "courtier"
    ) {
      metadata.broker = nextText;
    } else if (
      cellText === "currency" ||
      cellText === "währung" ||
      cellText === "moneda" ||
      cellText === "devise"
    ) {
      metadata.currency = nextText;
    } else if (
      cellText === "leverage" ||
      cellText === "hebel" ||
      cellText === "apalancamiento" ||
      cellText === "кредитное плечо"
    ) {
      metadata.leverage = nextText;
    }
  }

  // Try to find EA name from first bold text if not in title
  if (!metadata.eaName) {
    const boldElements = root.querySelectorAll("b");
    for (const b of boldElements) {
      const text = b.text.trim();
      if (text && text.length > 2 && text.length < 200 && !text.includes("<")) {
        metadata.eaName = text;
        break;
      }
    }
  }

  if (metadata.symbol === "UNKNOWN") {
    warnings.push("Could not detect symbol from report");
  }

  return metadata;
}

// ============================================
// NUMBER SAMPLE COLLECTION (for locale detection)
// ============================================

function collectNumberSamples(root: HTMLElement): string[] {
  const samples: string[] = [];
  const cells = root.querySelectorAll("td");

  for (const cell of cells) {
    const text = cell.text.trim();
    // Look for numeric-looking values (contains digits and potential separators)
    // Exclude date-like strings (YYYY.MM.DD, DD.MM.YYYY, etc.) that confuse locale detection
    if (
      /^-?\d[\d\s.,]*\d?(%?)$/.test(text) &&
      text.length >= 3 &&
      !/^\d{4}\.\d{2}\.\d{2}/.test(text) &&
      !/^\d{2}\.\d{2}\.\d{4}/.test(text)
    ) {
      samples.push(text);
      if (samples.length >= 20) break; // Enough samples
    }
  }

  return samples;
}

// ============================================
// METRICS EXTRACTION
// ============================================

interface InternalMetrics extends ParsedMetrics {
  _initialDeposit?: number;
  _hasEquityDrawdown?: boolean;
}

function extractMetrics(
  tables: HTMLElement[],
  locale: NumberLocale | null,
  warnings: string[]
): InternalMetrics {
  const metrics: InternalMetrics = {
    totalNetProfit: 0,
    profitFactor: 0,
    maxDrawdownPct: 0,
    maxDrawdownAbs: null,
    sharpeRatio: null,
    recoveryFactor: null,
    expectedPayoff: 0,
    totalTrades: 0,
    winRate: 0,
    longWinRate: null,
    shortWinRate: null,
  };

  // Scan all tables for label-value pairs
  for (const table of tables) {
    const rows = table.querySelectorAll("tr");

    for (const row of rows) {
      const cells = row.querySelectorAll("td");
      if (cells.length < 2) continue;

      // Try each pair of adjacent cells as label-value
      for (let i = 0; i < cells.length - 1; i++) {
        const label = cells[i].text.trim();
        const valueText = cells[i + 1].text.trim();

        if (!label || !valueText) continue;

        const metricKey = lookupMetricKey(label);
        if (!metricKey) continue;

        const rawValue = parseLocalizedNumber(valueText, locale);
        const numValue = isNaN(rawValue) ? 0 : rawValue;

        switch (metricKey) {
          case "totalNetProfit":
            metrics.totalNetProfit = numValue;
            break;
          case "grossProfit":
            metrics.grossProfit = numValue;
            break;
          case "grossLoss":
            metrics.grossLoss = numValue;
            break;
          case "profitFactor":
            metrics.profitFactor = numValue;
            break;
          case "expectedPayoff":
            metrics.expectedPayoff = numValue;
            break;
          case "sharpeRatio":
            metrics.sharpeRatio = numValue;
            break;
          case "recoveryFactor":
            metrics.recoveryFactor = numValue;
            break;
          case "totalTrades":
            metrics.totalTrades = Math.round(numValue);
            break;
          case "maxDrawdown": {
            // Prefer equity drawdown over balance drawdown. MT5 reports
            // can have both rows. We check the label text for "equity" to
            // determine priority: if we already captured an equity value,
            // skip any subsequent balance-only match.
            const isEquityRow = label.toLowerCase().includes("equity");
            const isBalanceRow = label.toLowerCase().includes("balance");
            const alreadyHasEquity = metrics._hasEquityDrawdown === true;

            // Skip balance row if we already have equity data
            if (isBalanceRow && !isEquityRow && alreadyHasEquity) {
              break;
            }

            // Drawdown can be: "1234.56 (12.34%)" or just "12.34%"
            const ddMatch = valueText.match(/([\d\s.,]+)\s*\(([\d\s.,]+)%?\)/);
            if (ddMatch) {
              metrics.maxDrawdownAbs = parseLocalizedNumber(ddMatch[1], locale);
              metrics.maxDrawdownPct = parseLocalizedNumber(ddMatch[2], locale);
            } else if (valueText.includes("%")) {
              metrics.maxDrawdownPct = numValue;
            } else {
              metrics.maxDrawdownAbs = numValue;
            }

            if (isEquityRow) {
              metrics._hasEquityDrawdown = true;
            }
            break;
          }
          case "shortPositionsWon": {
            // Format: "123 (45.67%)"
            const match = valueText.match(/\(([\d\s.,]+)%?\)/);
            if (match) {
              metrics.shortWinRate = parseLocalizedNumber(match[1], locale);
            }
            break;
          }
          case "longPositionsWon": {
            const match = valueText.match(/\(([\d\s.,]+)%?\)/);
            if (match) {
              metrics.longWinRate = parseLocalizedNumber(match[1], locale);
            }
            break;
          }
          case "profitTradesPercent": {
            // Format: "123 (45.67%)" — extract the percentage as overall win rate
            const match = valueText.match(/\(([\d\s.,]+)%?\)/);
            if (match) {
              metrics.winRate = parseLocalizedNumber(match[1], locale);
            } else {
              metrics.winRate = numValue;
            }
            break;
          }
          case "initialDeposit":
            metrics._initialDeposit = numValue;
            break;
          case "largestProfitTrade":
            metrics.largestProfitTrade = numValue;
            break;
          case "largestLossTrade":
            metrics.largestLossTrade = numValue;
            break;
          case "avgProfitTrade":
            metrics.avgProfitTrade = numValue;
            break;
          case "avgLossTrade":
            metrics.avgLossTrade = numValue;
            break;
          case "maxConsecutiveWins":
            metrics.maxConsecutiveWins = Math.round(numValue);
            break;
          case "maxConsecutiveLosses":
            metrics.maxConsecutiveLosses = Math.round(numValue);
            break;
        }
      }
    }
  }

  if (metrics.totalTrades === 0) {
    warnings.push("Could not extract total trades from report");
  }
  if (metrics.profitFactor === 0) {
    warnings.push("Could not extract profit factor from report");
  }

  return metrics;
}

// ============================================
// DEALS EXTRACTION
// ============================================

function extractDeals(
  tables: HTMLElement[],
  locale: NumberLocale | null,
  warnings: string[]
): ParsedDeal[] {
  const deals: ParsedDeal[] = [];

  // The deals table in MT5 reports has rows with >=10 columns.
  // Headers typically: #, Time, Type, Direction, Volume, Price, Order, Commission, Fee, Swap, Profit, Balance, Comment
  // We look for the table that contains a header row with "Time" and "Profit"

  for (const table of tables) {
    const rows = table.querySelectorAll("tr");
    if (rows.length < 3) continue;

    // Check if this table has a deals-like header
    const headerRow = rows[0];
    const headerCells = headerRow.querySelectorAll("td, th");
    const headerTexts = Array.from(headerCells).map((c) => c.text.trim().toLowerCase());

    const hasTime = headerTexts.some(
      (h) => h.includes("time") || h.includes("zeit") || h.includes("время") || h.includes("temps")
    );
    const hasProfit = headerTexts.some(
      (h) =>
        h.includes("profit") ||
        h.includes("gewinn") ||
        h.includes("прибыль") ||
        h.includes("bénéfice")
    );

    if (!hasTime || !hasProfit) continue;

    // Find column indices
    const timeIdx = headerTexts.findIndex(
      (h) => h.includes("time") || h.includes("zeit") || h.includes("время") || h.includes("temps")
    );
    const typeIdx = headerTexts.findIndex(
      (h) => h === "type" || h === "typ" || h === "тип" || h === "tipo"
    );
    const directionIdx = headerTexts.findIndex(
      (h) => h.includes("direction") || h.includes("richtung") || h.includes("направление")
    );
    const volumeIdx = headerTexts.findIndex(
      (h) =>
        h.includes("volume") || h.includes("volumen") || h.includes("объём") || h.includes("lot")
    );
    const priceIdx = headerTexts.findIndex(
      (h) => h === "price" || h === "preis" || h === "precio" || h === "цена" || h === "prix"
    );
    const profitIdx = headerTexts.findIndex(
      (h) =>
        h.includes("profit") ||
        h.includes("gewinn") ||
        h.includes("прибыль") ||
        h.includes("bénéfice")
    );
    const commentIdx = headerTexts.findIndex(
      (h) =>
        h.includes("comment") ||
        h.includes("kommentar") ||
        h.includes("комментарий") ||
        h.includes("commentaire")
    );

    // Parse data rows (skip header)
    for (let r = 1; r < rows.length; r++) {
      const cells = rows[r].querySelectorAll("td");
      if (cells.length < 6) continue;

      const cellTexts = Array.from(cells).map((c) => c.text.trim());

      // Skip summary/total rows
      const firstCell = cellTexts[0].toLowerCase();
      if (
        firstCell === "" ||
        firstCell.includes("total") ||
        firstCell.includes("итого") ||
        firstCell.includes("gesamt")
      ) {
        continue;
      }

      // Extract ticket number from first column
      const ticket = parseInt(cellTexts[0], 10);
      if (isNaN(ticket)) continue;

      // Normalize MT5 dot-format timestamps to ISO-like format for reliable Date parsing.
      // MT5 format: "2023.01.15 14:30:00" → "2023-01-15T14:30:00"
      const rawTime = timeIdx >= 0 ? cellTexts[timeIdx] : "";
      const time = rawTime.replace(/^(\d{4})\.(\d{2})\.(\d{2})\s/, "$1-$2-$3T");
      const typeText = typeIdx >= 0 ? cellTexts[typeIdx].toLowerCase() : "";
      const direction = directionIdx >= 0 ? cellTexts[directionIdx].toLowerCase() : "";
      const volume = volumeIdx >= 0 ? parseLocalizedNumber(cellTexts[volumeIdx], locale) || 0 : 0;
      const price = priceIdx >= 0 ? parseLocalizedNumber(cellTexts[priceIdx], locale) || 0 : 0;
      const profit = profitIdx >= 0 ? parseLocalizedNumber(cellTexts[profitIdx], locale) || 0 : 0;
      const comment = commentIdx >= 0 ? cellTexts[commentIdx] : undefined;

      // Determine deal type
      let dealType = "balance";
      if (typeText.includes("buy") || direction.includes("buy") || typeText.includes("kauf")) {
        dealType = "buy";
      } else if (
        typeText.includes("sell") ||
        direction.includes("sell") ||
        typeText.includes("verkauf")
      ) {
        dealType = "sell";
      }

      deals.push({
        ticket,
        openTime: time,
        type: dealType,
        volume,
        price,
        profit,
        comment: comment || undefined,
      });
    }

    // Found deals table, no need to check other tables
    if (deals.length > 0) break;
  }

  if (deals.length === 0) {
    warnings.push("No deals extracted from report");
  }

  return deals;
}
