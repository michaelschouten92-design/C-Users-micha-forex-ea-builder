/**
 * Number locale detection and parsing for MT5 reports.
 *
 * MT5 reports use different number formats depending on the terminal locale:
 * - EN: 1,234.56 (comma = thousands, period = decimal)
 * - EU: 1.234,56 (period = thousands, comma = decimal)
 * - FR: 1 234,56 (space = thousands, comma = decimal)
 */

export type NumberLocale = "EN" | "EU" | "FR";

/**
 * Detect the number locale from a sample of number strings found in the report.
 * Returns the most likely locale or null if undetermined.
 */
export function detectLocale(samples: string[]): NumberLocale | null {
  if (samples.length === 0) return null;

  let enScore = 0;
  let euScore = 0;
  let frScore = 0;

  for (const s of samples) {
    const trimmed = s.trim();
    if (!trimmed) continue;

    // FR format: spaces as thousand separators, comma for decimal
    // e.g. "1 234,56" or "1 234 567,89"
    if (/^\s*-?\d{1,3}(\s\d{3})*,\d+\s*$/.test(trimmed)) {
      frScore += 2;
      continue;
    }

    // EU format: period as thousand separator, comma for decimal
    // e.g. "1.234,56"
    if (/^\s*-?\d{1,3}(\.\d{3})*,\d+\s*$/.test(trimmed)) {
      euScore += 2;
      continue;
    }

    // EN format: comma as thousand separator, period for decimal
    // e.g. "1,234.56"
    if (/^\s*-?\d{1,3}(,\d{3})*\.\d+\s*$/.test(trimmed)) {
      enScore += 2;
      continue;
    }

    // Simple decimal with period → likely EN
    if (/^\s*-?\d+\.\d+\s*$/.test(trimmed)) {
      enScore += 1;
    }

    // Simple decimal with comma → likely EU or FR
    if (/^\s*-?\d+,\d+\s*$/.test(trimmed)) {
      euScore += 1;
      frScore += 1;
    }
  }

  const max = Math.max(enScore, euScore, frScore);
  if (max === 0) return null;

  if (enScore === max) return "EN";
  if (frScore > euScore) return "FR";
  return "EU";
}

/**
 * Parse a localized number string to a JavaScript number.
 * Handles EN, EU, and FR number formats.
 */
export function parseLocalizedNumber(value: string, locale: NumberLocale | null): number {
  let cleaned = value.trim();

  // Remove percentage sign if present
  cleaned = cleaned.replace(/%$/, "").trim();

  if (!cleaned || cleaned === "-" || cleaned === "") return 0;

  const effectiveLocale = locale ?? "EN";

  switch (effectiveLocale) {
    case "FR":
      // Remove space thousands, replace comma decimal with period
      cleaned = cleaned.replace(/\s/g, "").replace(",", ".");
      break;
    case "EU":
      // Remove period thousands, replace comma decimal with period
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
      break;
    case "EN":
    default:
      // Remove comma thousands
      cleaned = cleaned.replace(/,/g, "");
      break;
  }

  const result = parseFloat(cleaned);
  return isNaN(result) ? 0 : result;
}
