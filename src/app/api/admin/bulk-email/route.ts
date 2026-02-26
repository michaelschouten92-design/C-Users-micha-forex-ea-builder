import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { checkAdmin } from "@/lib/admin";
import { logAuditEvent } from "@/lib/audit";
import type { AuditEventType } from "@/lib/audit";
import { enqueueNotification } from "@/lib/outbox";
import { getUserEmailsBySegment } from "@/lib/segment-filter";
import { checkContentType, safeReadJson } from "@/lib/validations";
import {
  adminBulkRateLimiter,
  checkRateLimit,
  formatRateLimitError,
  createRateLimitHeaders,
} from "@/lib/rate-limit";

const bulkEmailSchema = z.object({
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
  targetType: z.enum(["all", "segment", "selected"]),
  segmentId: z.string().optional(),
  userIds: z.array(z.string()).optional(),
});

// POST /api/admin/bulk-email - Send bulk email
export async function POST(request: Request) {
  try {
    const adminCheck = await checkAdmin();
    if (!adminCheck.authorized) return adminCheck.response;

    const contentTypeError = checkContentType(request);
    if (contentTypeError) return contentTypeError;

    const result = await safeReadJson(request);
    if ("error" in result) return result.error;
    const body = result.data;

    const rl = await checkRateLimit(
      adminBulkRateLimiter,
      `admin-bulk:${adminCheck.session.user.id}`
    );
    if (!rl.success) {
      return NextResponse.json(
        { error: formatRateLimitError(rl) },
        { status: 429, headers: createRateLimitHeaders(rl) }
      );
    }

    const validation = bulkEmailSchema.safeParse(body);
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

    const { subject, message, targetType, segmentId, userIds } = validation.data;

    // Resolve target emails
    let emails: string[] = [];

    if (targetType === "all") {
      const users = await prisma.user.findMany({
        select: { email: true },
        take: 10000, // Safety cap to prevent OOM
        orderBy: { createdAt: "desc" },
      });
      emails = users.map((u) => u.email);
    } else if (targetType === "segment" && segmentId) {
      emails = await getUserEmailsBySegment(segmentId);
    } else if (targetType === "selected" && userIds && userIds.length > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { email: true },
      });
      emails = users.map((u) => u.email);
    }

    if (emails.length === 0) {
      return NextResponse.json(
        apiError(ErrorCode.VALIDATION_FAILED, "No target recipients found"),
        { status: 400 }
      );
    }

    // Enqueue all emails via outbox (processed by cron, avoids request timeout)
    const adminUserId = adminCheck.session.user.id;
    let enqueued = 0;

    for (const email of emails) {
      await enqueueNotification({
        userId: adminUserId,
        channel: "EMAIL",
        destination: email,
        subject,
        payload: { html: message },
      });
      enqueued++;
    }

    // Audit log
    logAuditEvent({
      userId: adminUserId,
      eventType: "admin.bulk_email_sent" as AuditEventType,
      metadata: { subject, targetType, totalTargets: emails.length, enqueued },
    }).catch((err) => {
      logger.error({ err }, "Audit log failed: bulk_email");
    });

    return NextResponse.json({ enqueued, total: emails.length });
  } catch (error) {
    logger.error({ error }, "Failed to send bulk email");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
