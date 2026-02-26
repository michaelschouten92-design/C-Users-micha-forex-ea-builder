import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { audit } from "@/lib/audit";

// POST /api/admin/users/stop-impersonate — Stop impersonating
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
    }

    // Only allow if currently impersonating
    if (!session.user.impersonatorId) {
      return NextResponse.json(
        apiError(ErrorCode.VALIDATION_FAILED, "Not currently impersonating"),
        { status: 400 }
      );
    }

    // Audit log
    audit
      .impersonationStop(
        session.user.impersonatorId,
        session.user.id,
        session.user.email ?? "unknown"
      )
      .catch((err) => {
        logger.error({ err }, "Audit log failed: impersonation_stop");
      });

    return NextResponse.json({ stopImpersonation: true });
  } catch (error) {
    logger.error({ error }, "Failed to stop impersonation");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
