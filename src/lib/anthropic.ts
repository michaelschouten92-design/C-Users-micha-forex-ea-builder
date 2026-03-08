/**
 * Anthropic Claude SDK client.
 *
 * Uses ANTHROPIC_API_KEY from environment.
 * Optional feature — gracefully degrades when key is not set.
 */

import Anthropic from "@anthropic-ai/sdk";
import { logger } from "./logger";

// ============================================
// CLIENT CONSTANTS
// ============================================

/** Request timeout in ms — generous enough for large completions. */
export const ANTHROPIC_TIMEOUT_MS = 30_000;

/** Max automatic retries on transient failures (429, 5xx). */
export const ANTHROPIC_MAX_RETRIES = 2;

let client: Anthropic | null = null;
let warnedMissing = false;

/**
 * Get the Anthropic client singleton.
 * Returns null if ANTHROPIC_API_KEY is not configured.
 * Logs a warning once per process lifetime when the key is missing.
 */
export function getAnthropicClient(): Anthropic | null {
  if (client) return client;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    if (!warnedMissing) {
      warnedMissing = true;
      logger.warn("ANTHROPIC_API_KEY not set — AI analysis features disabled");
    }
    return null;
  }

  client = new Anthropic({
    apiKey,
    timeout: ANTHROPIC_TIMEOUT_MS,
    maxRetries: ANTHROPIC_MAX_RETRIES,
  });
  return client;
}

// Startup diagnostic — runs once when this module is first imported.
// Visible in server logs so missing config is caught during deploy, not on first user request.
if (!process.env.ANTHROPIC_API_KEY) {
  console.warn("\u26A0\uFE0F  AI analysis disabled — ANTHROPIC_API_KEY not configured");
}

/** Default model for strategy analysis (fast + cost-effective) */
export const AI_ANALYSIS_MODEL = "claude-sonnet-4-6";
