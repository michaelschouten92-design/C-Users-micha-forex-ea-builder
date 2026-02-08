import { NextRequest, NextResponse } from "next/server";

/**
 * CSRF Protection using the Double Submit Cookie pattern.
 *
 * How it works:
 * 1. Server generates a random token and sets it as a cookie
 * 2. Client reads the cookie and sends it back in a header (X-CSRF-Token)
 * 3. Server validates that the header matches the cookie
 *
 * This works because:
 * - Attackers can't read cookies from other domains (same-origin policy)
 * - Attackers can't set custom headers in cross-origin requests
 */

const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";
const TOKEN_LENGTH = 32;

/**
 * Generate a cryptographically secure random token
 */
function generateToken(): string {
  const array = new Uint8Array(TOKEN_LENGTH);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Validate CSRF token from request
 * Returns true if valid, false otherwise
 */
export function validateCsrfToken(request: NextRequest): boolean {
  // Skip validation for safe methods
  const safeMethod = ["GET", "HEAD", "OPTIONS"].includes(request.method);
  if (safeMethod) {
    return true;
  }

  // Get token from cookie
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;

  // Get token from header
  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  // Both must exist and match
  if (!cookieToken || !headerToken) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  return timingSafeEqual(cookieToken, headerToken);
}

/**
 * Constant-time string comparison (Edge-compatible, no Node.js crypto)
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);

  let result = 0;
  for (let i = 0; i < bufA.length; i++) {
    result |= bufA[i] ^ bufB[i];
  }
  return result === 0;
}

/**
 * Create CSRF middleware response with token cookie
 */
export function createCsrfResponse(response: NextResponse, request: NextRequest): NextResponse {
  // Check if token already exists
  let token = request.cookies.get(CSRF_COOKIE_NAME)?.value;

  // Generate new token if needed
  if (!token) {
    token = generateToken();
    response.cookies.set(CSRF_COOKIE_NAME, token, {
      httpOnly: false, // Must be readable by JavaScript
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });
  }

  return response;
}

/**
 * Create error response for CSRF validation failure
 */
export function createCsrfErrorResponse(): NextResponse {
  return NextResponse.json({ error: "CSRF token validation failed" }, { status: 403 });
}

/**
 * Routes that should be excluded from CSRF protection
 * (e.g., webhooks that use their own authentication)
 */
export const CSRF_EXCLUDED_ROUTES = [
  "/api/stripe/webhook", // Uses Stripe signature verification
];

/**
 * Check if a route should have CSRF protection
 */
export function shouldProtectRoute(pathname: string): boolean {
  // Check explicit exclusions first (e.g., Stripe webhook)
  if (CSRF_EXCLUDED_ROUTES.some((route) => pathname.startsWith(route))) {
    return false;
  }

  // Exclude NextAuth internal routes (catch-all at /api/auth/[...nextauth])
  // but NOT custom auth routes like /api/auth/forgot-password or /api/auth/reset-password.
  // NextAuth routes go through /api/auth/callback/*, /api/auth/signin, /api/auth/signout, etc.
  // Our custom routes are explicitly defined and don't match the catch-all.
  // We exclude paths that match NextAuth's known sub-routes.
  const nextAuthSubPaths = [
    "/api/auth/callback",
    "/api/auth/signin",
    "/api/auth/signout",
    "/api/auth/session",
    "/api/auth/csrf",
    "/api/auth/providers",
    "/api/auth/error",
    "/api/auth/verify-request",
  ];
  if (nextAuthSubPaths.some((route) => pathname.startsWith(route))) {
    return false;
  }

  // All other API routes should be protected
  if (pathname.startsWith("/api/")) {
    return true;
  }

  return false;
}
