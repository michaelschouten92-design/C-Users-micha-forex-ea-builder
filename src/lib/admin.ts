/**
 * Admin authorization helpers.
 * Uses role-based check with ADMIN_EMAIL as bootstrap fallback.
 */

import { NextResponse } from "next/server";
import { auth } from "./auth";
import { prisma } from "./prisma";
import { ErrorCode, apiError } from "./error-codes";
import {
  adminRateLimiter,
  checkRateLimit,
  createRateLimitHeaders,
  formatRateLimitError,
} from "./rate-limit";

interface AdminCheckResult {
  authorized: true;
  session: { user: { id: string } };
  adminEmail: string;
}

interface AdminCheckError {
  authorized: false;
  response: NextResponse;
}

/**
 * Check if the current user is an admin.
 * Uses role field with ADMIN_EMAIL as bootstrap fallback.
 * Also applies rate limiting to admin endpoints.
 */
export async function checkAdmin(): Promise<AdminCheckResult | AdminCheckError> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      authorized: false,
      response: NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), {
        status: 401,
      }),
    };
  }

  // Rate limit admin requests
  const rateLimitResult = await checkRateLimit(adminRateLimiter, `admin:${session.user.id}`);
  if (!rateLimitResult.success) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: formatRateLimitError(rateLimitResult) },
        { status: 429, headers: createRateLimitHeaders(rateLimitResult) }
      ),
    };
  }

  const adminUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, role: true },
  });

  // Check role-based access OR bootstrap via ADMIN_EMAIL
  const isAdmin = adminUser?.role === "ADMIN" || adminUser?.email === process.env.ADMIN_EMAIL;

  if (!isAdmin) {
    return {
      authorized: false,
      response: NextResponse.json(apiError(ErrorCode.FORBIDDEN, "Access denied"), { status: 403 }),
    };
  }

  // Auto-promote: if user matches ADMIN_EMAIL but doesn't have ADMIN role yet, set it
  if (adminUser && adminUser.email === process.env.ADMIN_EMAIL && adminUser.role !== "ADMIN") {
    await prisma.user
      .update({
        where: { id: session.user.id },
        data: { role: "ADMIN" },
      })
      .catch(() => {}); // Fire-and-forget
  }

  return {
    authorized: true,
    session: session as { user: { id: string } },
    adminEmail: adminUser!.email,
  };
}
