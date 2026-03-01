/**
 * Internal-only CSV trade import endpoint.
 *
 * POST /api/internal/trades/import-csv
 *
 * Auth: x-internal-api-key header (timing-safe comparison)
 *
 * Request body (JSON):
 *   {
 *     strategyId: string,         // Strategy to ingest facts for
 *     source: "BACKTEST" | "LIVE",
 *     csv: string,                // Raw CSV content
 *     backtestRunId?: string,     // Optional source run reference
 *     symbolFallback?: string,    // Fallback symbol if CSV lacks symbol column
 *     initialBalance: number,     // Required for snapshot hash computation
 *   }
 *
 * Expected CSV header (case-insensitive, order-independent):
 *   ticket,openTime,type,volume,price,profit
 *
 * Optional CSV columns:
 *   sl,tp,symbol,comment
 *
 * Response (200):
 *   {
 *     insertedCount: number,
 *     skippedCount: number,
 *     tradeFactCount: number,
 *     tradeSnapshotHash: string,
 *     backtestRunId?: string
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { timingSafeEqual } from "@/lib/csrf";
import { ErrorCode, apiError } from "@/lib/error-codes";
import {
  checkRateLimit,
  internalTradeImportRateLimiter,
  getClientIp,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";
import { checkContentType, safeReadJson, validate, formatZodErrors } from "@/lib/validations";
import {
  runCsvIngestPipeline,
  CsvParseError,
  TradeFactValidationError,
} from "@/domain/trade-ingest/csv/run-csv-ingest-pipeline";

const importCsvSchema = z.object({
  strategyId: z.string().min(1),
  source: z.enum(["BACKTEST", "LIVE"]),
  csv: z.string().min(1),
  backtestRunId: z.string().optional(),
  symbolFallback: z.string().optional(),
  initialBalance: z.number().positive(),
});

function authenticateInternal(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-internal-api-key");
  const expectedKey = process.env.INTERNAL_API_KEY;

  if (!expectedKey) return false;
  if (!apiKey) return false;

  return timingSafeEqual(apiKey, expectedKey);
}

export async function POST(request: NextRequest) {
  if (!authenticateInternal(request)) {
    return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
  }

  const ip = getClientIp(request);
  const rl = await checkRateLimit(internalTradeImportRateLimiter, `internal-trade-import:${ip}`);
  if (!rl.success) {
    return NextResponse.json(apiError(ErrorCode.RATE_LIMITED, formatRateLimitError(rl)), {
      status: 429,
      headers: createRateLimitHeaders(rl),
    });
  }

  const ctError = checkContentType(request);
  if (ctError) return ctError;

  const bodyResult = await safeReadJson(request);
  if ("error" in bodyResult) return bodyResult.error;

  const validation = validate(importCsvSchema, bodyResult.data);
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

  try {
    const result = await runCsvIngestPipeline({
      strategyId,
      source,
      csv,
      backtestRunId,
      symbolFallback,
      initialBalance,
    });
    return NextResponse.json({
      ...result,
      ...(backtestRunId && { backtestRunId }),
    });
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
