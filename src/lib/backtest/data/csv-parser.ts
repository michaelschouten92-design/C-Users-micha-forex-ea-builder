/**
 * CSV OHLCV parser with auto-detection of delimiter, date format, and column order.
 * Supports common formats from MetaTrader, TradingView, and generic CSV exports.
 */

import type { OHLCVBar } from "../types";

export interface CSVParseResult {
  bars: OHLCVBar[];
  warnings: string[];
  detectedFormat: string;
}

const DELIMITERS = [",", "\t", ";"];

/**
 * Try to parse a date string into a Unix timestamp (ms).
 * Supports multiple formats common in trading data exports.
 */
function parseDate(str: string): number | null {
  const s = str.trim().replace(/"/g, "");

  // ISO 8601: 2024-01-15T08:30:00
  // Standard: 2024-01-15 08:30:00
  // MT5: 2024.01.15 08:30:00
  // MT4: 2024.01.15,08:30
  // US: 01/15/2024 08:30:00
  // EU: 15/01/2024 08:30:00
  // Unix timestamp (seconds)
  // Unix timestamp (milliseconds)

  // Try unix timestamp first (pure number)
  if (/^\d{10,13}$/.test(s)) {
    const n = parseInt(s, 10);
    return n > 1e12 ? n : n * 1000;
  }

  // Normalize separators
  const normalized = s
    .replace(/\./g, "-") // 2024.01.15 → 2024-01-15
    .replace(/\//g, "-") // 01/15/2024 → 01-15-2024
    .replace(/T/, " "); // ISO T separator

  // Try standard parse
  const d = new Date(normalized);
  if (!isNaN(d.getTime())) return d.getTime();

  // Try DD-MM-YYYY format (EU style)
  const euMatch = normalized.match(/^(\d{1,2})-(\d{1,2})-(\d{4})\s*(.*)?$/);
  if (euMatch) {
    const [, dd, mm, yyyy, time] = euMatch;
    const d2 = new Date(
      `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")} ${time || "00:00:00"}`
    );
    if (!isNaN(d2.getTime())) return d2.getTime();
  }

  return null;
}

/**
 * Detect column indices from the header row.
 */
function detectColumns(headers: string[]): {
  date: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
} | null {
  const lower = headers.map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));

  const dateIdx = lower.findIndex((h) =>
    ["date", "time", "datetime", "date time", "timestamp", "<date>", "<time>"].includes(h)
  );
  // Some formats have separate date and time columns - combine if needed
  const timeIdx =
    dateIdx >= 0 ? lower.findIndex((h, i) => i !== dateIdx && ["time", "<time>"].includes(h)) : -1;

  const openIdx = lower.findIndex((h) => ["open", "o", "<open>"].includes(h));
  const highIdx = lower.findIndex((h) => ["high", "h", "<high>"].includes(h));
  const lowIdx = lower.findIndex((h) => ["low", "l", "<low>"].includes(h));
  const closeIdx = lower.findIndex((h) => ["close", "c", "<close>"].includes(h));
  const volumeIdx = lower.findIndex((h) =>
    ["volume", "vol", "v", "<vol>", "<tickvol>", "tick_volume", "tickvol"].includes(h)
  );

  if (openIdx < 0 || highIdx < 0 || lowIdx < 0 || closeIdx < 0) return null;

  return {
    date: dateIdx >= 0 ? dateIdx : -1,
    open: openIdx,
    high: highIdx,
    low: lowIdx,
    close: closeIdx,
    volume: volumeIdx >= 0 ? volumeIdx : -1,
  };
}

/**
 * Detect the delimiter used in the CSV content.
 */
function detectDelimiter(firstLine: string): string {
  let best = ",";
  let bestCount = 0;
  for (const d of DELIMITERS) {
    const count = firstLine.split(d).length;
    if (count > bestCount) {
      bestCount = count;
      best = d;
    }
  }
  return best;
}

/**
 * Parse CSV text content into OHLCV bars.
 */
