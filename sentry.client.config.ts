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
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only enable in production
  enabled: process.env.NODE_ENV === "production",

  // Performance monitoring
  tracesSampleRate: 0.1, // 10% of transactions

  // Session replay for debugging
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Filter out known benign errors
  ignoreErrors: [
    // Browser extensions
    /chrome-extension/,
    /moz-extension/,
    // Network errors
    "Failed to fetch",
    "NetworkError",
    "Load failed",
    // User actions
    "ResizeObserver loop",
  ],

  // Don't send PII
  sendDefaultPii: false,

  // Environment
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,

  // PII scrubbing — enforces privacy policy section 5 ("Error Monitoring").
  // Strips auth headers, tokens from query strings, and raw request bodies
  // before any event is transmitted.
  beforeSend(event) {
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
        // If parsing fails, drop the query string entirely
        event.request.query_string = "[redacted]";
      }
    }

    // Never send raw request bodies — they may contain credentials, API keys,
    // or user-submitted sensitive data.
    if (event.request?.data) {
      event.request.data = "[redacted]";
    }

    // Strip email addresses from user context (keep only the hashed ID)
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
      delete event.user.username;
    }

    return event;
  },

  // Integrations
  integrations: [
    Sentry.replayIntegration({
      // Mask all input fields
      maskAllInputs: true,
      // Mask all text to prevent PII leakage
      maskAllText: true,
      // Block all media
      blockAllMedia: true,
    }),
  ],
});

/**
 * Set Sentry user context with subscription tier on the client side.
 * Call this after auth session is loaded in the app layout.
 */
export function setSentryClientContext(userId: string, tier?: string) {
  Sentry.setUser({ id: userId });
  if (tier) {
    Sentry.setTag("tier", tier);
    Sentry.setContext("subscription", { tier });
  }
}
