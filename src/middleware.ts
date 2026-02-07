import { NextRequest, NextResponse } from "next/server";
import {
  validateCsrfToken,
  createCsrfResponse,
  createCsrfErrorResponse,
  shouldProtectRoute,
} from "@/lib/csrf";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // CSRF protection for state-changing API requests
  if (shouldProtectRoute(pathname)) {
    if (!validateCsrfToken(request)) {
      return createCsrfErrorResponse();
    }
  }

  // Ensure CSRF cookie is set on all responses
  const response = NextResponse.next();
  return createCsrfResponse(response, request);
}

export const config = {
  matcher: [
    // Match all API routes and app pages (not static assets)
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
