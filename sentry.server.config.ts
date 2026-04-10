import * as Sentry from "@sentry/nextjs";

/**
 * Headers that may contain authentication tokens or PII.
 * Stripped from every Sentry event before transmission.
 */
const SENSITIVE_HEADERS = [
  "cookie",
  "authorization",
  "x-csrf-token",
  "x-internal-api-key",
  "stripe-signature",
  "x-forwarded-for",
];

/**
 * Query parameter names that may contain tokens or PII.
 * Redacted from request URLs before transmission.
 */
const SENSITIVE_QUERY_KEYS = ["token", "key", "password", "secret", "email", "code"];

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Only enable in production
  enabled: process.env.NODE_ENV === "production",

  // Performance monitoring
  tracesSampleRate: 0.1, // 10% of transactions

  // Environment
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,

  // Don't send PII
  sendDefaultPii: false,

  // Ignore specific errors
  ignoreErrors: [
    // Authentication errors (expected)
    "Unauthorized",
    "Invalid credentials",
    // Rate limiting (expected)
    "Rate limit exceeded",
  ],

  // PII scrubbing — enforces privacy policy section 5 ("Error Monitoring").
  // Strips auth headers, tokens from query strings, and raw request bodies
  // before any event is transmitted.
  beforeSend(event) {
    // Don't send events in development
    if (process.env.NODE_ENV !== "production") {
      return null;
    }

    // Scrub request headers
    if (event.request?.headers) {
      for (const key of Object.keys(event.request.headers)) {
        if (SENSITIVE_HEADERS.includes(key.toLowerCase())) {
          delete event.request.headers[key];
        }
      }
    }

    // Redact sensitive query string values
    if (event.request?.query_string && typeof event.request.query_string === "string") {
      try {
        const params = new URLSearchParams(event.request.query_string);
        let changed = false;
        for (const key of Array.from(params.keys())) {
          if (SENSITIVE_QUERY_KEYS.some((s) => key.toLowerCase().includes(s))) {
            params.set(key, "[redacted]");
            changed = true;
          }
        }
        if (changed) event.request.query_string = params.toString();
      } catch {
        event.request.query_string = "[redacted]";
      }
    }

    // Never send raw request bodies — they may contain credentials or PII
    if (event.request?.data) {
      event.request.data = "[redacted]";
    }

    // Strip email/username from user context (keep only the hashed ID)
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
      delete event.user.username;
    }

    return event;
  },
});

/**
 * Set Sentry user context with subscription tier.
 * Call this from auth session resolution or middleware.
 */
export function setSentryUserContext(userId: string, tier?: string) {
  Sentry.setUser({ id: userId });
  if (tier) {
    Sentry.setTag("tier", tier);
    Sentry.setContext("subscription", { tier });
  }
}

/**
 * Global safety net for background task failures.
 *
 * Next.js `onRequestError` only covers errors in the request lifecycle.
 * Promise rejections from fire-and-forget tasks (outbox delivery, webhook
 * fan-out, telemetry ingest side effects) would otherwise go to stderr and
 * never reach Sentry. These handlers close that gap.
 *
 * Guarded by `__algoStudioGlobalHandlersRegistered` to prevent double
 * registration during Next.js hot reloads in dev.
 */
type GlobalWithHandlerFlag = typeof globalThis & {
  __algoStudioGlobalHandlersRegistered?: boolean;
};

const globalWithFlag = globalThis as GlobalWithHandlerFlag;

if (typeof process !== "undefined" && !globalWithFlag.__algoStudioGlobalHandlersRegistered) {
  globalWithFlag.__algoStudioGlobalHandlersRegistered = true;

  process.on("unhandledRejection", (reason: unknown) => {
    const error =
      reason instanceof Error ? reason : new Error(`Unhandled rejection: ${String(reason)}`);
    Sentry.captureException(error, {
      tags: { source: "unhandledRejection" },
      level: "error",
    });
    // Match Node default behavior: log to stderr so logs still show it.

    console.error("[unhandledRejection]", reason);
  });

  process.on("uncaughtException", (error: Error) => {
    Sentry.captureException(error, {
      tags: { source: "uncaughtException" },
      level: "fatal",
    });

    console.error("[uncaughtException]", error);
    // Do NOT exit the process here — let Node's default handler decide.
    // On Vercel, the function container is recycled per invocation anyway.
  });
}
