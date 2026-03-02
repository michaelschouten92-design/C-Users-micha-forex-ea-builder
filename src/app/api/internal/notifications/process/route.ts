import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { timingSafeEqual } from "@/lib/csrf";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import {
  checkRateLimit,
  internalNotificationProcessRateLimiter,
  getClientIp,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { deliverTransitionAlert } from "@/lib/notifications/notify";
import type { TransitionAlert } from "@/lib/notifications/notify";

const log = logger.child({ route: "/api/internal/notifications/process" });

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;
const MAX_BACKOFF_MS = 3_600_000; // 1 hour
const LAST_ERROR_MAX_LENGTH = 500;

const processSchema = z.object({
  limit: z.number().int().min(1).max(MAX_LIMIT).optional(),
});

function authenticateInternal(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-internal-api-key");
  const expectedKey = process.env.INTERNAL_API_KEY;

  if (!expectedKey) return false;
  if (!apiKey) return false;

  return timingSafeEqual(apiKey, expectedKey);
}

function computeBackoff(attempts: number): number {
  return Math.min(Math.pow(2, attempts) * 30_000, MAX_BACKOFF_MS);
}

export async function POST(request: NextRequest) {
  if (!authenticateInternal(request)) {
    return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
  }

  const ip = getClientIp(request);
  const rl = await checkRateLimit(
    internalNotificationProcessRateLimiter,
    `internal-notification-process:${ip}`
  );
  if (!rl.success) {
    return NextResponse.json(apiError(ErrorCode.RATE_LIMITED, formatRateLimitError(rl)), {
      status: 429,
      headers: createRateLimitHeaders(rl),
    });
  }

  // Parse optional body (limit param)
  let limit = DEFAULT_LIMIT;
  try {
    const text = await request.text();
    if (text.trim()) {
      const body = JSON.parse(text);
      const validation = processSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(apiError(ErrorCode.VALIDATION_FAILED, "Invalid request body"), {
          status: 400,
        });
      }
      limit = validation.data.limit ?? DEFAULT_LIMIT;
    }
  } catch {
    return NextResponse.json(apiError(ErrorCode.VALIDATION_FAILED, "Invalid JSON"), {
      status: 400,
    });
  }

  const rows = await prisma.alertOutbox.findMany({
    where: {
      status: { in: ["PENDING", "FAILED"] },
      nextAttemptAt: { lte: new Date() },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  let sent = 0;
  let failed = 0;

  for (const row of rows) {
    // Optimistic lock: only process if still PENDING/FAILED
    const lockResult = await prisma.alertOutbox.updateMany({
      where: { id: row.id, status: { in: ["PENDING", "FAILED"] } },
      data: { status: "SENDING" },
    });
    if (lockResult.count === 0) continue;

    try {
      await deliverTransitionAlert(row.payload as unknown as TransitionAlert);
      await prisma.alertOutbox.update({
        where: { id: row.id },
        data: { status: "SENT" },
      });
      sent++;
    } catch (error) {
      const newAttempts = row.attempts + 1;
      const lastError = (error instanceof Error ? error.message : String(error)).slice(
        0,
        LAST_ERROR_MAX_LENGTH
      );
      await prisma.alertOutbox.update({
        where: { id: row.id },
        data: {
          status: "FAILED",
          attempts: newAttempts,
          lastError,
          nextAttemptAt: new Date(Date.now() + computeBackoff(newAttempts)),
        },
      });
      failed++;
      log.warn({ alertId: row.id, attempts: newAttempts, lastError }, "Alert delivery failed");
    }
  }

  return NextResponse.json({ processed: rows.length, sent, failed });
}

export async function GET(request: NextRequest) {
  if (!authenticateInternal(request)) {
    return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
  }

  const [pending, failed, sending] = await Promise.all([
    prisma.alertOutbox.count({ where: { status: "PENDING" } }),
    prisma.alertOutbox.count({ where: { status: "FAILED" } }),
    prisma.alertOutbox.count({ where: { status: "SENDING" } }),
  ]);

  return NextResponse.json({ pending, failed, sending });
}
