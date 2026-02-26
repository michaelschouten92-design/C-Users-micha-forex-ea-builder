import { prisma } from "@/lib/prisma";
import { enqueueNotification } from "@/lib/outbox";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "admin-alerts" });

// ============================================
// Admin Incident Creator
// ============================================

interface RaiseIncidentParams {
  severity: "critical" | "high" | "warning";
  category: "ea_silent" | "strategy_degraded" | "export_failure" | "system";
  title: string;
  details?: string;
  sourceType?: string;
  sourceId?: string;
}

/**
 * Create an AdminIncident record with deduplication.
 * If severity is "critical", enqueue an email to ADMIN_EMAIL via the outbox.
 */
export async function raiseAdminIncident(params: RaiseIncidentParams): Promise<void> {
  try {
    // Deduplication: skip if an open incident already exists for the same source
    if (params.sourceType && params.sourceId) {
      const existing = await prisma.adminIncident.findFirst({
        where: {
          sourceType: params.sourceType,
          sourceId: params.sourceId,
          category: params.category,
          status: "open",
        },
        select: { id: true },
      });
      if (existing) return;
    }

    await prisma.adminIncident.create({
      data: {
        severity: params.severity,
        category: params.category,
        title: params.title,
        description: params.details ?? null,
        sourceType: params.sourceType ?? null,
        sourceId: params.sourceId ?? null,
      },
    });

    // Critical incidents: notify admin by email via the outbox
    if (params.severity === "critical") {
      const adminEmail = process.env.ADMIN_EMAIL;
      if (adminEmail) {
        // Look up an admin user to associate the outbox entry with
        const adminUser = await prisma.user.findFirst({
          where: { role: "ADMIN" },
          select: { id: true },
        });
        if (adminUser) {
          await enqueueNotification({
            userId: adminUser.id,
            channel: "EMAIL",
            destination: adminEmail,
            subject: `[CRITICAL] ${params.title}`,
            payload: {
              html: `<h2>Critical Incident</h2><p><strong>${params.title}</strong></p><p>${params.details || "No additional details."}</p><p>Category: ${params.category}</p>`,
            },
          });
        }
      }
    }
  } catch (err) {
    log.error({ err, title: params.title }, "Failed to raise admin incident");
  }
}

// ============================================
// Shared Attention Queue Detection Logic
// ============================================

export interface AttentionItem {
  id: string;
  type: string;
  severity: "critical" | "high" | "warning";
  title: string;
  detail: string;
  instanceId?: string;
  userId?: string;
  timestamp: string;
}

/**
 * Detect items that need admin attention.
 * Shared between the attention queue API and the admin-alerts cron.
 */
export async function getAttentionItems(): Promise<AttentionItem[]> {
  const now = new Date();
  const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const items: AttentionItem[] = [];

  // 1. Error EAs (status ERROR for >1h)
  const errorEAs = await prisma.liveEAInstance.findMany({
    where: {
      status: "ERROR",
      deletedAt: null,
      updatedAt: { lt: oneHourAgo },
    },
    select: { id: true, eaName: true, lastError: true, userId: true, updatedAt: true },
  });
  for (const ea of errorEAs) {
    items.push({
      id: `error-ea-${ea.id}`,
      type: "error_ea",
      severity: "critical",
      title: `EA in ERROR state: ${ea.eaName}`,
      detail: ea.lastError || "No error details",
      instanceId: ea.id,
      userId: ea.userId,
      timestamp: ea.updatedAt.toISOString(),
    });
  }

  // 2. Silent EAs (ONLINE but no heartbeat >30min)
  const silentEAs = await prisma.liveEAInstance.findMany({
    where: {
      status: "ONLINE",
      deletedAt: null,
      lastHeartbeat: { lt: thirtyMinAgo },
    },
    select: { id: true, eaName: true, lastHeartbeat: true, userId: true },
  });
  for (const ea of silentEAs) {
    items.push({
      id: `silent-ea-${ea.id}`,
      type: "silent_ea",
      severity: "warning",
      title: `Silent EA: ${ea.eaName}`,
      detail: `Last heartbeat: ${ea.lastHeartbeat?.toISOString() ?? "never"}`,
      instanceId: ea.id,
      userId: ea.userId,
      timestamp: ea.lastHeartbeat?.toISOString() ?? now.toISOString(),
    });
  }

  // 3. Failed exports (last hour, >3 retries approximated by multiple FAILED in window)
  const failedExports = await prisma.exportJob.findMany({
    where: { status: "FAILED", createdAt: { gte: oneHourAgo } },
    select: {
      id: true,
      errorMessage: true,
      userId: true,
      createdAt: true,
      project: { select: { name: true } },
    },
  });
  for (const exp of failedExports) {
    items.push({
      id: `failed-export-${exp.id}`,
      type: "failed_export",
      severity: "high",
      title: `Failed export: ${exp.project.name}`,
      detail: exp.errorMessage || "No error details",
      userId: exp.userId,
      timestamp: exp.createdAt.toISOString(),
    });
  }

  // 4. System: outbox has >20 DEAD entries
  const deadCount = await prisma.notificationOutbox.count({
    where: { status: "DEAD" },
  });
  if (deadCount > 20) {
    items.push({
      id: "outbox-dead-backlog",
      type: "outbox_dead",
      severity: "critical",
      title: "Notification outbox has dead entries",
      detail: `${deadCount} notifications permanently failed delivery`,
      timestamp: now.toISOString(),
    });
  }

  return items;
}
