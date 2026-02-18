import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { checkAdmin } from "@/lib/admin";
import { logAuditEvent } from "@/lib/audit";
import type { AuditEventType } from "@/lib/audit";
import { encrypt, decrypt, isEncrypted } from "@/lib/crypto";
import { checkContentType, checkBodySize } from "@/lib/validations";

// GET /api/admin/users/[id] - Detailed user info with full history
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminCheck = await checkAdmin();
    if (!adminCheck.authorized) return adminCheck.response;

    const { id } = await params;

    const [user, auditLogs] = await Promise.all([
      prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          emailVerified: true,
          createdAt: true,
          lastLoginAt: true,
          adminNotes: true,
          role: true,
          referralCode: true,
          referredBy: true,
          suspended: true,
          suspendedAt: true,
          suspendedReason: true,
          subscription: true,
          projects: {
            where: { deletedAt: null },
            select: {
              id: true,
              name: true,
              updatedAt: true,
              _count: { select: { versions: true, exports: true } },
            },
            orderBy: { updatedAt: "desc" },
          },
          exports: {
            select: {
              id: true,
              exportType: true,
              status: true,
              createdAt: true,
              errorMessage: true,
              project: { select: { name: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 20,
          },
        },
      }),
      prisma.auditLog.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

    if (!user) {
      return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "User not found"), { status: 404 });
    }

    // Decrypt encrypted fields for admin display
    const decryptedNotes = user.adminNotes
      ? isEncrypted(user.adminNotes)
        ? decrypt(user.adminNotes)
        : user.adminNotes
      : null;
    const decryptedReason = user.suspendedReason
      ? isEncrypted(user.suspendedReason)
        ? decrypt(user.suspendedReason)
        : user.suspendedReason
      : null;

    return NextResponse.json({
      ...user,
      adminNotes: decryptedNotes,
      suspendedReason: decryptedReason,
      auditLogs,
    });
  } catch (error) {
    logger.error({ error }, "Failed to fetch user detail");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}

// PATCH /api/admin/users/[id] - Update admin notes
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminCheck = await checkAdmin();
    if (!adminCheck.authorized) return adminCheck.response;

    const contentTypeError = checkContentType(request);
    if (contentTypeError) return contentTypeError;
    const sizeError = checkBodySize(request);
    if (sizeError) return sizeError;

    const { id } = await params;
    const body = await request.json();
    const { adminNotes } = body;

    if (typeof adminNotes !== "string") {
      return NextResponse.json(
        apiError(ErrorCode.VALIDATION_FAILED, "adminNotes must be a string"),
        { status: 400 }
      );
    }

    // Encrypt admin notes before storing
    const encryptedNotes = adminNotes ? encrypt(adminNotes) : null;

    const user = await prisma.user.update({
      where: { id },
      data: { adminNotes: encryptedNotes },
      select: { id: true, adminNotes: true },
    });

    // Return decrypted value to client
    user.adminNotes = adminNotes || null;

    // Audit log (fire-and-forget)
    logAuditEvent({
      userId: adminCheck.session.user.id,
      eventType: "admin.user_notes_update" as AuditEventType,
      resourceType: "user",
      resourceId: id,
    }).catch(() => {});

    return NextResponse.json(user);
  } catch (error) {
    logger.error({ error }, "Failed to update admin notes");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
