import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { checkAdmin } from "@/lib/admin";
import { logAuditEvent } from "@/lib/audit";
import { PLANS } from "@/lib/plans";
import type { PlanTier } from "@prisma/client";

const TIERS: PlanTier[] = ["FREE", "PRO", "ELITE"];

// GET /api/admin/plan-limits - Return plan limit configs (auto-seed from PLANS if empty)
export async function GET() {
  try {
    const adminCheck = await checkAdmin();
    if (!adminCheck.authorized) return adminCheck.response;

    let configs = await prisma.planLimitConfig.findMany({
      orderBy: { tier: "asc" },
    });

    // Auto-seed from hardcoded PLANS if no configs exist
    if (configs.length === 0) {
      const seedData = TIERS.map((tier) => ({
        tier,
        maxProjects:
          PLANS[tier].limits.maxProjects === Infinity ? 999999 : PLANS[tier].limits.maxProjects,
        maxExportsPerMonth:
          PLANS[tier].limits.maxExportsPerMonth === Infinity
            ? 999999
            : PLANS[tier].limits.maxExportsPerMonth,
        canExportMQL5: PLANS[tier].limits.canExportMQL5,
        canExportMQL4: PLANS[tier].limits.canExportMQL4,
        updatedBy: adminCheck.session.user.id,
      }));

      for (const data of seedData) {
        await prisma.planLimitConfig.create({ data });
      }

      configs = await prisma.planLimitConfig.findMany({
        orderBy: { tier: "asc" },
      });
    }

    return NextResponse.json({ data: configs });
  } catch (error) {
    logger.error({ error }, "Failed to fetch plan limits");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}

// PUT /api/admin/plan-limits - Upsert plan limit config for a tier
export async function PUT(request: Request) {
  try {
    const adminCheck = await checkAdmin();
    if (!adminCheck.authorized) return adminCheck.response;

    const body = await request.json();
    const { tier, maxProjects, maxExportsPerMonth, canExportMQL5, canExportMQL4 } = body;

    if (!TIERS.includes(tier)) {
      return NextResponse.json(apiError(ErrorCode.VALIDATION_FAILED, "Invalid tier"), {
        status: 400,
      });
    }

    if (typeof maxProjects !== "number" || typeof maxExportsPerMonth !== "number") {
      return NextResponse.json(
        apiError(ErrorCode.VALIDATION_FAILED, "maxProjects and maxExportsPerMonth must be numbers"),
        { status: 400 }
      );
    }

    const config = await prisma.planLimitConfig.upsert({
      where: { tier },
      update: {
        maxProjects,
        maxExportsPerMonth,
        canExportMQL5: canExportMQL5 ?? true,
        canExportMQL4: canExportMQL4 ?? false,
        updatedBy: adminCheck.session.user.id,
      },
      create: {
        tier,
        maxProjects,
        maxExportsPerMonth,
        canExportMQL5: canExportMQL5 ?? true,
        canExportMQL4: canExportMQL4 ?? false,
        updatedBy: adminCheck.session.user.id,
      },
    });

    // Audit log (fire-and-forget)
    logAuditEvent({
      userId: adminCheck.session.user.id,
      eventType: "admin.plan_limits_update",
      resourceType: "plan_limit",
      metadata: { tier, maxProjects, maxExportsPerMonth, canExportMQL5, canExportMQL4 },
    }).catch(() => {});

    return NextResponse.json(config);
  } catch (error) {
    logger.error({ error }, "Failed to update plan limits");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
