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
  });
});
