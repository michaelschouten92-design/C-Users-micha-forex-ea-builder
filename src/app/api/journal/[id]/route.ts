import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

type Params = { params: Promise<{ id: string }> };

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

const updateJournalSchema = z.object({
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

// GET /api/journal/[id] - Get a single journal entry
export async function GET(request: Request, { params }: Params): Promise<NextResponse> {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
    }

    const entry = await prisma.tradeJournal.findFirst({
      where: { id, userId: session.user.id },
      include: {
        project: { select: { id: true, name: true } },
        instance: { select: { id: true, eaName: true, status: true } },
      },
    });

    if (!entry) {
      return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "Journal entry not found"), {
        status: 404,
      });
    }

    return NextResponse.json(entry);
  } catch (error) {
    logger.error({ error }, "Failed to get journal entry");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}

// PUT /api/journal/[id] - Update a journal entry
export async function PUT(request: Request, { params }: Params): Promise<NextResponse> {
  try {
    const session = await auth();
    const { id } = await params;

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

    const existing = await prisma.tradeJournal.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "Journal entry not found"), {
        status: 404,
      });
    }

    const body = await request.json();
    const validation = updateJournalSchema.safeParse(body);

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

    // Verify instance ownership if changing instance
    if (data.instanceId && data.instanceId !== existing.instanceId) {
      const instance = await prisma.liveEAInstance.findFirst({
        where: { id: data.instanceId, userId: session.user.id, deletedAt: null },
      });
      if (!instance) {
        return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "EA instance not found"), {
          status: 404,
        });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (data.backtestProfit !== undefined) updateData.backtestProfit = data.backtestProfit;
    if (data.backtestWinRate !== undefined) updateData.backtestWinRate = data.backtestWinRate;
    if (data.backtestSharpe !== undefined) updateData.backtestSharpe = data.backtestSharpe;
    if (data.instanceId !== undefined) updateData.instanceId = data.instanceId;
    if (data.liveProfit !== undefined) updateData.liveProfit = data.liveProfit;
    if (data.liveWinRate !== undefined) updateData.liveWinRate = data.liveWinRate;
    if (data.liveSharpe !== undefined) updateData.liveSharpe = data.liveSharpe;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.metadata !== undefined) updateData.metadata = data.metadata;
    if (data.status !== undefined) updateData.status = data.status;

    const entry = await prisma.tradeJournal.update({
      where: { id },
      data: updateData,
      include: {
        project: { select: { id: true, name: true } },
        instance: { select: { id: true, eaName: true, status: true } },
      },
    });

    return NextResponse.json(entry);
  } catch (error) {
    logger.error({ error }, "Failed to update journal entry");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}

// DELETE /api/journal/[id] - Delete a journal entry
export async function DELETE(request: Request, { params }: Params): Promise<NextResponse> {
  try {
    const session = await auth();
    const { id } = await params;

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

    const existing = await prisma.tradeJournal.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "Journal entry not found"), {
        status: 404,
      });
    }

    await prisma.tradeJournal.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Failed to delete journal entry");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
