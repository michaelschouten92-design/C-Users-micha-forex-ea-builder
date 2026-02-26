import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { timingSafeEqual } from "@/lib/csrf";
import { getAttentionItems, raiseAdminIncident } from "@/lib/admin-alerts";

const log = logger.child({ route: "/api/cron/admin-alerts" });

/**
 * Cron endpoint to auto-detect issues and create AdminIncident records.
 * Runs every 5 minutes.
 */
async function handleAdminAlerts(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    log.error("CRON_SECRET not configured");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  if (!authHeader || !timingSafeEqual(authHeader, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (process.env.VERCEL && !request.headers.get("x-vercel-cron")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const items = await getAttentionItems();
    let created = 0;

    for (const item of items) {
      const categoryMap: Record<
        string,
        "ea_silent" | "strategy_degraded" | "export_failure" | "system"
      > = {
        error_ea: "ea_silent",
        silent_ea: "ea_silent",
        degraded_strategy: "strategy_degraded",
        drifting_strategy: "strategy_degraded",
        failed_export: "export_failure",
        outbox_dead: "system",
      };

      const category = categoryMap[item.type] || "system";

      await raiseAdminIncident({
        severity: item.severity,
        category,
        title: item.title,
        details: item.detail,
        sourceType: item.instanceId ? "LiveEAInstance" : undefined,
        sourceId: item.instanceId,
      });
      created++;
    }

    log.info({ detected: items.length, created }, "Admin alerts cron completed");

    return NextResponse.json({ success: true, detected: items.length, created });
  } catch (error) {
    log.error({ error }, "Admin alerts cron failed");
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handleAdminAlerts(request);
}
