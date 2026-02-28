import { describe, it, expect } from "vitest";
import {
  createProjectSchema,
  updateProjectSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  checkoutRequestSchema,
  exportRequestSchema,
  formatZodErrors,
  isJsonContentType,
  isBodyTooLarge,
  parseJsonBody,
} from "./index";
import { z } from "zod";

describe("validations", () => {
  describe("createProjectSchema", () => {
    it("validates a valid project", () => {
      const result = createProjectSchema.safeParse({
        name: "My Project",
        description: "A test project",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("My Project");
        expect(result.data.description).toBe("A test project");
      }
    });

    it("requires a name", () => {
      const result = createProjectSchema.safeParse({
        description: "A test project",
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty name", () => {
      const result = createProjectSchema.safeParse({
        name: "",
      });
      expect(result.success).toBe(false);
    });

    it("rejects name over 100 characters", () => {
      const result = createProjectSchema.safeParse({
        name: "a".repeat(101),
      });
      expect(result.success).toBe(false);
    });

    it("allows null description", () => {
      const result = createProjectSchema.safeParse({
        name: "My Project",
        description: null,
      });
      expect(result.success).toBe(true);
    });

    it("sanitizes XSS in name", () => {
      const result = createProjectSchema.safeParse({
        name: '<script>alert("xss")</script>Test',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Test");
      }
    });

    it("trims whitespace", () => {
      const result = createProjectSchema.safeParse({
        name: "  My Project  ",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("My Project");
      }
    });
  });

  describe("updateProjectSchema", () => {
    it("allows partial updates", () => {
      const result = updateProjectSchema.safeParse({
        name: "Updated Name",
      });
      expect(result.success).toBe(true);
    });

    it("allows empty object", () => {
      const result = updateProjectSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe("forgotPasswordSchema", () => {
    it("validates a valid email", () => {
      const result = forgotPasswordSchema.safeParse({
        email: "test@example.com",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid email", () => {
      const result = forgotPasswordSchema.safeParse({
        email: "not-an-email",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("resetPasswordSchema", () => {
    it("validates valid reset request", () => {
      const result = resetPasswordSchema.safeParse({
        token: "abc123",
        password: "securepassword",
      });
      expect(result.success).toBe(true);
    });

    it("rejects password under 8 characters", () => {
      const result = resetPasswordSchema.safeParse({
        token: "abc123",
        password: "short",
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty token", () => {
      const result = resetPasswordSchema.safeParse({
        token: "",
        password: "securepassword",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("checkoutRequestSchema", () => {
    it("validates valid checkout request", () => {
      const result = checkoutRequestSchema.safeParse({
        plan: "PRO",
        interval: "monthly",
      });
      expect(result.success).toBe(true);
    });

    it("validates yearly interval", () => {
      const result = checkoutRequestSchema.safeParse({
        plan: "PRO",
        interval: "yearly",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid plan", () => {
      const result = checkoutRequestSchema.safeParse({
        plan: "INVALID",
        interval: "monthly",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid interval", () => {
      const result = checkoutRequestSchema.safeParse({
        plan: "PRO",
        interval: "weekly",
      });
      expect(result.success).toBe(false);
    });

    it("rejects FREE plan", () => {
      const result = checkoutRequestSchema.safeParse({
        plan: "FREE",
        interval: "monthly",
      });
      expect(result.success).toBe(false);
    });

    it("rejects STARTER plan", () => {
      const result = checkoutRequestSchema.safeParse({
        plan: "STARTER",
        interval: "monthly",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("exportRequestSchema", () => {
    it("validates MQ5 export", () => {
      const result = exportRequestSchema.safeParse({
        exportType: "MQ5",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid export type", () => {
      const result = exportRequestSchema.safeParse({
        exportType: "INVALID",
      });
      expect(result.success).toBe(false);
    });

    it("accepts optional magicNumber", () => {
      const result = exportRequestSchema.safeParse({
        exportType: "MQ5",
        magicNumber: 654321,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.magicNumber).toBe(654321);
      }
    });

    it("accepts request without magicNumber", () => {
      const result = exportRequestSchema.safeParse({
        exportType: "MQ5",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.magicNumber).toBeUndefined();
      }
    });

    it("rejects magicNumber below 1", () => {
      const result = exportRequestSchema.safeParse({
        exportType: "MQ5",
        magicNumber: 0,
      });
      expect(result.success).toBe(false);
    });

    it("rejects magicNumber above 2147483647", () => {
      const result = exportRequestSchema.safeParse({
        exportType: "MQ5",
        magicNumber: 2147483648,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("formatZodErrors", () => {
    it("formats errors with path", () => {
      const schema = z.object({
        name: z.string().min(1),
        nested: z.object({
          value: z.number(),
        }),
      });

      const result = schema.safeParse({
        name: "",
        nested: { value: "not a number" },
      });

      if (!result.success) {
        const errors = formatZodErrors(result.error);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some((e) => e.includes("name"))).toBe(true);
        expect(errors.some((e) => e.includes("nested.value"))).toBe(true);
      }
    });
  });

  // ============================================
  // PURE VALIDATION HELPERS
  // ============================================

  describe("isJsonContentType", () => {
    it("returns true for application/json", () => {
      expect(isJsonContentType("application/json")).toBe(true);
    });

    it("returns true for application/json with charset", () => {
      expect(isJsonContentType("application/json; charset=utf-8")).toBe(true);
    });

    it("returns false for null", () => {
      expect(isJsonContentType(null)).toBe(false);
    });

    it("returns false for text/plain", () => {
      expect(isJsonContentType("text/plain")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isJsonContentType("")).toBe(false);
    });

    it("returns false for multipart/form-data", () => {
      expect(isJsonContentType("multipart/form-data")).toBe(false);
    });
  });

  describe("isBodyTooLarge", () => {
    it("returns false when content-length is null", () => {
      expect(isBodyTooLarge(null)).toBe(false);
    });

    it("returns false when content-length is within limit", () => {
      expect(isBodyTooLarge("500", 1024)).toBe(false);
    });

    it("returns false when content-length equals limit", () => {
      expect(isBodyTooLarge("1024", 1024)).toBe(false);
    });

    it("returns true when content-length exceeds limit", () => {
      expect(isBodyTooLarge("2048", 1024)).toBe(true);
    });

    it("uses default 1MB limit when maxBytes not specified", () => {
      const oneMB = 1 * 1024 * 1024;
      expect(isBodyTooLarge(String(oneMB))).toBe(false);
      expect(isBodyTooLarge(String(oneMB + 1))).toBe(true);
    });
  });

  describe("parseJsonBody", () => {
    it("parses valid JSON and returns data", () => {
      const result = parseJsonBody('{"key":"value"}');
      expect(result).toEqual({ success: true, data: { key: "value" } });
    });

    it("parses JSON arrays", () => {
      const result = parseJsonBody("[1,2,3]");
      expect(result).toEqual({ success: true, data: [1, 2, 3] });
    });

    it("parses JSON primitives", () => {
      expect(parseJsonBody("42")).toEqual({ success: true, data: 42 });
      expect(parseJsonBody('"hello"')).toEqual({ success: true, data: "hello" });
      expect(parseJsonBody("null")).toEqual({ success: true, data: null });
      expect(parseJsonBody("true")).toEqual({ success: true, data: true });
    });

    it("returns error for invalid JSON", () => {
      const result = parseJsonBody("{not valid json}");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid JSON");
        expect(result.status).toBe(400);
      }
    });

    it("returns error for empty string", () => {
      const result = parseJsonBody("");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.status).toBe(400);
      }
    });

    it("returns error when body exceeds maxBytes", () => {
      const largeBody = "x".repeat(100);
      const result = parseJsonBody(largeBody, 50);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.status).toBe(413);
        expect(result.error).toContain("Request too large");
      }
    });

    it("accepts body at exactly maxBytes", () => {
      const body = '{"a":1}';
      const result = parseJsonBody(body, body.length);
      expect(result).toEqual({ success: true, data: { a: 1 } });
    });

    it("uses default 1MB limit when maxBytes not specified", () => {
      const result = parseJsonBody('{"ok":true}');
      expect(result).toEqual({ success: true, data: { ok: true } });
    });
  });
});
