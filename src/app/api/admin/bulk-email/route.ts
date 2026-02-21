import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { checkAdmin } from "@/lib/admin";
import { logAuditEvent } from "@/lib/audit";
import type { AuditEventType } from "@/lib/audit";
import { sendBulkAdminEmail } from "@/lib/email";
import { getUserEmailsBySegment } from "@/lib/segment-filter";
import { checkContentType, checkBodySize } from "@/lib/validations";
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
    const sizeError = checkBodySize(request);
    if (sizeError) return sizeError;

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

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(apiError(ErrorCode.INVALID_JSON, "Invalid JSON body"), {
        status: 400,
      });
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

    // Batch send with concurrency limit of 5 and delay between batches
    let sent = 0;
    const failed: string[] = [];
    const BATCH_SIZE = 5;

    for (let i = 0; i < emails.length; i += BATCH_SIZE) {
      const batch = emails.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((email) => sendBulkAdminEmail(email, subject, message))
      );

      for (let j = 0; j < results.length; j++) {
        if (results[j].status === "fulfilled") {
          sent++;
        } else {
          failed.push(batch[j]);
        }
      }

      // Rate limit: 200ms delay between batches to avoid overwhelming Resend API
      if (i + BATCH_SIZE < emails.length) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    // Audit log
    logAuditEvent({
      userId: adminCheck.session.user.id,
      eventType: "admin.bulk_email_sent" as AuditEventType,
      metadata: { subject, targetType, totalTargets: emails.length, sent, failed: failed.length },
    }).catch(() => {});

    return NextResponse.json({ sent, failed: failed.length, total: emails.length });
  } catch (error) {
    logger.error({ error }, "Failed to send bulk email");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
