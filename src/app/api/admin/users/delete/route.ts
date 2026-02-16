import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { sendAccountDeletedEmail } from "@/lib/email";
import { checkAdmin } from "@/lib/admin";

const deleteSchema = z.object({
  email: z.string().email(),
});

// POST /api/admin/users/delete - Delete a user account (admin only)
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

    const validation = deleteSchema.safeParse(body);
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

    // Prevent admin from deleting themselves
    if (email === adminCheck.adminEmail) {
      return NextResponse.json(
        apiError(ErrorCode.FORBIDDEN, "Cannot delete your own admin account"),
        { status: 403 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: { subscription: true },
    });

    if (!user) {
      return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "User not found"), { status: 404 });
    }

    // Cancel Stripe subscription if active
    if (user.subscription?.stripeSubId) {
      try {
        const { getStripe } = await import("@/lib/stripe");
        const stripeSub = await getStripe().subscriptions.retrieve(user.subscription.stripeSubId);
        if (stripeSub.status !== "canceled") {
          await getStripe().subscriptions.cancel(user.subscription.stripeSubId);
        }
      } catch (stripeError) {
        const err = stripeError as { code?: string; statusCode?: number };
        if (err.statusCode === 404 || err.code === "resource_missing") {
          logger.warn(
            { userId: user.id },
            "Stripe subscription already deleted, proceeding with admin account deletion"
          );
        } else {
          logger.error(
            { error: stripeError, userId: user.id },
            "Failed to cancel Stripe subscription during admin account deletion"
          );
          return NextResponse.json(
            apiError(ErrorCode.INTERNAL_ERROR, "Failed to cancel Stripe subscription"),
            { status: 500 }
          );
        }
      }
    }

    // Delete all user data in a transaction
    await prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.deleteMany({ where: { email } });
      await tx.emailVerificationToken.deleteMany({ where: { email } });
      await tx.auditLog.deleteMany({ where: { userId: user.id } });
      await tx.user.delete({ where: { id: user.id } });
    });

    logger.info(
      { userId: user.id, email, deletedBy: adminCheck.session.user.id },
      "Admin account deletion completed"
    );

    // Send confirmation email (fire-and-forget)
    sendAccountDeletedEmail(email).catch(() => {});

    return NextResponse.json({ success: true, email });
  } catch (error) {
    logger.error({ error }, "Failed to delete user (admin)");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
