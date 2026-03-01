import { describe, it, expect } from "vitest";
import { shouldProtectRoute } from "./csrf";

describe("shouldProtectRoute", () => {
  it("returns true for regular API routes", () => {
    expect(shouldProtectRoute("/api/projects")).toBe(true);
    expect(shouldProtectRoute("/api/projects/123/export")).toBe(true);
    expect(shouldProtectRoute("/api/account/settings")).toBe(true);
  });

  it("returns false for Stripe webhook", () => {
    expect(shouldProtectRoute("/api/stripe/webhook")).toBe(false);
  });

  it("returns false for NextAuth internal routes", () => {
    expect(shouldProtectRoute("/api/auth/callback/google")).toBe(false);
    expect(shouldProtectRoute("/api/auth/signin")).toBe(false);
    expect(shouldProtectRoute("/api/auth/signout")).toBe(false);
    expect(shouldProtectRoute("/api/auth/session")).toBe(false);
    expect(shouldProtectRoute("/api/auth/csrf")).toBe(false);
    expect(shouldProtectRoute("/api/auth/providers")).toBe(false);
  });

  it("returns true for custom auth API routes", () => {
    expect(shouldProtectRoute("/api/auth/forgot-password")).toBe(true);
    expect(shouldProtectRoute("/api/auth/reset-password")).toBe(true);
  });

  it("returns false for internal trade ingest routes", () => {
    expect(shouldProtectRoute("/api/internal/trades/import-csv")).toBe(false);
    expect(shouldProtectRoute("/api/internal/trades/webhook-ingest")).toBe(false);
  });

  it("returns false for non-API routes", () => {
    expect(shouldProtectRoute("/app")).toBe(false);
    expect(shouldProtectRoute("/login")).toBe(false);
    expect(shouldProtectRoute("/")).toBe(false);
  });
});
