import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { checkAdmin } from "@/lib/admin";
import { logAuditEvent } from "@/lib/audit";
import type { AuditEventType } from "@/lib/audit";
import { checkContentType, checkBodySize } from "@/lib/validations";

const segmentFiltersSchema = z
  .object({
    tier: z.enum(["FREE", "PRO", "ELITE"]).optional(),
  })
  .strict();

const createSegmentSchema = z.object({
  name: z.string().min(1).max(100),
  filters: segmentFiltersSchema,
});

// GET /api/admin/segments - List all segments
export async function GET() {
  try {
    const adminCheck = await checkAdmin();
    if (!adminCheck.authorized) return adminCheck.response;

    const segments = await prisma.userSegment.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      data: segments.map((s) => ({
        ...s,
        filters: JSON.parse(s.filters),
      })),
    });
  } catch (error) {
    logger.error({ error }, "Failed to list segments");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}

// POST /api/admin/segments - Create a segment
export async function POST(request: Request) {
  try {
    const adminCheck = await checkAdmin();
    if (!adminCheck.authorized) return adminCheck.response;

    const contentTypeError = checkContentType(request);
    if (contentTypeError) return contentTypeError;
    const sizeError = checkBodySize(request);
    if (sizeError) return sizeError;

    const body = await request.json();
    const validation = createSegmentSchema.safeParse(body);
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

    const { name, filters } = validation.data;

    const segment = await prisma.userSegment.create({
      data: {
        name,
        filters: JSON.stringify(filters),
        createdBy: adminCheck.session.user.id,
      },
    });

    // Audit log (fire-and-forget)
    logAuditEvent({
      userId: adminCheck.session.user.id,
      eventType: "admin.segment_create" as AuditEventType,
      resourceType: "segment",
      resourceId: segment.id,
      metadata: { name },
    }).catch(() => {});

    return NextResponse.json({
      ...segment,
      filters: JSON.parse(segment.filters),
    });
  } catch (error) {
    logger.error({ error }, "Failed to create segment");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}

// DELETE /api/admin/segments - Delete a segment
export async function DELETE(request: Request) {
  try {
    const adminCheck = await checkAdmin();
    if (!adminCheck.authorized) return adminCheck.response;

    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id || !z.string().cuid().safeParse(id).success) {
      return NextResponse.json(
        apiError(ErrorCode.VALIDATION_FAILED, "Missing or invalid segment id"),
        {
          status: 400,
        }
      );
    }

    const existing = await prisma.userSegment.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "Segment not found"), { status: 404 });
    }

    await prisma.userSegment.delete({ where: { id } });

    // Audit log (fire-and-forget)
    logAuditEvent({
      userId: adminCheck.session.user.id,
      eventType: "admin.segment_delete" as AuditEventType,
      resourceType: "segment",
      resourceId: id,
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Failed to delete segment");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
