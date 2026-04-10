import pino from "pino";
import * as Sentry from "@sentry/nextjs";

/**
 * Structured logger using Pino.
 *
 * In development: Pretty-printed, colorful output
 * In production: JSON format for log aggregation (e.g., Datadog, Logtail)
 *
 * Sentry bridge: `logger.error()` and `logger.fatal()` calls are automatically
 * forwarded to Sentry via the `logMethod` hook. Sentry itself is a no-op in
 * development (see sentry.server.config.ts), so this only sends in production.
 *
 * Usage:
 *   import { logger } from "@/lib/logger";
 *
 *   logger.info({ userId, projectId }, "Project created");
 *   logger.error({ err, projectId }, "Export failed");
 */

const isDevelopment = process.env.NODE_ENV === "development";

// Pino level numbers: trace=10, debug=20, info=30, warn=40, error=50, fatal=60
const PINO_LEVEL_ERROR = 50;
const PINO_LEVEL_FATAL = 60;

/**
 * Credentials and secret keys — always redacted from BOTH Pino logs and
 * Sentry events. These never belong in any log surface.
 */
const SENSITIVE_KEYS = [
  // Credentials
  "password",
  "passwordHash",
  "token",
  "secret",
  "authorization",
  "cookie",
  // Auth tokens
  "apiKey",
  "accessToken",
  "refreshToken",
  "bearerToken",
  "sessionToken",
  "verificationToken",
  "resetToken",
  // Integration secrets
  "telegramBotToken",
  "telegramChatId",
] as const;

/**
 * PII keys — redacted from Sentry events ONLY, preserved in Pino logs.
 *
 * Rationale: auth flows legitimately need to log email addresses for
 * operational troubleshooting (e.g., "failed to send verification email to X")
 * because at early auth stages no userId exists yet. GDPR allows this under
 * legitimate interest for service operation, as long as logs are:
 *   - not shipped to an external log aggregator without a DPA
 *   - access-controlled
 *   - not retained longer than necessary
 *
 * Sentry is a third-party processor (disclosed in the privacy policy), so we
 * DO scrub PII before it reaches Sentry events.
 */
const PII_KEYS = ["email", "ipAddress", "ip"] as const;

const SENTRY_REDACT_KEYS = [...SENSITIVE_KEYS, ...PII_KEYS] as const;

const REDACTED_PLACEHOLDER = "[REDACTED]";

/**
 * Recursively scrub sensitive keys from a context object before sending to
 * Sentry. Returns a new object — does not mutate the input.
 *
 * Depth-limited to prevent infinite recursion on circular references.
 */
function scrubSensitive(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[depth-limit]";
  if (value === null || value === undefined) return value;
  if (typeof value !== "object") return value;
  if (value instanceof Error) return value; // handled separately by Sentry
  if (Array.isArray(value)) {
    return value.map((v) => scrubSensitive(v, depth + 1));
  }

  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (SENTRY_REDACT_KEYS.includes(key as (typeof SENTRY_REDACT_KEYS)[number])) {
      out[key] = REDACTED_PLACEHOLDER;
    } else {
      out[key] = scrubSensitive(val, depth + 1);
    }
  }
  return out;
}

/**
 * Forward an error/fatal log call to Sentry.
 *
 * Extracts Error instances from common context keys (`err`, `error`, `e`) so
 * Sentry gets a proper stack trace. Falls back to captureMessage when no Error
 * is available. Wrapped in try/catch so Sentry failures never break logging.
 */
function forwardToSentry(inputArgs: unknown[], level: number): void {
  try {
    const first = inputArgs[0];
    const second = inputArgs[1];

    let message: string;
    let context: Record<string, unknown> = {};
    let error: Error | undefined;

    if (typeof first === "string") {
      message = first;
    } else if (first && typeof first === "object") {
      const raw = first as Record<string, unknown>;
      message = typeof second === "string" ? second : "logger.error";

      // Look for Error instance in common context keys
      if (raw.err instanceof Error) error = raw.err;
      else if (raw.error instanceof Error) error = raw.error;
      else if (raw.e instanceof Error) error = raw.e;

      // Scrub sensitive keys BEFORE sending to Sentry. Pino's built-in redact
      // runs after this hook, so we must replicate it manually here.
      const scrubbed = scrubSensitive(raw) as Record<string, unknown>;
      context = { ...scrubbed };

      // Strip the Error object from context so Sentry doesn't double-serialize
      if (error) {
        delete context.err;
        delete context.error;
        delete context.e;
      }
    } else {
      message = String(first);
    }

    const severity = level >= PINO_LEVEL_FATAL ? "fatal" : "error";

    Sentry.withScope((scope) => {
      scope.setLevel(severity);
      if (Object.keys(context).length > 0) {
        scope.setContext("logger", context);
      }
      if (error) {
        // Use the log message as the fingerprint hint so different call sites
        // with the same underlying error stay grouped per-site.
        scope.setTag("log.message", message);
        Sentry.captureException(error);
      } else {
        Sentry.captureMessage(message, severity);
      }
    });
  } catch {
    // Never break logging — Sentry failures are swallowed.
  }
}

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
  // Redact sensitive fields. Kept in sync with SENSITIVE_KEYS above —
  // Pino handles the on-disk/stdout log redaction, the Sentry bridge below
  // handles the in-memory Sentry context redaction using the same list.
  redact: {
    paths: [
      ...SENSITIVE_KEYS,
      ...SENSITIVE_KEYS.map((k) => `*.${k}`),
      "req.headers.authorization",
      "req.headers.cookie",
    ],
    censor: REDACTED_PLACEHOLDER,
  },
  // Bridge error/fatal logs to Sentry. Runs synchronously before the log is
  // emitted; Sentry itself is async + no-op in dev so dev path is zero-cost.
  hooks: {
    logMethod(inputArgs, method, level) {
      if (level >= PINO_LEVEL_ERROR) {
        forwardToSentry(inputArgs, level);
      }
      return method.apply(this, inputArgs as Parameters<typeof method>);
    },
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

/**
 * Extract request ID from incoming request headers (set by middleware).
 * Use this to add correlation to logger child instances.
 */
export function getRequestId(request: {
  headers: { get(name: string): string | null };
}): string | undefined {
  return request.headers.get("x-request-id") ?? undefined;
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
