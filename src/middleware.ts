import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  validateCsrfToken,
  createCsrfResponse,
  createCsrfErrorResponse,
  shouldProtectRoute,
} from "@/lib/csrf";

/**
 * Session cookie names used by NextAuth v5.
 * In production, cookies are prefixed with __Secure-.
 */
const SESSION_COOKIE_DEV = "next-auth.session-token";
const SESSION_COOKIE_PROD = "__Secure-next-auth.session-token";

function hasSessionCookie(request: NextRequest): boolean {
  return request.cookies.has(SESSION_COOKIE_DEV) || request.cookies.has(SESSION_COOKIE_PROD);
}

/**
 * Next.js proxy for auth redirects and CSRF protection.
 *
 * Auth redirects use a lightweight cookie-existence check (no DB or crypto).
 * Full session validation happens in API route handlers via auth().
 *
 * CSRF uses the double-submit cookie pattern:
 * 1. Sets a CSRF token cookie on every response
 * 2. Validates CSRF token on state-changing requests (POST, PUT, PATCH, DELETE)
 * 3. Excludes webhooks and NextAuth internal routes
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ============================================
  // AUTHENTICATION REDIRECTS
  // ============================================
  const isOnApp = pathname.startsWith("/app");
  const isOnLogin = pathname === "/login";

  if (isOnApp && !hasSessionCookie(request)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isOnLogin && hasSessionCookie(request)) {
    return NextResponse.redirect(new URL("/app", request.url));
  }

  // ============================================
  // CSRF PROTECTION
  // ============================================
  const isStateChanging = ["POST", "PUT", "PATCH", "DELETE"].includes(request.method);

  if (isStateChanging && shouldProtectRoute(pathname)) {
    const isValid = validateCsrfToken(request);
    if (!isValid) {
      return createCsrfErrorResponse();
    }
  }

  // Add request ID for tracing (set on request headers so downstream handlers can read it)
  const requestId = crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);

  // Continue with the request and ensure CSRF cookie is set
  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("x-request-id", requestId);

  // ============================================
  // REFERRAL TRACKING
  // ============================================
  const refCode = request.nextUrl.searchParams.get("ref");
  if (refCode) {
    response.cookies.set("referral_code", refCode, {
      maxAge: 30 * 86400, // 30 days
      path: "/",
      httpOnly: true, // Secure: not accessible to client-side JS; read server-side via cookies()
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  return createCsrfResponse(response, request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, SVGs)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
