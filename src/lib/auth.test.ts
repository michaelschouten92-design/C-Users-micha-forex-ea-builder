import { describe, it, expect, vi } from "vitest";

// Mock modules that auth.ts imports which require Next.js runtime
vi.mock("next-auth", () => ({
  default: () => ({ handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() }),
  CredentialsSignin: class extends Error {},
}));
vi.mock("next-auth/providers/credentials", () => ({ default: vi.fn() }));
vi.mock("next-auth/providers/google", () => ({ default: vi.fn() }));
vi.mock("next-auth/providers/github", () => ({ default: vi.fn() }));
vi.mock("bcryptjs", () => ({ default: { hash: vi.fn(), compare: vi.fn() } }));
vi.mock("./prisma", () => ({ prisma: {} }));
vi.mock("./env", () => ({ env: {}, features: {} }));
vi.mock("./rate-limit", () => ({
  registrationRateLimiter: {},
  loginRateLimiter: {},
  loginIpRateLimiter: {},
  checkRateLimit: vi.fn(),
}));
vi.mock("./email", () => ({
  sendWelcomeEmail: vi.fn(),
  sendVerificationEmail: vi.fn(),
}));

import { normalizeEmail } from "./auth";

describe("normalizeEmail", () => {
  it("lowercases and trims the email", () => {
    expect(normalizeEmail("  User@Example.COM  ")).toBe("user@example.com");
  });

  it("removes +tag suffix for any provider", () => {
    expect(normalizeEmail("user+tag@outlook.com")).toBe("user@outlook.com");
  });

  it("removes dots from Gmail local part", () => {
    expect(normalizeEmail("u.s.e.r@gmail.com")).toBe("user@gmail.com");
  });

  it("removes both dots and +tag for Gmail", () => {
    expect(normalizeEmail("u.s.e.r+tag@gmail.com")).toBe("user@gmail.com");
  });

  it("treats googlemail.com the same as gmail.com", () => {
    expect(normalizeEmail("u.s.e.r+tag@googlemail.com")).toBe("user@googlemail.com");
  });

  it("does not remove dots for non-Gmail providers", () => {
    expect(normalizeEmail("first.last@outlook.com")).toBe("first.last@outlook.com");
  });

  it("handles email without @ gracefully", () => {
    expect(normalizeEmail("noatsign")).toBe("noatsign");
  });

  it("handles empty string", () => {
    expect(normalizeEmail("")).toBe("");
  });
});
