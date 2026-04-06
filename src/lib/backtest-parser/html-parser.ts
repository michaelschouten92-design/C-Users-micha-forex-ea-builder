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

  // Collect all tables. node-html-parser sometimes merges sibling tables into
  // one DOM node when the HTML contains unquoted attributes or <th>/<img> tags
  // (common in MT5 Strategy Tester reports). Fallback: split on </table> and
  // parse each chunk individually to guarantee correct table separation.
  let tables = root.querySelectorAll("table");
  const rawTableCount = (html.match(/<table[\s>]/gi) || []).length;

  if (tables.length < rawTableCount) {
    // Parser merged tables — re-parse each table chunk individually
    const chunks = html.split(/<\/table>/i);
    tables = [];
    for (const chunk of chunks) {
      const tableStart = chunk.indexOf("<table");
      if (tableStart === -1) continue;
      const tableHtml = chunk.substring(tableStart) + "</table>";
      const parsed = parseHTML(tableHtml, { lowerCaseTagName: true });
      const t = parsed.querySelector("table");
      if (t) tables.push(t);
    }
  }
  if (tables.length < 2) {
    warnings.push(`Expected >=2 tables, found ${tables.length}`);
  }

  // ========================================
  // 1. Extract header metadata
  // ========================================
  // Use the first table (metrics/header) for metadata if the original root is corrupted
  const metadataSource = tables.length > 0 ? tables[0] : root;
  const metadata = extractMetadata(metadataSource, warnings);

  // ========================================
  // 2. Detect locale from number samples
  // ========================================
  const numberSamples = collectNumberSamples(root);
  const locale = detectLocale(numberSamples);

  // ========================================
  // 3. Extract metrics from label-value table(s)
  // ========================================
  let metrics = extractMetrics(tables, locale, warnings);

  // ========================================
  // 3b. Sanity check — detect likely locale errors
  // ========================================
  // If parsed values look unrealistic, retry with the alternative locale.
  // A wrong locale typically makes numbers off by a factor of ~1000.
  const effectiveLocale = locale ?? "EN";
  if (metricsLookSuspicious(metrics)) {
    const altLocale = effectiveLocale === "EN" ? "EU" : "EN";
    const altWarnings: string[] = [];
    const altMetrics = extractMetrics(tables, altLocale, altWarnings);

    if (!metricsLookSuspicious(altMetrics)) {
      // Alternative locale produces more realistic values — use it
      metrics = altMetrics;
      // Replace locale-related warnings
      const localeNote = `Locale auto-corrected from ${effectiveLocale} to ${altLocale} (original values were unrealistic).`;
      warnings.push(localeNote);
      // Update the detected locale for downstream use
      metrics._correctedLocale = altLocale;
    }
  }

  // Fill initialDeposit from metrics if found
  if (metadata.initialDeposit === 0 && metrics._initialDeposit !== undefined) {
    metadata.initialDeposit = metrics._initialDeposit;
  }

  // ========================================
  // 4. Extract deals from deals table
  // ========================================
  const finalLocale = (metrics._correctedLocale as NumberLocale | undefined) ?? locale;
  const deals = extractDeals(tables, finalLocale, warnings);

  // ========================================
  // 4a. Derive initialDeposit from first balance deal if still 0
  // ========================================
  if (metadata.initialDeposit === 0 && deals.length > 0) {
    const balanceDeal = deals.find((d) => d.type === "balance" && d.profit > 0);
    if (balanceDeal) {
      metadata.initialDeposit = balanceDeal.profit;
      warnings.push("Initial deposit derived from first balance deal row.");
    }
  }

  // ========================================
  // 4b. Derive symbol from deals if still unknown
  // ========================================
  if (metadata.symbol === "UNKNOWN" && deals.length > 0) {
    const tradingDeals = deals.filter((d) => d.type !== "balance" && d.symbol);
    if (tradingDeals.length > 0) {
      // Use the most common symbol across all deals
      const counts = new Map<string, number>();
      for (const d of tradingDeals) {
        const s = d.symbol!.replace(/[._].*$/, "").toUpperCase();
        counts.set(s, (counts.get(s) ?? 0) + 1);
      }
      let best = "";
      let bestCount = 0;
      for (const [s, c] of counts) {
        if (c > bestCount) {
          best = s;
          bestCount = c;
        }
      }
      if (best) {
        metadata.symbol = best;
        // Remove the "could not detect" warning
        const idx = warnings.findIndex((w) => w.includes("Could not detect symbol"));
        if (idx >= 0) {
          warnings[idx] = `Symbol "${best}" derived from deal rows (not found in report metadata)`;
        }
      }
    }
  }

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

  // ========================================
  // 6. Cross-validate net profit against deal sum
  // ========================================
  if (deals.length > 0 && metrics.totalNetProfit !== 0) {
    // Use only exit deals (profit ≠ 0) to avoid double-counting entry deals in MT5 hedging mode
    const dealSum = deals
      .filter((d) => d.type !== "balance" && d.profit !== 0)
      .reduce((sum, d) => sum + d.profit, 0);
    // Only warn when discrepancy exceeds 1% of the reported value
    if (
      dealSum !== 0 &&
      Math.abs(metrics.totalNetProfit - dealSum) > Math.abs(metrics.totalNetProfit) * 0.01
    ) {
      warnings.push(
        `Net profit discrepancy: metrics table reports ${metrics.totalNetProfit.toFixed(2)} ` +
          `but deal sum is ${dealSum.toFixed(2)}. Deal-derived value used.`
      );
      metrics.totalNetProfit = dealSum;
    }
  }

  // ========================================
  // 7. Fallback metric derivation
  // ========================================

  // Derive profit factor from gross profit/loss if not directly parsed
  if (
    metrics.profitFactor === 0 &&
    (metrics.grossProfit ?? 0) > 0 &&
    (metrics.grossLoss ?? 0) !== 0
  ) {
    metrics.profitFactor = metrics.grossProfit! / Math.abs(metrics.grossLoss!);
    warnings.push("Profit factor derived from gross profit/loss (not from metrics table).");
  }

  // Derive total trades from deals if metrics table didn't have it
  if (metrics.totalTrades === 0 && deals.length > 0) {
    const tradingDeals = deals.filter((d) => d.type !== "balance" && d.profit !== 0);
    if (tradingDeals.length > 0) {
      metrics.totalTrades = tradingDeals.length;
      warnings.push(
        `Total trades derived from deal rows (${tradingDeals.length} exit deals found).`
      );
    }
  }

  // Derive drawdown percentage from absolute value + initial deposit
  if (
    metrics.maxDrawdownPct === 0 &&
    metrics.maxDrawdownAbs != null &&
    metrics.maxDrawdownAbs > 0 &&
    metadata.initialDeposit > 0
  ) {
    metrics.maxDrawdownPct = (metrics.maxDrawdownAbs / metadata.initialDeposit) * 100;
    warnings.push("Drawdown % estimated from absolute drawdown / initial deposit.");
  }

  // Derive win rate from long/short win rates if available
  if (metrics.winRate === 0 && metrics.longWinRate != null && metrics.shortWinRate != null) {
    metrics.winRate = (metrics.longWinRate + metrics.shortWinRate) / 2;
    warnings.push("Win rate derived as average of long and short win rates.");
  }

  // Derive net profit from deals if metrics table had 0
  if (metrics.totalNetProfit === 0 && deals.length > 0) {
    const dealSum = deals
      .filter((d) => d.type !== "balance" && d.profit !== 0)
      .reduce((sum, d) => sum + d.profit, 0);
    if (dealSum !== 0) {
      metrics.totalNetProfit = dealSum;
      warnings.push("Net profit derived from deal rows (not found in metrics table).");
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
    detectedLocale: finalLocale,
    parseWarnings: warnings,
  };
}

