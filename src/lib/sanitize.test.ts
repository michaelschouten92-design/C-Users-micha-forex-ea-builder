import { describe, it, expect } from "vitest";
import { sanitizeText, sanitizeInput, escapeHtml } from "./sanitize";

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
      // DOMPurify encodes entities for safety
      expect(sanitizeText(input)).toBe("Hello &amp; World &lt; Test &gt; 123");
    });
  });

  describe("sanitizeInput", () => {
    it("returns null for null input", () => {
      expect(sanitizeInput(null)).toBe(null);
    });

    it("returns null for undefined input", () => {
      expect(sanitizeInput(undefined)).toBe(null);
    });

    it("returns null for empty string", () => {
      expect(sanitizeInput("")).toBe(null);
    });

    it("returns null for whitespace-only string", () => {
      expect(sanitizeInput("   ")).toBe(null);
    });

    it("trims and sanitizes input", () => {
      const input = "  <b>Hello</b>  ";
      expect(sanitizeInput(input)).toBe("Hello");
    });
  });

  describe("escapeHtml", () => {
    it("escapes HTML entities", () => {
      const input = '<script>alert("xss")</script>';
      expect(escapeHtml(input)).toBe(
        "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"
      );
    });

    it("escapes ampersands", () => {
      expect(escapeHtml("Hello & World")).toBe("Hello &amp; World");
    });

    it("escapes single quotes", () => {
      // DOMPurify uses &#039; format
      expect(escapeHtml("It's")).toBe("It&#039;s");
    });
  });
});
