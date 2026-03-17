/**
 * Slack Incoming Webhook — minimal sender for alert delivery.
 *
 * Uses Slack's Incoming Webhooks API:
 *   POST https://hooks.slack.com/services/T.../B.../xxx
 *   Content-Type: application/json
 *   { "text": "message" }
 */

import { logger } from "@/lib/logger";

const log = logger.child({ module: "slack" });

const TIMEOUT_MS = 10_000;

/**
 * Send a message via Slack Incoming Webhook.
 * Returns true on success, false on failure. Never throws.
 */
export async function sendSlackMessage(webhookUrl: string, text: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      log.warn({ status: res.status, body: body.slice(0, 200) }, "Slack webhook delivery failed");
      return false;
    }

    return true;
  } catch (err) {
    log.warn({ err }, "Slack webhook delivery error");
    return false;
  }
}
