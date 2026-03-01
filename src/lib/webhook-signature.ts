/**
 * HMAC-SHA256 webhook signature verification.
 *
 * Signature preimage: "${timestamp}.${rawBody}"
 * Dot separator prevents ambiguity; timestamp in preimage prevents replay.
 *
 * Pure function — no HTTP, no env, no side effects.
 */

import { createHmac } from "node:crypto";
import { timingSafeEqual } from "@/lib/csrf";

export interface VerifyWebhookSignatureParams {
  rawBody: string;
  signature: string; // hex from x-ingest-signature header
  timestamp: string; // unix seconds from x-ingest-timestamp header
  secret: string;
  maxSkewSeconds?: number; // default 300 (5 min)
}

export type VerifyResult = { valid: true } | { valid: false; reason: string };

export function verifyWebhookSignature(params: VerifyWebhookSignatureParams): VerifyResult {
  const { rawBody, signature, timestamp, secret, maxSkewSeconds = 300 } = params;

  // 1. Reject if secret is empty (not configured)
  if (!secret) {
    return { valid: false, reason: "Webhook secret not configured" };
  }

  // 2. Parse timestamp as integer; reject floats and non-numeric
  if (!/^\d+$/.test(timestamp)) {
    return { valid: false, reason: "Invalid timestamp format" };
  }
  const ts = Number(timestamp);

  // 3. Reject if |now - timestamp| > maxSkewSeconds
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - ts) > maxSkewSeconds) {
    return { valid: false, reason: "Timestamp outside acceptable window" };
  }

  // 4. Compute expected signature
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");

  // 5. Reject if signature length !== 64 (SHA-256 hex output)
  if (signature.length !== 64) {
    return { valid: false, reason: "Invalid signature length" };
  }

  // 6. Constant-time comparison
  if (!timingSafeEqual(signature, expected)) {
    return { valid: false, reason: "Signature mismatch" };
  }

  return { valid: true };
}
