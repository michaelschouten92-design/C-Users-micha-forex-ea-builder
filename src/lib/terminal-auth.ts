import { NextResponse } from "next/server";
import { prisma } from "./prisma";
import { hashApiKey } from "./telemetry-auth";
import {
  telemetryPreauthRateLimiter,
  telemetryRateLimiter,
  checkRateLimit,
  getClientIp,
} from "./rate-limit";
import { apiError, ErrorCode } from "./error-codes";
import { checkContentType } from "./validations";
import { createHash, timingSafeEqual } from "crypto";

/** Strict hex key pattern: 32-128 hex chars */
const HEX_KEY_RE = /^[0-9a-fA-F]{32,128}$/;

function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

function safeHashCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
}

/**
 * Verify a terminal API key and return the terminal connection.
 * Returns null if the key is invalid or terminal is soft-deleted.
 */
async function verifyTerminalApiKey(
  apiKey: string
): Promise<{ terminalId: string; userId: string } | null> {
  const trimmed = apiKey.trim();
  if (!trimmed || !HEX_KEY_RE.test(trimmed)) return null;

  const hash = hashApiKey(trimmed);

  const terminal = await prisma.terminalConnection.findUnique({
    where: { apiKeyHash: hash },
    select: { id: true, userId: true, apiKeyHash: true, deletedAt: true },
  });

  if (terminal && !terminal.deletedAt && safeHashCompare(terminal.apiKeyHash, hash)) {
    return { terminalId: terminal.id, userId: terminal.userId };
  }

  return null;
}

/**
 * Authenticate a terminal request: IP rate limit → Content-Type →
 * key format → key verification → per-terminal rate limit.
 *
 * Same 5-step pipeline as authenticateTelemetry but resolves to
 * TerminalConnection instead of LiveEAInstance.
 */
export async function authenticateTerminal(
  request: Request
): Promise<
  { success: true; terminalId: string; userId: string } | { success: false; response: NextResponse }
> {
  // Step 1: IP-based pre-auth rate limit
  const clientIp = getClientIp(request);
  const ipKey = `terminal:preauth:${hashIp(clientIp)}`;
  const preauthResult = await checkRateLimit(telemetryPreauthRateLimiter, ipKey);

  if (!preauthResult.success) {
    return {
      success: false,
      response: NextResponse.json(apiError(ErrorCode.RATE_LIMITED, "Rate limit exceeded"), {
        status: 429,
      }),
    };
  }

  // Step 2: Content-Type check
  const ctError = checkContentType(request);
  if (ctError) {
    return {
      success: false,
      response: NextResponse.json(
        apiError(ErrorCode.INVALID_CONTENT_TYPE, "Content-Type must be application/json"),
        { status: 415 }
      ),
    };
  }

  // Step 3: Key presence + format
  const apiKey = request.headers.get("X-Terminal-Key")?.trim();

  if (!apiKey) {
    return {
      success: false,
      response: NextResponse.json(
        apiError(ErrorCode.MISSING_API_KEY, "Missing X-Terminal-Key header"),
        { status: 401 }
      ),
    };
  }

  if (!HEX_KEY_RE.test(apiKey)) {
    return {
      success: false,
      response: NextResponse.json(apiError(ErrorCode.INVALID_API_KEY, "Invalid API key format"), {
        status: 401,
      }),
    };
  }

  // Step 4: Key verification
  const terminal = await verifyTerminalApiKey(apiKey);
  if (!terminal) {
    return {
      success: false,
      response: NextResponse.json(apiError(ErrorCode.INVALID_API_KEY, "Invalid API key"), {
        status: 401,
      }),
    };
  }

  // Step 5: Per-terminal rate limit
  const terminalResult = await checkRateLimit(
    telemetryRateLimiter,
    `terminal:${terminal.terminalId}`
  );

  if (!terminalResult.success) {
    return {
      success: false,
      response: NextResponse.json(apiError(ErrorCode.RATE_LIMITED, "Rate limit exceeded"), {
        status: 429,
      }),
    };
  }

  return { success: true, ...terminal };
}
