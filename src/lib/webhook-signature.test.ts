import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHmac } from "node:crypto";
import { verifyWebhookSignature } from "./webhook-signature";

const SECRET = "test-webhook-secret-at-least-32-chars-long";
const BODY = '{"strategyId":"strat_1","csv":"ticket,open..."}';

function makeTimestamp(offsetSeconds = 0): string {
  return String(Math.floor(Date.now() / 1000) + offsetSeconds);
}

function sign(timestamp: string, body: string, secret = SECRET): string {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

describe("verifyWebhookSignature", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("accepts a valid signature", () => {
    const ts = makeTimestamp();
    const sig = sign(ts, BODY);
    const result = verifyWebhookSignature({
      rawBody: BODY,
      signature: sig,
      timestamp: ts,
      secret: SECRET,
    });
    expect(result).toEqual({ valid: true });
  });

  it("rejects a tampered body", () => {
    const ts = makeTimestamp();
    const sig = sign(ts, BODY);
    const result = verifyWebhookSignature({
      rawBody: BODY + "x",
      signature: sig,
      timestamp: ts,
      secret: SECRET,
    });
    expect(result).toEqual({ valid: false, reason: "Signature mismatch" });
  });

  it("rejects a wrong secret", () => {
    const ts = makeTimestamp();
    const sig = sign(ts, BODY, "wrong-secret-that-is-long-enough-32ch");
    const result = verifyWebhookSignature({
      rawBody: BODY,
      signature: sig,
      timestamp: ts,
      secret: SECRET,
    });
    expect(result).toEqual({ valid: false, reason: "Signature mismatch" });
  });

  it("rejects expired timestamp (>5 min old)", () => {
    const ts = makeTimestamp(-301);
    const sig = sign(ts, BODY);
    const result = verifyWebhookSignature({
      rawBody: BODY,
      signature: sig,
      timestamp: ts,
      secret: SECRET,
    });
    expect(result).toEqual({ valid: false, reason: "Timestamp outside acceptable window" });
  });

  it("rejects future timestamp (>5 min ahead)", () => {
    const ts = makeTimestamp(301);
    const sig = sign(ts, BODY);
    const result = verifyWebhookSignature({
      rawBody: BODY,
      signature: sig,
      timestamp: ts,
      secret: SECRET,
    });
    expect(result).toEqual({ valid: false, reason: "Timestamp outside acceptable window" });
  });

  it("rejects non-numeric timestamp", () => {
    const result = verifyWebhookSignature({
      rawBody: BODY,
      signature: "a".repeat(64),
      timestamp: "abc",
      secret: SECRET,
    });
    expect(result).toEqual({ valid: false, reason: "Invalid timestamp format" });
  });

  it("rejects float timestamp", () => {
    const result = verifyWebhookSignature({
      rawBody: BODY,
      signature: "a".repeat(64),
      timestamp: "123.4",
      secret: SECRET,
    });
    expect(result).toEqual({ valid: false, reason: "Invalid timestamp format" });
  });

  it("rejects short/malformed signature", () => {
    const ts = makeTimestamp();
    const result = verifyWebhookSignature({
      rawBody: BODY,
      signature: "tooshort",
      timestamp: ts,
      secret: SECRET,
    });
    expect(result).toEqual({ valid: false, reason: "Invalid signature length" });
  });

  it("rejects when secret is empty", () => {
    const ts = makeTimestamp();
    const result = verifyWebhookSignature({
      rawBody: BODY,
      signature: "a".repeat(64),
      timestamp: ts,
      secret: "",
    });
    expect(result).toEqual({ valid: false, reason: "Webhook secret not configured" });
  });

  it("rejects any skew with maxSkewSeconds: 0", () => {
    // Even a 1-second old timestamp should fail
    const ts = makeTimestamp(-1);
    const sig = sign(ts, BODY);
    const result = verifyWebhookSignature({
      rawBody: BODY,
      signature: sig,
      timestamp: ts,
      secret: SECRET,
      maxSkewSeconds: 0,
    });
    expect(result).toEqual({ valid: false, reason: "Timestamp outside acceptable window" });
  });
});
