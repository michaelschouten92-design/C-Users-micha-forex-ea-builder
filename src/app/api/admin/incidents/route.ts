import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { checkAdmin } from "@/lib/admin";
import { logAuditEvent } from "@/lib/audit";
import { checkContentType, safeReadJson } from "@/lib/validations";

const createIncidentSchema = z.object({
  severity: z.enum(["critical", "high", "warning", "info"]),
  category: z.enum(["ea_silent", "strategy_degraded", "export_failure", "system", "manual"]),
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  sourceType: z.enum(["LiveEAInstance", "HealthSnapshot", "ExportJob"]).optional(),
  sourceId: z.string().optional(),
});

// GET /api/admin/incidents - List incidents with filters
export async function GET(request: Request) {
  try {
    const adminCheck = await checkAdmin();
    if (!adminCheck.authorized) return adminCheck.response;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const severity = searchParams.get("severity");
    const category = searchParams.get("category");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (severity) where.severity = severity;
    if (category) where.category = category;

    const [incidents, total] = await Promise.all([
      prisma.adminIncident.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.adminIncident.count({ where }),
    ]);

    return NextResponse.json({
      data: incidents,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error({ error }, "Failed to fetch incidents");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}

// POST /api/admin/incidents - Create a new incident
export async function POST(request: Request) {
  try {
    const adminCheck = await checkAdmin();
    if (!adminCheck.authorized) return adminCheck.response;

    const contentTypeError = checkContentType(request);
    if (contentTypeError) return contentTypeError;

    const result = await safeReadJson(request);
    if ("error" in result) return result.error;
    const body = result.data;

    const validation = createIncidentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        apiError(ErrorCode.VALIDATION_FAILED, validation.error.issues[0].message),
        { status: 400 }
      );
    }

    const incident = await prisma.adminIncident.create({
      data: validation.data,
    });

    // Audit log (fire-and-forget)
    logAuditEvent({
      userId: adminCheck.session.user.id,
      eventType: "admin.incident_create",
      resourceType: "AdminIncident",
      resourceId: incident.id,
    }).catch(() => {});

    return NextResponse.json(incident, { status: 201 });
  } catch (error) {
    logger.error({ error }, "Failed to create incident");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
