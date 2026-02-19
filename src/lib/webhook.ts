import { logger } from "./logger";

const log = logger.child({ module: "webhook" });

const WEBHOOK_TIMEOUT_MS = 5000;

/**
 * Fire a webhook POST request to the given URL with a JSON payload.
 * This is fire-and-forget: errors are caught and logged silently.
 */
export async function fireWebhook(url: string, payload: object): Promise<void> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);
  } catch (error) {
    log.warn(
      { error: error instanceof Error ? error.message : String(error), url: url.substring(0, 40) },
      "Webhook delivery failed"
    );
  }
}
