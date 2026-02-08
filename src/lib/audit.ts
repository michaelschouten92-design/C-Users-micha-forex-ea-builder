import { prisma } from "./prisma";
import { logger } from "./logger";

/**
 * Audit event types for tracking important actions
 */
export type AuditEventType =
  // Authentication
  | "auth.login"
  | "auth.logout"
  | "auth.password_reset_request"
  | "auth.password_reset_complete"
  | "auth.oauth_link"
  // Projects
  | "project.create"
  | "project.update"
  | "project.delete"
  | "project.version_create"
  // Exports
  | "export.request"
  | "export.complete"
  | "export.failed"
  // Subscriptions
  | "subscription.upgrade"
  | "subscription.downgrade"
  | "subscription.cancel"
  | "subscription.payment_success"
  | "subscription.payment_failed";

interface AuditLogEntry {
  userId: string | null;
  eventType: AuditEventType;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

const auditLogger = logger.child({ component: "audit" });

/**
 * Log an audit event.
 * This logs to both the structured logger and can optionally persist to database.
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  const { userId, eventType, resourceType, resourceId, metadata, ipAddress, userAgent } = entry;

  // Log to structured logger
  auditLogger.info(
    {
      audit: true,
      userId,
      eventType,
      resourceType,
      resourceId,
      metadata,
      ipAddress: ipAddress ? maskIpAddress(ipAddress) : undefined,
      userAgent: userAgent ? truncateUserAgent(userAgent) : undefined,
    },
    `Audit: ${eventType}`
  );

  // Persist to database for compliance (retry once on failure)
  const data = {
    userId,
    eventType,
    resourceType,
    resourceId,
    metadata: metadata ? JSON.stringify(metadata) : null,
    ipAddress: ipAddress ? maskIpAddress(ipAddress) : null,
    userAgent: userAgent ? truncateUserAgent(userAgent) : null,
  };

  try {
    await prisma.auditLog.create({ data });
  } catch (error) {
    auditLogger.error({ error, eventType, userId }, "Failed to persist audit log, retrying");
    try {
      await prisma.auditLog.create({ data });
    } catch (retryError) {
      auditLogger.error(
        { error: retryError, eventType, userId },
        "Audit log persistence failed after retry — compliance data lost"
      );
    }
  }
}

/**
 * Helper to extract audit context from a request
 */
export function getAuditContext(request: Request): { ipAddress: string; userAgent: string } {
  const forwarded = request.headers.get("x-forwarded-for");
  const ipAddress = forwarded?.split(",")[0]?.trim() || "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";

  return { ipAddress, userAgent };
}

/**
 * Mask IP address for privacy (keep first two octets)
 */
function maskIpAddress(ip: string): string {
  if (ip === "unknown") return ip;

  // IPv4
  if (ip.includes(".")) {
    const parts = ip.split(".");
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.x.x`;
    }
  }

  // IPv6 - just show first segment
  if (ip.includes(":")) {
    const parts = ip.split(":");
    return `${parts[0]}:****`;
  }

  return "masked";
}

/**
 * Truncate user agent to a reasonable length
 */
function truncateUserAgent(ua: string): string {
  return ua.substring(0, 200);
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

export const audit = {
  // Authentication events
  login: (userId: string, ctx?: { ipAddress?: string; userAgent?: string }) =>
    logAuditEvent({ userId, eventType: "auth.login", ...ctx }),

  logout: (userId: string) => logAuditEvent({ userId, eventType: "auth.logout" }),

  passwordResetRequest: (email: string, ctx?: { ipAddress?: string }) =>
    logAuditEvent({
      userId: null,
      eventType: "auth.password_reset_request",
      metadata: { email: email.substring(0, 3) + "***" },
      ...ctx,
    }),

  passwordResetComplete: (userId: string) =>
    logAuditEvent({ userId, eventType: "auth.password_reset_complete" }),

  // Project events
  projectCreate: (userId: string, projectId: string, name: string) =>
    logAuditEvent({
      userId,
      eventType: "project.create",
      resourceType: "project",
      resourceId: projectId,
      metadata: { name },
    }),

  projectUpdate: (userId: string, projectId: string, changes: Record<string, unknown>) =>
    logAuditEvent({
      userId,
      eventType: "project.update",
      resourceType: "project",
      resourceId: projectId,
      metadata: { changes },
    }),

  projectDelete: (userId: string, projectId: string, name: string) =>
    logAuditEvent({
      userId,
      eventType: "project.delete",
      resourceType: "project",
      resourceId: projectId,
      metadata: { name },
    }),

  versionCreate: (userId: string, projectId: string, versionNo: number) =>
    logAuditEvent({
      userId,
      eventType: "project.version_create",
      resourceType: "version",
      resourceId: projectId,
      metadata: { versionNo },
    }),

  // Export events
  exportRequest: (userId: string, projectId: string, exportType: string) =>
    logAuditEvent({
      userId,
      eventType: "export.request",
      resourceType: "export",
      resourceId: projectId,
      metadata: { exportType },
    }),

  exportComplete: (userId: string, projectId: string, exportId: string) =>
    logAuditEvent({
      userId,
      eventType: "export.complete",
      resourceType: "export",
      resourceId: exportId,
      metadata: { projectId },
    }),

  exportFailed: (userId: string, projectId: string, error: string) =>
    logAuditEvent({
      userId,
      eventType: "export.failed",
      resourceType: "export",
      resourceId: projectId,
      metadata: { error },
    }),

  // Subscription events
  subscriptionUpgrade: (userId: string, fromTier: string, toTier: string) =>
    logAuditEvent({
      userId,
      eventType: "subscription.upgrade",
      resourceType: "subscription",
      metadata: { fromTier, toTier },
    }),

  subscriptionDowngrade: (userId: string, fromTier: string, toTier: string) =>
    logAuditEvent({
      userId,
      eventType: "subscription.downgrade",
      resourceType: "subscription",
      metadata: { fromTier, toTier },
    }),

  subscriptionCancel: (userId: string) =>
    logAuditEvent({
      userId,
      eventType: "subscription.cancel",
      resourceType: "subscription",
    }),

  paymentSuccess: (userId: string, amount?: number) =>
    logAuditEvent({
      userId,
      eventType: "subscription.payment_success",
      resourceType: "payment",
      metadata: amount ? { amount } : undefined,
    }),

  paymentFailed: (userId: string) =>
    logAuditEvent({
      userId,
      eventType: "subscription.payment_failed",
      resourceType: "payment",
    }),
};
