import { createHmac } from "crypto";
import { logger } from "./logger";

const log = logger.child({ module: "webhook" });

const WEBHOOK_TIMEOUT_MS = 5000;
const SIGNATURE_HEADER = "X-AlgoStudio-Signature";

/**
 * Compute HMAC-SHA256 signature for a webhook payload.
 * Uses WEBHOOK_SECRET env var; if not set, returns null (unsigned).
 */
function signPayload(body: string): string | null {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) return null;
  return createHmac("sha256", secret).update(body).digest("hex");
}

/**
 * Check if a URL resolves to a private/internal IP address.
 * Prevents SSRF via DNS rebinding by validating the resolved IP.
 */
async function resolveAndValidateUrl(url: string): Promise<boolean> {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    // Block obvious private hostnames
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname === "0.0.0.0" ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal")
    ) {
      return false;
    }

    // Check IPv4 private ranges
    const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4Match) {
      const [, a, b] = ipv4Match.map(Number);
      if (
        a === 10 ||
        a === 127 ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168) ||
        (a === 169 && b === 254) ||
        a === 0
      ) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Fire a webhook POST request to the given URL with a JSON payload.
 * Includes HMAC-SHA256 signature in X-AlgoStudio-Signature header when WEBHOOK_SECRET is set.
 * This is fire-and-forget: errors are caught and logged silently.
 */
export async function fireWebhook(url: string, payload: object): Promise<void> {
  try {
    // Validate URL is not targeting internal services (DNS rebinding protection)
    const urlSafe = await resolveAndValidateUrl(url);
    if (!urlSafe) {
      log.warn({ url: url.substring(0, 40) }, "Webhook blocked: URL targets private network");
      return;
    }

    const body = JSON.stringify(payload);
    const signature = signPayload(body);

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (signature) {
      headers[SIGNATURE_HEADER] = signature;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

    const response = await fetch(url, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      log.warn(
        { status: response.status, url: url.substring(0, 40) },
        "Webhook delivery returned non-2xx status"
      );
    } else {
      log.info({ status: response.status, url: url.substring(0, 40) }, "Webhook delivered");
    }
  } catch (error) {
    log.warn(
      { error: error instanceof Error ? error.message : String(error), url: url.substring(0, 40) },
      "Webhook delivery failed"
    );
  }
}
