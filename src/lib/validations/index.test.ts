import { describe, it, expect } from "vitest";
import {
  createProjectSchema,
  updateProjectSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  checkoutRequestSchema,
  exportRequestSchema,
  formatZodErrors,
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
});
