import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { checkContentType, safeReadJson } from "@/lib/validations";
import {
  changePasswordRateLimiter,
  checkRateLimit,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { SALT_ROUNDS } from "@/lib/auth";

const log = logger.child({ route: "/api/account/change-password" });

const schema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters")
    .max(72, "Password must be 72 characters or less"),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentTypeError = checkContentType(request);
  if (contentTypeError) return contentTypeError;

  const result = await safeReadJson(request);
  if ("error" in result) return result.error;
  const body = result.data;

  try {
    // Rate limit
    const rateLimitResult = await checkRateLimit(
      changePasswordRateLimiter,
      `change-pw:${session.user.id}`
    );
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: formatRateLimitError(rateLimitResult) },
        { status: 429, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { currentPassword, newPassword } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true },
    });

    if (!user?.passwordHash) {
      return NextResponse.json(
        { error: "This account uses a different login method" },
        { status: 400 }
      );
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }

    const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await prisma.user.update({
      where: { id: session.user.id },
      data: { passwordHash: newHash, passwordChangedAt: new Date() },
    });

    log.info(
      { userId: session.user.id, action: "password_change", audit: true },
      "Password changed successfully"
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error({ error }, "Change password failed");
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
