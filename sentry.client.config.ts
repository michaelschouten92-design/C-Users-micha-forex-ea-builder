import * as Sentry from "@sentry/nextjs";

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
