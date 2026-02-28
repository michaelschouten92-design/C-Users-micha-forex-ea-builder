import { describe, it, expect } from "vitest";
import { hashIp, extractSessionId } from "./events";

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

  it("handles full IPv6 addresses", () => {
    const result = hashIp("2001:0db8:85a3:0000:0000:8a2e:0370:7334");
    expect(result).toHaveLength(16);
    expect(result).toMatch(/^[0-9a-f]{16}$/);
  });

  it("handles empty string", () => {
    const result = hashIp("");
    expect(result).toHaveLength(16);
  });
});

// ============================================
// extractSessionId
// ============================================

describe("extractSessionId", () => {
  it("extracts proof_sid from a cookie header", () => {
    const sid = extractSessionId("proof_sid=abc123def456");
    expect(sid).toBe("abc123def456");
  });

  it("extracts proof_sid when other cookies are present", () => {
    const sid = extractSessionId("theme=dark; proof_sid=test-session-123; lang=en");
    expect(sid).toBe("test-session-123");
  });

  it("extracts proof_sid when it is the first cookie", () => {
    const sid = extractSessionId("proof_sid=first123; other=value");
    expect(sid).toBe("first123");
  });

  it("generates a new session ID when cookie header is null", () => {
    const sid = extractSessionId(null);
    expect(sid).toHaveLength(24);
    expect(sid).toMatch(/^[0-9a-f]{24}$/);
  });

  it("generates a new session ID when proof_sid is missing", () => {
    const sid = extractSessionId("theme=dark; lang=en");
    expect(sid).toHaveLength(24);
    expect(sid).toMatch(/^[0-9a-f]{24}$/);
  });

  it("generates a new session ID for empty string", () => {
    const sid = extractSessionId("");
    expect(sid).toHaveLength(24);
    expect(sid).toMatch(/^[0-9a-f]{24}$/);
  });

  it("handles cookie values with hyphens and underscores", () => {
    const sid = extractSessionId("proof_sid=abc-123_DEF");
    expect(sid).toBe("abc-123_DEF");
  });
});
