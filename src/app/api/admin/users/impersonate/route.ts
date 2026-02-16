import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { audit } from "@/lib/audit";
import { checkAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const impersonateSchema = z.object({
  email: z.string().email(),
});

// POST /api/admin/users/impersonate - Start impersonating a user (admin only)
export async function POST(request: Request) {
  try {
    const adminCheck = await checkAdmin();
    if (!adminCheck.authorized) return adminCheck.response;

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(apiError(ErrorCode.INVALID_JSON, "Invalid JSON body"), {
        status: 400,
      });
    }

    const validation = impersonateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        apiError(
          ErrorCode.VALIDATION_FAILED,
          "Validation failed",
          validation.error.errors.map((e) => e.message)
        ),
        { status: 400 }
      );
    }

    const { email } = validation.data;

    // Cannot impersonate yourself
    if (email === adminCheck.adminEmail) {
      return NextResponse.json(apiError(ErrorCode.FORBIDDEN, "Cannot impersonate yourself"), {
        status: 403,
      });
    }

    const targetUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (!targetUser) {
      return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "User not found"), { status: 404 });
    }

    // Audit log
    await audit.impersonationStart(adminCheck.session.user.id, targetUser.id, targetUser.email!);

    logger.info(
      { adminId: adminCheck.session.user.id, targetUserId: targetUser.id, targetEmail: email },
      "Admin started impersonation"
    );

    // Return data for updateSession()
    return NextResponse.json({
      impersonate: {
        userId: targetUser.id,
        email: targetUser.email,
      },
    });
  } catch (error) {
    logger.error({ error }, "Failed to start impersonation (admin)");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
