import { describe, it, expect } from "vitest";
import { hashIp, getSessionId } from "./events";

// ============================================
// hashIp
// ============================================

describe("hashIp", () => {
  it("returns a 16-character hex string", () => {
    const result = hashIp("192.168.1.1");
    expect(result).toHaveLength(16);
    expect(result).toMatch(/^[0-9a-f]{16}$/);
  });

  it("returns deterministic output for same input", () => {
    expect(hashIp("10.0.0.1")).toBe(hashIp("10.0.0.1"));
  });

  it("returns different hashes for different IPs", () => {
    expect(hashIp("192.168.1.1")).not.toBe(hashIp("192.168.1.2"));
  });

  it("handles IPv6 addresses", () => {
    const result = hashIp("::1");
    expect(result).toHaveLength(16);
    expect(result).toMatch(/^[0-9a-f]{16}$/);
  });

  it("handles empty string", () => {
    const result = hashIp("");
    expect(result).toHaveLength(16);
  });
});

// ============================================
// getSessionId
// ============================================

describe("getSessionId", () => {
  it("returns a string session ID", () => {
    const mockRequest = {
      headers: new Headers(),
    } as unknown as Request;

    const sid = getSessionId(mockRequest);
    expect(typeof sid).toBe("string");
    expect(sid.length).toBeGreaterThan(0);
  });

  it("extracts session ID from proof_sid cookie", () => {
    const mockRequest = {
      headers: new Headers({ cookie: "proof_sid=test-session-123; other=value" }),
    } as unknown as Request;

    const sid = getSessionId(mockRequest);
    expect(sid).toBe("test-session-123");
  });

  it("generates new session ID when no cookie", () => {
    const mockRequest = {
      headers: new Headers(),
    } as unknown as Request;

    const sid = getSessionId(mockRequest);
    expect(sid).toBeTruthy();
    // Should be a UUID-like format
    expect(sid.length).toBeGreaterThanOrEqual(10);
  });
});
