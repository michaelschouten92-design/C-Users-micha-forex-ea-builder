/**
 * OpenAI client.
 *
 * Uses OPENAI_API_KEY from environment.
 * Optional feature — gracefully degrades when key is not set.
 */

import OpenAI from "openai";
import { logger } from "./logger";

// ============================================
// CLIENT CONSTANTS
// ============================================

/** Request timeout in ms — generous enough for large completions. */
export const OPENAI_TIMEOUT_MS = 45_000;

/** Max automatic retries on transient failures (429, 5xx). */
export const OPENAI_MAX_RETRIES = 2;

let client: OpenAI | null = null;
let warnedMissing = false;

/**
 * Get the OpenAI client singleton.
 * Returns null if OPENAI_API_KEY is not configured.
 * Logs a warning once per process lifetime when the key is missing.
 */
export function getOpenAIClient(): OpenAI | null {
  if (client) return client;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    if (!warnedMissing) {
      warnedMissing = true;
      logger.warn("OPENAI_API_KEY not set — AI analysis features disabled");
    }
    return null;
  }

  client = new OpenAI({
    apiKey,
    timeout: OPENAI_TIMEOUT_MS,
    maxRetries: OPENAI_MAX_RETRIES,
  });
  return client;
}

// Startup diagnostic — runs once when this module is first imported.
if (!process.env.OPENAI_API_KEY) {
  console.warn("\u26A0\uFE0F  AI analysis disabled — OPENAI_API_KEY not configured");
}

/** Model for strategy analysis — override via OPENAI_MODEL env var */
export const AI_ANALYSIS_MODEL = process.env.OPENAI_MODEL || "gpt-4o";
