import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canMonitorAdditionalTradingAccount } from "@/lib/plan-limits";
import { ErrorCode, apiError } from "@/lib/error-codes";
import {
  checkRateLimit,
  createRateLimitHeaders,
  formatRateLimitError,
  apiRateLimiter,
} from "@/lib/rate-limit";
import { createApiLogger, extractErrorDetails } from "@/lib/logger";
import { logAuditEvent } from "@/lib/audit";

const registerSchema = z.object({
  label: z
    .string()
    .min(1, "Terminal label is required")
    .max(100, "Label must be 100 characters or less")
    .trim(),
  broker: z.string().max(100).trim().optional(),
  accountNumber: z.string().max(50).trim().optional(),
});

/**
 * POST /api/live/terminal/register — Register a new terminal connection.
 * Returns an API key that the Monitor EA uses for terminal-level auth.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  const log = createApiLogger("/api/live/terminal/register", "POST", session?.user?.id);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.suspended) {
    return NextResponse.json(apiError(ErrorCode.ACCOUNT_SUSPENDED, "Account suspended"), {
      status: 403,
    });
  }

  const rateLimitResult = await checkRateLimit(
    apiRateLimiter,
    `register-terminal:${session.user.id}`
  );
  const rateLimitHeaders = createRateLimitHeaders(rateLimitResult);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded", details: formatRateLimitError(rateLimitResult) },
      { status: 429, headers: rateLimitHeaders }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: rateLimitHeaders });
  }

  const validation = registerSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.flatten().fieldErrors },
      { status: 400, headers: rateLimitHeaders }
    );
  }

  const { label, broker, accountNumber } = validation.data;

  try {
    const accountCheck = await canMonitorAdditionalTradingAccount(session.user.id);
    if (!accountCheck.allowed) {
      return NextResponse.json(
        apiError(
          ErrorCode.PLAN_REQUIRED,
          "Account limit reached",
          `Your ${accountCheck.tierDisplayName} plan allows ${accountCheck.max === -1 ? "unlimited" : accountCheck.max} monitored trading account${accountCheck.max === 1 ? "" : "s"}. Upgrade to monitor more accounts.`
        ),
        { status: 403, headers: rateLimitHeaders }
      );
    }

    const apiKey = randomBytes(32).toString("hex");
    const apiKeyHash = createHash("sha256").update(apiKey).digest("hex");

    const terminal = await prisma.terminalConnection.create({
      data: {
        userId: session.user.id,
        label,
        apiKeyHash,
        broker: broker ?? null,
        accountNumber: accountNumber ?? null,
      },
    });

    log.info({ terminalId: terminal.id, label }, "Terminal registered");

    await logAuditEvent({
      userId: session.user.id,
      eventType: "live.terminal_registered",
      resourceType: "terminal_connection",
      resourceId: terminal.id,
      metadata: { label },
    });

    return NextResponse.json(
      {
        terminalId: terminal.id,
        apiKey,
        label: terminal.label,
      },
      { headers: rateLimitHeaders }
    );
  } catch (error) {
    log.error({ error: extractErrorDetails(error) }, "Failed to register terminal");
    return NextResponse.json(
      { error: "Failed to register terminal. Please try again." },
      { status: 500, headers: rateLimitHeaders }
    );
  }
}
