import { logger } from "@/lib/logger";

const log = logger.child({ module: "notifications" });
const NOTIFY_TIMEOUT_MS = 5_000;

export interface TransitionAlert {
  strategyId: string;
  fromState: string;
  toState: string;
  monitoringVerdict: string;
  reasonCodes: string[];
  tradeSnapshotHash: string | null;
  configVersion: string;
  thresholdsHash: string;
  recordId: string;
}

/**
 * Fire-and-forget webhook notification for lifecycle transitions.
 * If NOTIFY_WEBHOOK_URL is not configured, logs once and returns.
 * Never throws — errors are logged.
 */
export async function notifyTransition(alert: TransitionAlert): Promise<void> {
  const url = process.env.NOTIFY_WEBHOOK_URL;
  if (!url) {
    log.info({ strategyId: alert.strategyId }, "notifications_disabled");
    return;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), NOTIFY_TIMEOUT_MS);

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "lifecycle_transition",
        ...alert,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      log.warn(
        { status: response.status, strategyId: alert.strategyId },
        "Transition notification delivery returned non-2xx"
      );
    } else {
      log.info({ strategyId: alert.strategyId, to: alert.toState }, "Transition notification sent");
    }
  } catch (error) {
    log.warn(
      {
        error: error instanceof Error ? error.message : String(error),
        strategyId: alert.strategyId,
      },
      "Transition notification failed"
    );
  }
}

/**
 * Deliver a transition alert via webhook — **throws** on failure.
 * Used by the AlertOutbox processor for retryable delivery.
 * If NOTIFY_WEBHOOK_URL is not configured, returns silently (nothing to deliver).
 */
export async function deliverTransitionAlert(alert: TransitionAlert): Promise<void> {
  const url = process.env.NOTIFY_WEBHOOK_URL;
  if (!url) {
    log.info({ strategyId: alert.strategyId }, "notifications_disabled");
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), NOTIFY_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "lifecycle_transition", ...alert }),
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }

  clearTimeout(timeout);

  if (!response.ok) {
    throw new Error(`Webhook returned ${response.status}`);
  }

  log.info({ strategyId: alert.strategyId, to: alert.toState }, "Transition alert delivered");
}
