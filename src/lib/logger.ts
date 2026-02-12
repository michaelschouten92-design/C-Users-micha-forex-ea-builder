import pino from "pino";

/**
 * Structured logger using Pino.
 *
 * In development: Pretty-printed, colorful output
 * In production: JSON format for log aggregation (e.g., Datadog, Logtail)
 *
 * Usage:
 *   import { logger } from "@/lib/logger";
 *
 *   logger.info({ userId, projectId }, "Project created");
 *   logger.error({ error: err.message, stack: err.stack }, "Export failed");
 */

const isDevelopment = process.env.NODE_ENV === "development";

// Base logger configuration
const baseConfig: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL || (isDevelopment ? "debug" : "info"),
  // Add timestamp in ISO format
  timestamp: pino.stdTimeFunctions.isoTime,
  // Base context included in every log
  base: {
    env: process.env.NODE_ENV,
    service: "forex-ea-builder",
  },
  // Redact sensitive fields
  redact: {
    paths: [
      "password",
      "passwordHash",
      "token",
      "secret",
      "authorization",
      "cookie",
      "req.headers.authorization",
      "req.headers.cookie",
      "*.password",
      "*.passwordHash",
      "*.token",
      "*.secret",
    ],
    censor: "[REDACTED]",
  },
};

// Development: pretty print with colors
// Production: JSON output for log aggregation
const transport = isDevelopment
  ? {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:MM:ss",
        ignore: "pid,hostname,service,env",
        messageFormat: "{msg}",
      },
    }
  : undefined;

// Create the logger instance
export const logger = pino({
  ...baseConfig,
  transport,
});

// ============================================
// CHILD LOGGERS FOR SPECIFIC CONTEXTS
// ============================================

/**
 * Logger for API routes - includes request context
 */
export function createApiLogger(route: string, method: string, userId?: string) {
  return logger.child({
    route,
    method,
    userId: userId || "anonymous",
  });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Safely extract error details for logging
 */
export function extractErrorDetails(error: unknown): {
  message: string;
  name: string;
  stack?: string;
  code?: string;
} {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
      code: (error as Error & { code?: string }).code,
    };
  }

  if (typeof error === "string") {
    return {
      message: error,
      name: "Error",
    };
  }

  return {
    message: String(error),
    name: "UnknownError",
  };
}

/**
 * Log levels for reference:
 * - fatal: Application crash, immediate attention required
 * - error: Error that needs investigation
 * - warn: Something unexpected but not necessarily wrong
 * - info: Normal operations (user actions, API requests)
 * - debug: Detailed information for debugging
 * - trace: Very detailed tracing information
 */

// Type exports for convenience
export type Logger = pino.Logger;
