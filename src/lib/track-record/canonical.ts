/**
 * Canonical JSON serialization and SHA-256 hashing for the track record hash chain.
 *
 * Rules (must match MQL5 implementation exactly):
 * 1. Fields sorted alphabetically by key name
 * 2. Numbers: 8 decimal places for prices, 2 for lots/profit/swap/commission, 0 for integers
 * 3. Strings: UTF-8, no trailing whitespace
 * 4. No optional/null fields — omit if not applicable
 * 5. No whitespace in JSON (compact)
 */

import { createHash } from "crypto";
import type { CanonicalEventFields } from "./types";

// Fields that use 8 decimal places (prices)
const PRICE_FIELDS = new Set([
  "openPrice",
  "closePrice",
  "newSL",
  "newTP",
  "oldSL",
  "oldTP",
  "sl",
  "tp",
]);

// Fields that use 2 decimal places (monetary amounts + lots)
const MONEY_FIELDS = new Set([
  "balance",
  "equity",
  "profit",
  "swap",
  "commission",
  "lots",
  "closedLots",
  "remainingLots",
  "unrealizedPnL",
  "drawdown",
  "finalBalance",
  "finalEquity",
]);

// Fields that are always integers
const INT_FIELDS = new Set([
  "seqNo",
  "timestamp",
  "openTrades",
  "uptimeSeconds",
  "previousSeqNo",
  "recoveredFromSeqNo",
]);

/**
 * Round-half-away-from-zero, matching MQL5 DoubleToString() behavior.
 * JavaScript's toFixed() uses banker's rounding which can differ.
 */
function toFixedMQL(value: number, decimals: number): string {
  const factor = Math.pow(10, decimals);
  const rounded = (Math.sign(value) * Math.round(Math.abs(value) * factor)) / factor;
  return rounded.toFixed(decimals);
}

/**
 * Format a number to the canonical string representation.
 */
function formatNumber(key: string, value: number): string {
  if (INT_FIELDS.has(key)) {
    return Math.floor(value).toString();
  }
  if (PRICE_FIELDS.has(key)) {
    return toFixedMQL(value, 8);
  }
  if (MONEY_FIELDS.has(key)) {
    return toFixedMQL(value, 2);
  }
  // Default: 2 decimal places
  return toFixedMQL(value, 2);
}

/**
 * Serialize a value for canonical JSON.
 */
function serializeValue(key: string, value: unknown): string {
  if (typeof value === "string") {
    // JSON-encode string (handles escaping)
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    return formatNumber(key, value);
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  // Should not reach here for valid events
  return JSON.stringify(value);
}

/**
 * Canonicalize an event object into a deterministic JSON string.
 * - Keys sorted alphabetically
 * - Numbers formatted to fixed precision
 * - Null/undefined values omitted
 * - Compact (no whitespace)
 */
export function canonicalize(event: CanonicalEventFields): string {
  const keys = Object.keys(event)
    .filter((k) => event[k] !== null && event[k] !== undefined)
    .sort();

  const pairs = keys.map((k) => {
    const val = event[k];
    return `${JSON.stringify(k)}:${serializeValue(k, val)}`;
  });

  return `{${pairs.join(",")}}`;
}

/**
 * Compute SHA-256 hash of a string, returning hex-encoded digest.
 */
export function sha256(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/**
 * Compute the event hash: SHA-256 of the canonical JSON representation.
 */
export function computeEventHash(event: CanonicalEventFields): string {
  return sha256(canonicalize(event));
}

/**
 * Build the canonical event fields from an ingest request + instance context.
 * This merges the payload into the top-level canonical form.
 */
export function buildCanonicalEvent(
  instanceId: string,
  eventType: string,
  seqNo: number,
  prevHash: string,
  timestamp: number,
  payload: Record<string, unknown>
): CanonicalEventFields {
  return {
    eaInstanceId: instanceId,
    eventType: eventType as CanonicalEventFields["eventType"],
    seqNo,
    prevHash,
    timestamp,
    ...payload,
  };
}
