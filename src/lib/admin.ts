/**
 * Admin authorization helpers.
 * Uses role-based check with ADMIN_EMAIL as bootstrap fallback.
 */

import { NextResponse } from "next/server";
import { auth } from "./auth";
import { prisma } from "./prisma";
import { logger } from "./logger";
import { ErrorCode, apiError } from "./error-codes";
import {
  adminRateLimiter,
  checkRateLimit,
  createRateLimitHeaders,
  formatRateLimitError,
} from "./rate-limit";
import { logAuditEvent } from "./audit";

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
    select: { email: true, role: true, emailVerified: true },
  });

  // Check role-based access OR bootstrap via ADMIN_EMAIL (only if user has no ADMIN role yet)
  const isAdmin =
    adminUser?.role === "ADMIN" ||
    (adminUser?.email != null &&
      adminUser.email.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase());

  if (!isAdmin) {
    return {
      authorized: false,
      response: NextResponse.json(apiError(ErrorCode.FORBIDDEN, "Access denied"), { status: 403 }),
    };
  }

  // Require verified email for admin access
  if (!adminUser?.emailVerified) {
    return {
      authorized: false,
      response: NextResponse.json(apiError(ErrorCode.FORBIDDEN, "Admin email must be verified"), {
        status: 403,
      }),
    };
  }

  // Auto-promote: if user matches ADMIN_EMAIL but doesn't have ADMIN role yet, set it
  if (
    adminUser &&
    adminUser.email?.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase() &&
    adminUser.role !== "ADMIN"
  ) {
    try {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { role: "ADMIN" },
      });
      await logAuditEvent({
        userId: session.user.id,
        eventType: "admin.bootstrap_promotion",
        metadata: { email: adminUser.email, method: "ADMIN_EMAIL_env" },
      }).catch(() => {});
      logger.info({ userId: session.user.id }, "Auto-promoted admin user via ADMIN_EMAIL");
    } catch (err) {
      logger.error({ err, userId: session.user.id }, "Failed to auto-promote admin user");
    }
  }

  return {
    authorized: true,
    session: session as { user: { id: string } },
    adminEmail: adminUser!.email,
  };
}
