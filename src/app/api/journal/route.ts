import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { z } from "zod";
import {
  apiRateLimiter,
  checkRateLimit,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";

const metadataSchema = z
  .object({
    entryReason: z
      .enum(["trend-following", "mean-reversion", "breakout", "scalp", "other"])
      .optional(),
    exitReason: z
      .enum(["hit-tp", "hit-sl", "manual", "trailing", "time-based", "other"])
      .optional(),
    setupQuality: z.number().min(1).max(5).optional(),
    symbol: z.string().max(20).optional(),
    pnl: z.number().optional(),
    tags: z.array(z.string().max(50)).max(10).optional(),
  })
  .optional();

const createJournalSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  backtestProfit: z.number().nullable().optional(),
  backtestWinRate: z.number().min(0).max(100).nullable().optional(),
  backtestSharpe: z.number().nullable().optional(),
  instanceId: z.string().nullable().optional(),
  liveProfit: z.number().nullable().optional(),
  liveWinRate: z.number().min(0).max(100).nullable().optional(),
  liveSharpe: z.number().nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  metadata: metadataSchema,
  status: z.enum(["BACKTESTING", "DEMO", "LIVE", "STOPPED"]).optional(),
});

// GET /api/journal - List all journal entries for the current user
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
    }

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10) || 20)
    );
    const skip = (page - 1) * limit;
    const status = url.searchParams.get("status");
    const symbol = url.searchParams.get("symbol");
    const dateFrom = url.searchParams.get("dateFrom");
    const dateTo = url.searchParams.get("dateTo");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      userId: session.user.id,
      ...(status ? { status } : {}),
    };

    // Filter by symbol in metadata JSON
    if (symbol) {
      where.metadata = { path: ["symbol"], equals: symbol };
    }

    // Filter by date range
    if (dateFrom || dateTo) {
      where.startedAt = {};
      if (dateFrom) where.startedAt.gte = new Date(dateFrom);
      if (dateTo) where.startedAt.lte = new Date(dateTo);
    }

    const [entries, total] = await Promise.all([
      prisma.tradeJournal.findMany({
        where,
        orderBy: { startedAt: "desc" },
        include: {
          project: { select: { id: true, name: true } },
          instance: { select: { id: true, eaName: true, status: true } },
        },
        skip,
        take: limit,
      }),
      prisma.tradeJournal.count({ where }),
    ]);

    return NextResponse.json({
      data: entries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error({ error }, "Failed to list journal entries");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}

// POST /api/journal - Create a new journal entry
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
    }

    const rateLimitResult = await checkRateLimit(apiRateLimiter, session.user.id);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        apiError(ErrorCode.RATE_LIMITED, formatRateLimitError(rateLimitResult)),
        { status: 429, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    const body = await request.json();
    const validation = createJournalSchema.safeParse(body);

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

    const data = validation.data;

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id: data.projectId, userId: session.user.id, deletedAt: null },
    });

    if (!project) {
      return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "Project not found"), { status: 404 });
    }

    // Verify instance ownership if provided
    if (data.instanceId) {
      const instance = await prisma.liveEAInstance.findFirst({
        where: { id: data.instanceId, userId: session.user.id },
      });
      if (!instance) {
        return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "EA instance not found"), {
          status: 404,
        });
      }
    }

    const entry = await prisma.tradeJournal.create({
      data: {
        userId: session.user.id,
        projectId: data.projectId,
        backtestProfit: data.backtestProfit ?? null,
        backtestWinRate: data.backtestWinRate ?? null,
        backtestSharpe: data.backtestSharpe ?? null,
        instanceId: data.instanceId ?? null,
        liveProfit: data.liveProfit ?? null,
        liveWinRate: data.liveWinRate ?? null,
        liveSharpe: data.liveSharpe ?? null,
        notes: data.notes ?? null,
        metadata: data.metadata ?? Prisma.JsonNull,
        status: data.status ?? "BACKTESTING",
      },
      include: {
        project: { select: { id: true, name: true } },
        instance: { select: { id: true, eaName: true, status: true } },
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    logger.error({ error }, "Failed to create journal entry");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
