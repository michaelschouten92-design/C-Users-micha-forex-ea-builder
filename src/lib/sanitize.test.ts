import { describe, it, expect } from "vitest";
import { sanitizeText } from "./sanitize";

describe("sanitize", () => {
  describe("sanitizeText", () => {
    it("removes script tags", () => {
      const input = '<script>alert("xss")</script>Hello';
      expect(sanitizeText(input)).toBe("Hello");
    });

    it("removes onclick handlers", () => {
      const input = '<div onclick="alert(1)">Click me</div>';
      expect(sanitizeText(input)).toBe("Click me");
    });

    it("removes all HTML tags", () => {
      const input = "<p>Hello <b>World</b></p>";
      expect(sanitizeText(input)).toBe("Hello World");
    });

    it("preserves plain text", () => {
      const input = "Hello World";
      expect(sanitizeText(input)).toBe("Hello World");
    });

    it("handles special characters", () => {
      const input = "Hello & World < Test > 123";
      // Plain text passes through; React escapes entities during rendering
      expect(sanitizeText(input)).toBe("Hello & World  123");
    });

    it("neutralizes javascript: URI scheme", () => {
      const result = sanitizeText("javascript:alert(1)");
      expect(result).not.toContain("javascript:");
    });

    it("neutralizes JavaScript: URI scheme (case insensitive)", () => {
      const result = sanitizeText("JavaScript:void(0)");
      expect(result).not.toContain("javascript:");
      expect(result).not.toContain("JavaScript:");
    });

    it("neutralizes vbscript: URI scheme", () => {
      const result = sanitizeText("vbscript:MsgBox");
      expect(result).not.toContain("vbscript:");
    });

    it("neutralizes data: URI scheme", () => {
      const result = sanitizeText("data:text/html,<script>alert(1)</script>");
      expect(result).not.toContain("data:");
    });

    it("removes style tags with content", () => {
      expect(sanitizeText("<style>body{display:none}</style>visible")).toBe("visible");
    });

    it("removes iframe tags", () => {
      expect(sanitizeText('<iframe src="evil.com">content</iframe>')).toBe("");
    });

    it("removes HTML comments", () => {
      expect(sanitizeText("hello<!-- comment -->world")).toBe("helloworld");
    });

    it("handles empty string", () => {
      expect(sanitizeText("")).toBe("");
    });
  });
});