export function parseCSV(content: string): CSVParseResult {
  const warnings: string[] = [];
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    return { bars: [], warnings: ["File is empty or has no data rows"], detectedFormat: "unknown" };
  }

  const delimiter = detectDelimiter(lines[0]);

  // Check if first row is a header
  const firstRow = lines[0].split(delimiter);
  const cols = detectColumns(firstRow);
  const hasHeader = cols !== null;

  let columnMap: ReturnType<typeof detectColumns>;
  let dataStartIdx: number;

  if (hasHeader && cols) {
    columnMap = cols;
    dataStartIdx = 1;
  } else {
    // No header: assume Date,Open,High,Low,Close,Volume or Open,High,Low,Close,Volume
    const numCols = firstRow.length;
    if (numCols >= 6) {
      columnMap = { date: 0, open: 1, high: 2, low: 3, close: 4, volume: 5 };
    } else if (numCols >= 5) {
      // Try to detect if first column is a date
      const firstVal = firstRow[0].trim();
      if (parseDate(firstVal) !== null) {
        columnMap = { date: 0, open: 1, high: 2, low: 3, close: 4, volume: -1 };
      } else {
        columnMap = { date: -1, open: 0, high: 1, low: 2, close: 3, volume: 4 };
      }
    } else {
      columnMap = { date: -1, open: 0, high: 1, low: 2, close: 3, volume: -1 };
    }
    dataStartIdx = 0;
  }

  // Check for separate date+time columns
  const lowerHeaders = hasHeader
    ? firstRow.map((h) => h.trim().toLowerCase().replace(/['"]/g, ""))
    : [];
  const separateTime = hasHeader
    ? lowerHeaders.findIndex((h, i) => i !== columnMap!.date && ["time", "<time>"].includes(h))
    : -1;

  const bars: OHLCVBar[] = [];
  let skipped = 0;

  for (let i = dataStartIdx; i < lines.length; i++) {
    const cells = lines[i].split(delimiter);
    if (cells.length < 4) {
      skipped++;
      continue;
    }

    const open = parseFloat(cells[columnMap!.open]?.trim());
    const high = parseFloat(cells[columnMap!.high]?.trim());
    const low = parseFloat(cells[columnMap!.low]?.trim());
    const close = parseFloat(cells[columnMap!.close]?.trim());
    const volume = columnMap!.volume >= 0 ? parseFloat(cells[columnMap!.volume]?.trim()) || 0 : 0;

    if (isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close)) {
      skipped++;
      continue;
    }

    let time: number;
    if (columnMap!.date >= 0) {
      let dateStr = cells[columnMap!.date]?.trim() ?? "";
      // Merge separate time column if present
      if (separateTime >= 0 && cells[separateTime]) {
        dateStr += " " + cells[separateTime].trim();
      }
      const parsed = parseDate(dateStr);
      if (parsed === null) {
        // If we can't parse date, use sequential timestamps (M1 intervals)
        time = (bars.length > 0 ? bars[bars.length - 1].time : 0) + 60000;
      } else {
        time = parsed;
      }
    } else {
      // No date column - generate sequential timestamps
      time = 946684800000 + bars.length * 60000; // Start from 2000-01-01
    }

    bars.push({ time, open, high, low, close, volume });
  }

  if (skipped > 0) {
    warnings.push(`Skipped ${skipped} malformed rows`);
  }

  if (bars.length === 0) {
    warnings.push("No valid OHLCV bars could be parsed from the file");
  }

  // Ensure chronological order
  bars.sort((a, b) => a.time - b.time);

  // Check for duplicates
  let dupes = 0;
  for (let i = bars.length - 1; i > 0; i--) {
    if (bars[i].time === bars[i - 1].time) {
      bars.splice(i, 1);
      dupes++;
    }
  }
  if (dupes > 0) {
    warnings.push(`Removed ${dupes} duplicate timestamps`);
  }

  if (bars.length > 500000) {
    warnings.push(`Large dataset: ${bars.length} bars. Performance may be affected.`);
  }

  const format = `${delimiter === "\t" ? "TSV" : "CSV"}, ${hasHeader ? "with header" : "no header"}, ${bars.length} bars`;

  return { bars, warnings, detectedFormat: format };
}
