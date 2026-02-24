import * as Sentry from "@sentry/nextjs";

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

  // Before sending, filter sensitive data and add custom context
  beforeSend(event) {
    // Don't send events in development
    if (process.env.NODE_ENV !== "production") {
      return null;
    }

    // Filter out sensitive headers
    if (event.request?.headers) {
      delete event.request.headers.cookie;
      delete event.request.headers.authorization;
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
