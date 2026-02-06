import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  validateCsrfToken,
  createCsrfResponse,
  createCsrfErrorResponse,
  shouldProtectRoute,
  CSRF_EXCLUDED_ROUTES,
} from "@/lib/csrf";

/**
 * Proxy function for Next.js 16 (replaces middleware)
 *
 * This proxy:
 * 1. Handles authentication redirects
 * 2. Sets a CSRF token cookie on every response
 * 3. Validates CSRF token on state-changing requests (POST, PUT, PATCH, DELETE)
 * 4. Excludes certain routes (webhooks, auth callbacks)
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ============================================
  // AUTHENTICATION REDIRECTS
  // ============================================
  const isOnApp = pathname.startsWith("/app");
  const isOnLogin = pathname === "/login";

  if (isOnApp || isOnLogin) {
    const session = await auth();
    const isLoggedIn = !!session?.user;

    // Redirect unauthenticated users from /app to /login
    if (isOnApp && !isLoggedIn) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Redirect authenticated users from /login to /app
    if (isOnLogin && isLoggedIn) {
      return NextResponse.redirect(new URL("/app", request.url));
    }
  }

  // ============================================
  // CSRF PROTECTION
  // ============================================

  // Skip CSRF for excluded routes (webhooks with their own auth)
  const isExcluded = CSRF_EXCLUDED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  // For state-changing methods on API routes, validate CSRF
  const isStateChanging = ["POST", "PUT", "PATCH", "DELETE"].includes(
    request.method
  );

  if (!isExcluded && isStateChanging && shouldProtectRoute(pathname)) {
    const isValid = validateCsrfToken(request);
    if (!isValid) {
      return createCsrfErrorResponse();
    }
  }

  // Continue with the request and ensure CSRF cookie is set
  const response = NextResponse.next();
  return createCsrfResponse(response, request);
}

// Configure which routes the proxy runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public directory)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