// ============================================
// SANITY CHECK — detect locale parsing errors
// ============================================

/**
 * Returns true if the parsed metrics contain values that are unrealistic
 * and likely caused by a wrong locale (EN vs EU).
 *
 * A wrong locale typically makes numbers off by ~1000x:
 * EU "1.234,56" parsed as EN → 1.23456 instead of 1234.56
 * EN "1,234.56" parsed as EU → 1234.56 (accidentally correct in this direction)
 */
function metricsLookSuspicious(m: InternalMetrics): boolean {
  // Profit factor should be between 0.01 and 50 for any realistic strategy
  if (m.profitFactor > 100) return true;

  // Drawdown percentage should be between 0 and 100
  if (m.maxDrawdownPct > 100) return true;

  // Win rate should be between 0 and 100
  if (m.winRate > 100) return true;

  // If initial deposit is suspiciously small (likely decimal misparse)
  if (m._initialDeposit !== undefined && m._initialDeposit > 0 && m._initialDeposit < 1) {
    return true;
  }

  // If both grossProfit and grossLoss exist but profitFactor is wildly off
  if ((m.grossProfit ?? 0) > 0 && m.grossLoss != null && m.grossLoss !== 0) {
    const expectedPF = m.grossProfit! / Math.abs(m.grossLoss);
    if (m.profitFactor > 0 && Math.abs(m.profitFactor - expectedPF) > expectedPF * 5) {
      return true;
    }
  }

  return false;
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

  // Look for the header row pattern: "Symbol", "Period", etc. in table cells.
  // "Expert:" row is the most reliable source for EA name — check it first.
  const allCells = root.querySelectorAll("td");
  for (let i = 0; i < allCells.length; i++) {
    const cellText = allCells[i].text
      .trim()
      .replace(/\s*:\s*$/, "")
      .toLowerCase();
    const nextCell = allCells[i + 1];
    const nextText = nextCell?.text?.trim() || "";

    if (!nextText) continue;

    if (
      cellText === "expert" ||
      cellText === "experte" ||
      cellText === "эксперт" ||
      cellText === "asesor experto" ||
      cellText === "expert advisor" ||
      cellText === "consulente" || // IT
      cellText === "ekspert" || // PL
      cellText === "especialista" || // PT
      cellText === "智能交易" || // ZH
      cellText === "エキスパート" // JA
    ) {
      // EA name from "Expert:" row (most reliable source in MT5 reports)
      metadata.eaName = nextText;
    } else if (
      cellText === "symbol" ||
      cellText === "символ" ||
      cellText === "símbolo" ||
      cellText === "symbole" ||
      cellText === "simbolo" || // IT
      cellText === "品种" || // ZH
      cellText === "シンボル" // JA
    ) {
      // Strip broker suffixes: "EURUSD.r" → "EURUSD", "GBPJPYm" → "GBPJPY", "XAUUSD.ecn" → "XAUUSD"
      metadata.symbol = nextText
        .replace(/[._](r|m|i|raw|ecn|pro|std|micro|mini|c|e|sb|z)\b/i, "")
        .replace(/([A-Z]{6})([a-z]{1,3})$/, "$1") // trailing lowercase suffix like "EURUSDm"
        .trim();
    } else if (
      cellText === "period" ||
      cellText === "zeitraum" ||
      cellText === "período" ||
      cellText === "période" ||
      cellText === "период" || // RU
      cellText === "periodo" || // IT
      cellText === "okres" || // PL
      cellText === "周期" || // ZH
      cellText === "期間" // JA
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

  // Fallback: extract symbol and timeframe from title — e.g. "Strategy Tester: EA (EURUSD,H1)"
  const titleEl = root.querySelector("title");
  if (metadata.symbol === "UNKNOWN" && titleEl) {
    const titleMatch = titleEl.text.trim().match(/\(([A-Za-z0-9._]+)\s*,\s*([A-Za-z0-9]+)\)/);
    if (titleMatch) {
      metadata.symbol = titleMatch[1].replace(/[._].*$/, "").toUpperCase();
      if (metadata.timeframe === "UNKNOWN") {
        metadata.timeframe = titleMatch[2].toUpperCase();
      }
    }
  }

  // Fallback: EA name from <title> if not found in cells
  if (!metadata.eaName) {
    const title = titleEl;
    if (title) {
      const stripped = title.text
        .trim()
        .replace(/Strategy Tester\s*(Report)?:?\s*/i, "")
        .trim();
      // Only use title if it's meaningful (not empty, not generic like "Report" or "Type")
      if (stripped && stripped.length > 3 && !/^(report|type|отчёт)$/i.test(stripped)) {
        metadata.eaName = stripped;
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
    // Exclude date-like strings, time-like strings, and very short numbers
    if (
      /^-?\d[\d\s.,]*\d(%?)$/.test(text) &&
      text.length >= 4 &&
      !/^\d{4}\.\d{2}\.\d{2}/.test(text) &&
      !/^\d{2}\.\d{2}\.\d{4}/.test(text) &&
      !/^\d{2}:\d{2}/.test(text)
    ) {
      samples.push(text);
      if (samples.length >= 40) break; // Collect more samples for better confidence
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
  _correctedLocale?: string;
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

            // Drawdown can be: "1234.56 (12.34%)" or "1 234,56 (12,34 %)" or just "12.34%"
            // Relaxed regex: allows spaces around %, inside parens, and locale-formatted numbers
            const ddMatch = valueText.match(/(-?[\d\s.,]+)\s*\(\s*([\d\s.,]+)\s*%?\s*\)/);
            if (ddMatch) {
              metrics.maxDrawdownAbs = parseLocalizedNumber(ddMatch[1], locale);
              metrics.maxDrawdownPct = parseLocalizedNumber(ddMatch[2], locale);
            } else if (valueText.includes("%")) {
              metrics.maxDrawdownPct = numValue;
            } else if (numValue > 0 && numValue <= 100) {
              // Heuristic: small number without % or parens is likely a percentage
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

    // Find the deals header row. In some MT5 reports, "Orders" and "Deals" are
    // sub-sections within a single table. The deals header (with "Time" + "Profit")
    // may not be the first row — scan all rows to find it.
    let headerRowIdx = -1;
    let headerTexts: string[] = [];

    for (let r = 0; r < rows.length; r++) {
      const cells = rows[r].querySelectorAll("td, th");
      const texts = Array.from(cells).map((c) => c.text.trim().toLowerCase());

      const hasTime = texts.some(
        (h) =>
          h.includes("time") ||
          h.includes("zeit") ||
          h.includes("время") ||
          h.includes("temps") ||
          h.includes("hora") ||
          h.includes("tempo") ||
          h.includes("czas") ||
          h.includes("时间") ||
          h.includes("時間")
      );
      const hasProfit = texts.some(
        (h) =>
          h.includes("profit") ||
          h.includes("lucro") ||
          h.includes("beneficio") ||
          h.includes("gewinn") ||
          h.includes("прибыль") ||
          h.includes("bénéfice") ||
          h.includes("profitto") ||
          h.includes("zysk") ||
          h.includes("利益") ||
          h.includes("利润")
      );

      if (hasTime && hasProfit) {
        headerRowIdx = r;
        headerTexts = texts;
        break;
      }
    }

    if (headerRowIdx === -1) continue;

    // Find column indices (multilingual: EN, DE, ES, RU, FR, PT, IT, PL, ZH, JA)
    const timeIdx = headerTexts.findIndex(
      (h) =>
        h.includes("time") ||
        h.includes("zeit") ||
        h.includes("время") ||
        h.includes("temps") ||
        h.includes("hora") ||
        h.includes("tempo") ||
        h.includes("czas") ||
        h.includes("时间") ||
        h.includes("時間")
    );
    const typeIdx = headerTexts.findIndex(
      (h) =>
        h === "type" || h === "typ" || h === "тип" || h === "tipo" || h === "类型" || h === "タイプ"
    );
    const directionIdx = headerTexts.findIndex(
      (h) =>
        h.includes("direction") ||
        h.includes("richtung") ||
        h.includes("направление") ||
        h.includes("dirección") ||
        h.includes("direção") ||
        h.includes("direzione") ||
        h.includes("kierunek") ||
        h.includes("方向")
    );
    const volumeIdx = headerTexts.findIndex(
      (h) =>
        h.includes("volume") ||
        h.includes("volumen") ||
        h.includes("объём") ||
        h.includes("lot") ||
        h === "size" ||
        h === "größe" ||
        h === "tamaño" ||
        h.includes("objętość") ||
        h.includes("成交量")
    );
    const priceIdx = headerTexts.findIndex(
      (h) =>
        h === "price" ||
        h === "preis" ||
        h === "precio" ||
        h === "цена" ||
        h === "prix" ||
        h === "preço" ||
        h === "prezzo" ||
        h === "cena" ||
        h === "价格" ||
        h === "価格"
    );
    const profitIdx = headerTexts.findIndex(
      (h) =>
        h.includes("profit") ||
        h.includes("lucro") ||
        h.includes("beneficio") ||
        h.includes("gewinn") ||
        h.includes("прибыль") ||
        h.includes("bénéfice") ||
        h.includes("profitto") ||
        h.includes("zysk") ||
        h.includes("利益") ||
        h.includes("利润")
    );
    const symbolIdx = headerTexts.findIndex(
      (h) =>
        h === "symbol" ||
        h === "символ" ||
        h === "símbolo" ||
        h === "symbole" ||
        h === "simbolo" ||
        h === "品种" ||
        h === "シンボル"
    );
    const commentIdx = headerTexts.findIndex(
      (h) =>
        h.includes("comment") ||
        h.includes("kommentar") ||
        h.includes("комментарий") ||
        h.includes("commentaire") ||
        h.includes("comentario") ||
        h.includes("comentário") ||
        h.includes("commento") ||
        h.includes("komentarz") ||
        h.includes("注释") ||
        h.includes("コメント")
    );

    // Parse data rows (skip header)
    for (let r = headerRowIdx + 1; r < rows.length; r++) {
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
      const dealSymbol = symbolIdx >= 0 ? cellTexts[symbolIdx] || undefined : undefined;
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
        symbol: dealSymbol,
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
