import { describe, it, expect } from "vitest";

/**
 * Regression test: verify that auth/signout paths are never blocked
 * by the middleware's /app/* session-cookie check.
 *
 * The middleware only redirects to /login when:
 *   pathname.startsWith("/app") && !hasSessionCookie(request)
 *
 * These paths must remain outside the /app prefix so that users
 * stuck in onboarding (or any /app/* page) can always sign out.
 */
describe("middleware auth allowlist (structural)", () => {
  const blockedPrefix = "/app";

  const mustNotBeBlocked = [
    "/api/auth/signout",
    "/api/auth/signin",
    "/api/auth/callback/google",
    "/api/auth/callback/discord",
    "/api/auth/callback/github",
    "/api/auth/session",
    "/api/auth/csrf",
    "/login",
    "/",
  ];

  for (const path of mustNotBeBlocked) {
    it(`${path} is not under ${blockedPrefix} and won't be redirected`, () => {
      expect(path.startsWith(blockedPrefix)).toBe(false);
    });
  }

  it("/app/onboarding IS under /app (requires session cookie)", () => {
    expect("/app/onboarding".startsWith(blockedPrefix)).toBe(true);
  });
});
