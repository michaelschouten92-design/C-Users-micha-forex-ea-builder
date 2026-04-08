/**
 * Reference implementation: Heartbeat polling client.
 *
 * NOT production code. This is a standalone snippet demonstrating the
 * correct client-side contract for consuming POST /api/internal/heartbeat.
 *
 * Key behaviors:
 * - Poll with jitter/backoff
 * - Default to PAUSE on any error (fail-closed)
 * - Honor STOP as immediate disable
 * - Never cache; always fetch fresh
 *
 * See docs/HEARTBEAT_CONTRACT.md for the full integration contract.
 */

type HeartbeatAction = "RUN" | "PAUSE" | "STOP";

interface HeartbeatResponse {
  strategyId: string;
  action: HeartbeatAction;
  reasonCode: string;
  serverTime: string;
}

interface HeartbeatClientConfig {
  /** Base URL of the Algo Studio API (e.g. "https://app.example.com"). */
  baseUrl: string;
  /** Internal API key for x-internal-api-key header. */
  apiKey: string;
  /** Strategy ID to poll. */
  strategyId: string;
  /** Base poll interval in ms. Default: 30_000 (30s). */
  pollIntervalMs?: number;
  /** Max backoff on errors in ms. Default: 300_000 (5min). */
  maxBackoffMs?: number;
  /** Clock drift warning threshold in ms. Default: 30_000 (30s). */
  clockDriftThresholdMs?: number;
  /** Called on each heartbeat decision. */
  onDecision: (decision: HeartbeatResponse) => void;
  /** Called on STOP — EA should immediately cease trading. */
  onStop: (decision: HeartbeatResponse) => void;
  /** Called on warnings (clock drift, backoff). */
  onWarn?: (message: string) => void;
}

/**
 * Add jitter to a base interval (±25%) to prevent thundering herd.
 */
function withJitter(baseMs: number): number {
  const jitter = baseMs * 0.25 * (Math.random() * 2 - 1);
  return Math.max(1000, Math.round(baseMs + jitter));
}

/**
 * Start polling the heartbeat endpoint.
 * Returns a cleanup function that stops the poll loop.
 */
export function startHeartbeatPoll(config: HeartbeatClientConfig): () => void {
  const {
    baseUrl,
    apiKey,
    strategyId,
    pollIntervalMs = 30_000,
    maxBackoffMs = 300_000,
    clockDriftThresholdMs = 30_000,
    onDecision,
    onStop,
    onWarn,
  } = config;

  let running = true;
  let consecutiveErrors = 0;

  async function poll(): Promise<void> {
    while (running) {
      let nextDelayMs: number;

      try {
        const res = await fetch(`${baseUrl}/api/internal/heartbeat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-api-key": apiKey,
          },
          body: JSON.stringify({ strategyId }),
          // Prevent caching at the fetch level
          cache: "no-store",
        });

        if (!res.ok) {
          // Non-200: treat as PAUSE (fail-closed)
          consecutiveErrors++;
          onDecision({
            strategyId,
            action: "PAUSE",
            reasonCode: "COMPUTATION_FAILED",
            serverTime: new Date().toISOString(),
          });
          nextDelayMs = computeBackoff(consecutiveErrors, pollIntervalMs, maxBackoffMs);
          onWarn?.(`Heartbeat HTTP ${res.status} — defaulting to PAUSE, backoff ${nextDelayMs}ms`);
          await sleep(nextDelayMs);
          continue;
        }

        const decision: HeartbeatResponse = await res.json();
        consecutiveErrors = 0;

        // Clock drift check
        const serverMs = new Date(decision.serverTime).getTime();
        const drift = Math.abs(Date.now() - serverMs);
        if (drift > clockDriftThresholdMs) {
          onWarn?.(`Clock drift detected: ${drift}ms (threshold: ${clockDriftThresholdMs}ms)`);
        }

        onDecision(decision);

        // STOP is terminal
        if (decision.action === "STOP") {
          onStop(decision);
          running = false;
          return;
        }

        nextDelayMs = withJitter(pollIntervalMs);
      } catch {
        // Network error / timeout: fail-closed to PAUSE
        consecutiveErrors++;
        onDecision({
          strategyId,
          action: "PAUSE",
          reasonCode: "COMPUTATION_FAILED",
          serverTime: new Date().toISOString(),
        });
        nextDelayMs = computeBackoff(consecutiveErrors, pollIntervalMs, maxBackoffMs);
        onWarn?.(`Heartbeat network error — defaulting to PAUSE, backoff ${nextDelayMs}ms`);
      }

      await sleep(nextDelayMs);
    }
  }

  poll();

  return () => {
    running = false;
  };
}

function computeBackoff(errors: number, baseMs: number, maxMs: number): number {
  const exponential = baseMs * Math.pow(2, Math.min(errors, 10));
  return withJitter(Math.min(exponential, maxMs));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
