import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { checkAdmin } from "@/lib/admin";
import { logAuditEvent } from "@/lib/audit";
import { checkContentType, safeReadJson } from "@/lib/validations";

const updateIncidentSchema = z.object({
  status: z.enum(["acknowledged", "resolved"]),
});

// PATCH /api/admin/incidents/[id] - Update incident status
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminCheck = await checkAdmin();
    if (!adminCheck.authorized) return adminCheck.response;

    const { id } = await params;

    const idValidation = z.string().cuid().safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json(apiError(ErrorCode.VALIDATION_FAILED, "Invalid incident id"), {
        status: 400,
      });
    }

    const contentTypeError = checkContentType(request);
    if (contentTypeError) return contentTypeError;

    const result = await safeReadJson(request);
    if ("error" in result) return result.error;
    const body = result.data;

    const validation = updateIncidentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        apiError(ErrorCode.VALIDATION_FAILED, "status must be 'acknowledged' or 'resolved'"),
        { status: 400 }
      );
    }

    const existing = await prisma.adminIncident.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "Incident not found"), {
        status: 404,
      });
    }

    const data: Record<string, unknown> = { status: validation.data.status };
    if (validation.data.status === "resolved") {
      data.resolvedAt = new Date();
      data.resolvedBy = adminCheck.session.user.id;
    }

    const incident = await prisma.adminIncident.update({
      where: { id },
      data,
    });

    // Audit log (fire-and-forget)
    logAuditEvent({
      userId: adminCheck.session.user.id,
      eventType: "admin.incident_update",
      resourceType: "AdminIncident",
      resourceId: id,
      metadata: { newStatus: validation.data.status },
    }).catch((err) => {
      logger.error({ err }, "Audit log failed: incident_update");
    });

    return NextResponse.json(incident);
  } catch (error) {
    logger.error({ error }, "Failed to update incident");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
