import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { checkAdmin } from "@/lib/admin";

// GET /api/admin/announcements - List all announcements (admin)
export async function GET() {
  try {
    const adminCheck = await checkAdmin();
    if (!adminCheck.authorized) return adminCheck.response;

    const announcements = await prisma.announcement.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        segment: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ data: announcements });
  } catch (error) {
    logger.error({ error }, "Failed to fetch announcements");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}

const createSchema = z.object({
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
  type: z.enum(["info", "warning", "maintenance"]).default("info"),
  active: z.boolean().default(true),
  expiresAt: z.string().datetime().optional(),
  scheduledAt: z.string().datetime().optional(),
  segmentId: z.string().optional(),
});

// POST /api/admin/announcements - Create announcement
export async function POST(request: Request) {
  try {
    const adminCheck = await checkAdmin();
    if (!adminCheck.authorized) return adminCheck.response;

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(apiError(ErrorCode.INVALID_JSON, "Invalid JSON body"), {
        status: 400,
      });
    }

    const validation = createSchema.safeParse(body);
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

    const { title, message, type, active, expiresAt, scheduledAt, segmentId } = validation.data;

    // If scheduledAt is in the future, set active to false automatically
    const isScheduledFuture = scheduledAt && new Date(scheduledAt) > new Date();
    const effectiveActive = isScheduledFuture ? false : active;

    const announcement = await prisma.announcement.create({
      data: {
        title,
        message,
        type,
        active: effectiveActive,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        segmentId: segmentId || null,
        createdBy: adminCheck.session.user.id,
      },
    });

    return NextResponse.json(announcement, { status: 201 });
  } catch (error) {
    logger.error({ error }, "Failed to create announcement");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}

const updateSchema = z.object({
  id: z.string(),
  active: z.boolean().optional(),
  title: z.string().min(1).max(200).optional(),
  message: z.string().min(1).max(2000).optional(),
  type: z.enum(["info", "warning", "maintenance"]).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
  segmentId: z.string().nullable().optional(),
});

// PATCH /api/admin/announcements - Update announcement
export async function PATCH(request: Request) {
  try {
    const adminCheck = await checkAdmin();
    if (!adminCheck.authorized) return adminCheck.response;

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(apiError(ErrorCode.INVALID_JSON, "Invalid JSON body"), {
        status: 400,
      });
    }

    const validation = updateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(apiError(ErrorCode.VALIDATION_FAILED, "Validation failed"), {
        status: 400,
      });
    }

    const { id, ...updateData } = validation.data;

    const data: Record<string, unknown> = {};
    if (updateData.active !== undefined) data.active = updateData.active;
    if (updateData.title !== undefined) data.title = updateData.title;
    if (updateData.message !== undefined) data.message = updateData.message;
    if (updateData.type !== undefined) data.type = updateData.type;
    if (updateData.expiresAt !== undefined) {
      data.expiresAt = updateData.expiresAt ? new Date(updateData.expiresAt) : null;
    }
    if (updateData.scheduledAt !== undefined) {
      data.scheduledAt = updateData.scheduledAt ? new Date(updateData.scheduledAt) : null;
    }
    if (updateData.segmentId !== undefined) {
      data.segmentId = updateData.segmentId;
    }

    const announcement = await prisma.announcement.update({
      where: { id },
      data,
    });

    return NextResponse.json(announcement);
  } catch (error) {
    logger.error({ error }, "Failed to update announcement");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}

// DELETE /api/admin/announcements - Delete announcement
export async function DELETE(request: Request) {
  try {
    const adminCheck = await checkAdmin();
    if (!adminCheck.authorized) return adminCheck.response;

    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json(apiError(ErrorCode.VALIDATION_FAILED, "Missing id"), {
        status: 400,
      });
    }

    await prisma.announcement.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Failed to delete announcement");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
