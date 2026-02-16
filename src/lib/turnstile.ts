/**
 * Cloudflare Turnstile CAPTCHA verification.
 * Optional: only active when TURNSTILE_SECRET_KEY is configured.
 */

import { logger } from "./logger";

const log = logger.child({ module: "turnstile" });
const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

interface TurnstileResult {
  success: boolean;
  "error-codes"?: string[];
}

/**
 * Check if Turnstile CAPTCHA is enabled.
 */
export function isCaptchaEnabled(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY && process.env.TURNSTILE_SECRET_KEY !== "");
}

/**
 * Get the Turnstile site key (safe for client-side use).
 */
export function getCaptchaSiteKey(): string | null {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || null;
}

/**
 * Verify a Turnstile CAPTCHA token.
 * Returns true if verification passes or CAPTCHA is not enabled.
 */
export async function verifyCaptcha(
  token: string | null | undefined,
  ip?: string
): Promise<boolean> {
  if (!isCaptchaEnabled()) return true; // Skip if not configured

  if (!token) {
    log.warn("Captcha token missing");
    return false;
  }

  try {
    const body: Record<string, string> = {
      secret: process.env.TURNSTILE_SECRET_KEY!,
      response: token,
    };
    if (ip) body.remoteip = ip;

    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const result: TurnstileResult = await res.json();

    if (!result.success) {
      log.warn({ errors: result["error-codes"] }, "Captcha verification failed");
    }

    return result.success;
  } catch (error) {
    log.error({ error }, "Captcha verification error");
    return false; // Fail closed: reject on error
  }
}
