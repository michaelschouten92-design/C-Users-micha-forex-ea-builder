/**
 * Internal HMAC-signed webhook ingest endpoint.
 *
 * POST /api/internal/trades/webhook-ingest
 *
 * Auth: HMAC-SHA256 signature via x-ingest-signature / x-ingest-timestamp headers.
 * Replay protection: ±5 min timestamp window.
 *
 * Request body (JSON — same schema as import-csv):
 *   {
 *     strategyId: string,
 *     source: "BACKTEST" | "LIVE",
 *     csv: string,
 *     backtestRunId?: string,
 *     symbolFallback?: string,
 *     initialBalance: number,
 *   }
 *
 * Response (200):
 *   {
 *     insertedCount: number,
 *     skippedCount: number,
 *     tradeFactCount: number,
 *     tradeSnapshotHash: string,
 *     recordId: string,
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ErrorCode, apiError } from "@/lib/error-codes";
import {
  checkRateLimit,
  internalWebhookIngestRateLimiter,
  getClientIp,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";
import { checkContentType, parseJsonBody, validate, formatZodErrors } from "@/lib/validations";
import { verifyWebhookSignature } from "@/lib/webhook-signature";
import {
  runCsvIngestPipeline,
  CsvParseError,
  TradeFactValidationError,
} from "@/domain/trade-ingest/csv/run-csv-ingest-pipeline";

const ingestSchema = z.object({
  strategyId: z.string().min(1),
  source: z.enum(["BACKTEST", "LIVE"]),
  csv: z.string().min(1),
  backtestRunId: z.string().optional(),
  symbolFallback: z.string().optional(),
  initialBalance: z.number().positive(),
});

export async function POST(request: NextRequest) {
  // 1. Read raw body FIRST (stream consumed once) — needed for HMAC
  const rawBody = await request.text();

  // 2. Verify HMAC signature
  const signature = request.headers.get("x-ingest-signature") ?? "";
  const timestamp = request.headers.get("x-ingest-timestamp") ?? "";
  const secret = process.env.INGEST_WEBHOOK_SECRET ?? "";

  const verification = verifyWebhookSignature({ rawBody, signature, timestamp, secret });
  if (!verification.valid) {
    return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
  }

  // 3. Rate limit
  const ip = getClientIp(request);
  const rl = await checkRateLimit(internalWebhookIngestRateLimiter, `webhook-ingest:${ip}`);
  if (!rl.success) {
    return NextResponse.json(apiError(ErrorCode.RATE_LIMITED, formatRateLimitError(rl)), {
      status: 429,
      headers: createRateLimitHeaders(rl),
    });
  }

  // 4. Check content type
  const ctError = checkContentType(request);
  if (ctError) return ctError;

  // 5. Parse JSON from already-read raw body (stream already consumed)
  const parsed = parseJsonBody(rawBody);
  if (!parsed.success) {
    const status = parsed.status;
    if (status === 413) {
      return NextResponse.json(apiError(ErrorCode.REQUEST_TOO_LARGE, parsed.error), {
        status: 413,
      });
    }
    return NextResponse.json(apiError(ErrorCode.INVALID_JSON, parsed.error), { status: 400 });
  }

  // 6. Zod validate
  const validation = validate(ingestSchema, parsed.data);
  if (!validation.success) {
    return NextResponse.json(
      apiError(
        ErrorCode.VALIDATION_FAILED,
        "Invalid request body",
        formatZodErrors(validation.error)
      ),
      { status: 400 }
    );
  }

  const { strategyId, source, csv, backtestRunId, symbolFallback, initialBalance } =
    validation.data;

  // 7. Run shared pipeline with webhook proof metadata
  try {
    const result = await runCsvIngestPipeline({
      strategyId,
      source,
      csv,
      backtestRunId,
      symbolFallback,
      initialBalance,
      proofPayloadExtras: { webhookVerified: true },
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof CsvParseError) {
      return NextResponse.json(apiError(ErrorCode.PARSE_FAILED, "CSV parse failed", err.details), {
        status: 400,
      });
    }
    if (err instanceof TradeFactValidationError) {
      return NextResponse.json(
        apiError(ErrorCode.VALIDATION_FAILED, "Trade validation failed", err.violations),
        { status: 400 }
      );
    }
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
