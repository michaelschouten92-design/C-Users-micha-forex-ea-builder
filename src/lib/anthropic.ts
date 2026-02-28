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

/**
 * Get the Anthropic client singleton.
 * Returns null if ANTHROPIC_API_KEY is not configured.
 */
export function getAnthropicClient(): Anthropic | null {
  if (client) return client;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    logger.warn("ANTHROPIC_API_KEY not set — AI analysis features disabled");
    return null;
  }

  client = new Anthropic({
    apiKey,
    timeout: ANTHROPIC_TIMEOUT_MS,
    maxRetries: ANTHROPIC_MAX_RETRIES,
  });
  return client;
}

/** Default model for strategy analysis (fast + cost-effective) */
export const AI_ANALYSIS_MODEL = "claude-sonnet-4-6";
