/**
 * Deterministic CSV → ParsedDeal[] parser.
 *
 * Expected CSV header (case-insensitive, order-independent):
 *   ticket,openTime,type,volume,price,profit
 *
 * Optional columns:
 *   sl,tp,symbol,comment
 *
 * Rules:
 *   - Decimal separator must be "." (no locale-dependent commas)
 *   - Timestamps must be ISO 8601 or "YYYY-MM-DD HH:mm:ss"
 *   - No NaN/Infinity values
 *   - Unknown headers are rejected (fail-closed)
 *   - Empty required cells are rejected (fail-closed)
 *   - Balance-type rows are included as-is (filtered downstream by ingest-facts)
 */

import type { ParsedDeal } from "@/lib/backtest-parser/types";

export class CsvParseError extends Error {
  constructor(
    message: string,
    public readonly line: number | null,
    public readonly details: string[]
  ) {
    super(message);
    this.name = "CsvParseError";
  }
}

const REQUIRED_HEADERS = new Set(["ticket", "opentime", "type", "volume", "price", "profit"]);
const OPTIONAL_HEADERS = new Set(["sl", "tp", "symbol", "comment"]);
const ALL_HEADERS = new Set([...REQUIRED_HEADERS, ...OPTIONAL_HEADERS]);

/**
 * Parse a strict number from a CSV cell.
 * Rejects NaN, Infinity, and empty strings.
 */
function parseStrictNumber(value: string, field: string, line: number): number {
  const trimmed = value.trim();
  if (trimmed === "") {
    throw new CsvParseError(`Empty required field "${field}"`, line, [
      `line ${line}: "${field}" is empty`,
    ]);
  }
  const num = Number(trimmed);
  if (!Number.isFinite(num)) {
    throw new CsvParseError(`Invalid number in "${field}": "${trimmed}"`, line, [
      `line ${line}: "${field}" value "${trimmed}" is not a finite number`,
    ]);
  }
  return num;
}

/**
 * Parse an optional number from a CSV cell.
 * Returns undefined if cell is empty.
 */
function parseOptionalNumber(
  value: string | undefined,
  field: string,
  line: number
): number | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  return parseStrictNumber(value, field, line);
}

/**
 * Parse and validate a timestamp string.
 * Accepts ISO 8601 or "YYYY-MM-DD HH:mm:ss".
 */
function parseTimestamp(value: string, line: number): string {
  const trimmed = value.trim();
  if (trimmed === "") {
    throw new CsvParseError('Empty required field "openTime"', line, [
      `line ${line}: "openTime" is empty`,
    ]);
  }
  const date = new Date(trimmed);
  if (isNaN(date.getTime())) {
    throw new CsvParseError(`Invalid timestamp: "${trimmed}"`, line, [
      `line ${line}: "openTime" value "${trimmed}" does not parse to a valid date`,
    ]);
  }
  return date.toISOString();
}

/**
 * Split a CSV line respecting quoted fields.
 * Handles: "field with, comma","another field"
 */
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

/**
 * Parse a raw CSV string into ParsedDeal[].
 * Deterministic: same input always produces same output.
 * Fail-closed: any parse error rejects the entire batch.
 */
export function parseCsvDeals(csv: string): ParsedDeal[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim() !== "");

  if (lines.length === 0) {
    throw new CsvParseError("CSV is empty", null, ["no data rows found"]);
  }

  // Parse and validate header
  const rawHeaders = splitCsvLine(lines[0]).map((h) => h.trim());
  const normalizedHeaders = rawHeaders.map((h) => h.toLowerCase());

  // Check for unknown headers
  const unknownHeaders = normalizedHeaders.filter((h) => !ALL_HEADERS.has(h));
  if (unknownHeaders.length > 0) {
    throw new CsvParseError(
      `Unknown CSV headers: ${unknownHeaders.join(", ")}`,
      1,
      unknownHeaders.map((h) => `unknown header "${h}"`)
    );
  }

  // Check for required headers
  const missingHeaders = [...REQUIRED_HEADERS].filter((h) => !normalizedHeaders.includes(h));
  if (missingHeaders.length > 0) {
    throw new CsvParseError(
      `Missing required CSV headers: ${missingHeaders.join(", ")}`,
      1,
      missingHeaders.map((h) => `missing required header "${h}"`)
    );
  }

  // Check for duplicate headers
  const seen = new Set<string>();
  for (const h of normalizedHeaders) {
    if (seen.has(h)) {
      throw new CsvParseError(`Duplicate CSV header: "${h}"`, 1, [`duplicate header "${h}"`]);
    }
    seen.add(h);
  }

  // Build column index map
  const colIndex = new Map<string, number>();
  for (let i = 0; i < normalizedHeaders.length; i++) {
    colIndex.set(normalizedHeaders[i], i);
  }

  if (lines.length < 2) {
    throw new CsvParseError("CSV has header but no data rows", null, ["no data rows found"]);
  }

  // Parse data rows
  const deals: ParsedDeal[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const lineNum = i + 1; // 1-indexed, header is line 1
    const fields = splitCsvLine(lines[i]);

    if (fields.length !== normalizedHeaders.length) {
      errors.push(
        `line ${lineNum}: expected ${normalizedHeaders.length} columns, got ${fields.length}`
      );
      continue;
    }

    try {
      const get = (col: string): string => fields[colIndex.get(col)!];
      const getOpt = (col: string): string | undefined => {
        const idx = colIndex.get(col);
        return idx !== undefined ? fields[idx] : undefined;
      };

      const typeRaw = get("type").trim().toLowerCase();
      if (typeRaw === "") {
        errors.push(`line ${lineNum}: "type" is empty`);
        continue;
      }

      const deal: ParsedDeal = {
        ticket: parseStrictNumber(get("ticket"), "ticket", lineNum),
        openTime: parseTimestamp(get("opentime"), lineNum),
        type: typeRaw,
        volume: parseStrictNumber(get("volume"), "volume", lineNum),
        price: parseStrictNumber(get("price"), "price", lineNum),
        profit: parseStrictNumber(get("profit"), "profit", lineNum),
      };

      const sl = parseOptionalNumber(getOpt("sl"), "sl", lineNum);
      if (sl !== undefined) deal.sl = sl;

      const tp = parseOptionalNumber(getOpt("tp"), "tp", lineNum);
      if (tp !== undefined) deal.tp = tp;

      const symbol = getOpt("symbol")?.trim();
      if (symbol) deal.symbol = symbol;

      const comment = getOpt("comment")?.trim();
      if (comment) deal.comment = comment;

      deals.push(deal);
    } catch (err) {
      if (err instanceof CsvParseError) {
        errors.push(...err.details);
      } else {
        errors.push(`line ${lineNum}: unexpected parse error`);
      }
    }
  }

  if (errors.length > 0) {
    throw new CsvParseError(`CSV parsing failed with ${errors.length} error(s)`, null, errors);
  }

  return deals;
}
