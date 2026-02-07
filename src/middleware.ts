import { NextRequest, NextResponse } from "next/server";
import {
  validateCsrfToken,
  createCsrfResponse,
  createCsrfErrorResponse,
  shouldProtectRoute,
} from "./lib/csrf";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // CSRF: Validate token on protected mutation routes
  if (shouldProtectRoute(pathname)) {
    const isValid = validateCsrfToken(request);
    if (!isValid) {
      return createCsrfErrorResponse();
    }
  }

  // Continue with response and ensure CSRF cookie exists
  const response = NextResponse.next();
  return createCsrfResponse(response, request);
}

export const config = {
  matcher: [
    // Match all API routes
    "/api/:path*",
    // Match app routes (for CSRF cookie seeding)
    "/app/:path*",
    // Match public pages (for CSRF cookie seeding)
    "/((?!_next/static|_next/image|favicon.ico|icon|opengraph-image|apple-icon).*)",
  ],
};
