/**
 * Centralized date formatting utilities.
 *
 * All user-facing date display should use these helpers to ensure
 * consistent formatting across the app.
 *
 * Locale: en-US (matches the app's English UI).
 */

const LOCALE = "en-US";

/** "Mar 15" — compact, for charts and space-constrained UI */
export function formatDateShort(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return d.toLocaleDateString(LOCALE, { month: "short", day: "numeric" });
}

/** "Mar 15, 2025" — standard display format */
export function formatDateMedium(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return d.toLocaleDateString(LOCALE, { month: "short", day: "numeric", year: "numeric" });
}

/** "March 15, 2025" — formal, for blog posts and headers */
export function formatDateLong(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return d.toLocaleDateString(LOCALE, { month: "long", day: "numeric", year: "numeric" });
}

/** "Mar 15, 2:30 PM" — date + time, for trades, events, timestamps */
export function formatDateTime(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return d.toLocaleDateString(LOCALE, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** "2025-03-15" — ISO date only, for exports and data attributes */
export function formatDateISO(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return d.toISOString().split("T")[0];
}

/** "5m ago", "2h ago", "3d ago" — relative time for feeds and status */
export function formatRelativeTime(input: string | Date | null): string {
  if (!input) return "Never";
  const diffMs = Date.now() - new Date(input).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
