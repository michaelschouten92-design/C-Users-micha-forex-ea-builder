import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { checkAdmin } from "@/lib/admin";
import { logAuditEvent } from "@/lib/audit";
import type { AuditEventType } from "@/lib/audit";

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

    const body = await request.json();
    const { name, filters } = body;

    if (!name || typeof name !== "string" || name.length > 100) {
      return NextResponse.json(
        apiError(ErrorCode.VALIDATION_FAILED, "Name is required (max 100 chars)"),
        { status: 400 }
      );
    }

    if (!filters || typeof filters !== "object") {
      return NextResponse.json(
        apiError(ErrorCode.VALIDATION_FAILED, "Filters object is required"),
        { status: 400 }
      );
    }

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

    if (!id) {
      return NextResponse.json(apiError(ErrorCode.VALIDATION_FAILED, "Segment id is required"), {
        status: 400,
      });
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
