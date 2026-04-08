import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    optimizePackageImports: ["@sentry/nextjs", "sonner", "@xyflow/react"],
  },
  // Redirects for old pages
  async redirects() {
    return [
      {
        source: "/no-code-mt5-ea-builder",
        destination: "/how-it-works",
        permanent: true,
      },
      {
        source: "/no-code-ea-builder",
        destination: "/how-it-works",
        permanent: true,
      },
      {
        source: "/visual-strategy-builder",
        destination: "/how-it-works",
        permanent: true,
      },
      {
        source: "/automated-trading-for-beginners",
        destination: "/how-it-works",
        permanent: true,
      },
      {
        source: "/features",
        destination: "/how-it-works",
        permanent: true,
      },
      {
        source: "/help",
        destination: "/how-it-works",
        permanent: true,
      },
      // Product page consolidation — all product routes → /how-it-works
      {
        source: "/product",
        destination: "/how-it-works",
        permanent: true,
      },
      {
        source: "/product/how-it-works",
        destination: "/how-it-works",
        permanent: true,
      },
      {
        source: "/product/health-monitor",
        destination: "/how-it-works",
        permanent: true,
      },
      {
        source: "/product/monte-carlo",
        destination: "/how-it-works",
        permanent: true,
      },
      {
        source: "/product/strategy-identity",
        destination: "/how-it-works",
        permanent: true,
      },
      {
        source: "/product/track-record",
        destination: "/how-it-works",
        permanent: true,
      },
      {
        source: "/product/simplicity",
        destination: "/how-it-works",
        permanent: true,
      },
      // App restructuring redirects
      {
        source: "/app/backtest",
        destination: "/app/evaluate",
        permanent: true,
      },
      {
        source: "/app/backtest/:id",
        destination: "/app/evaluate/:id",
        permanent: true,
      },
      {
        source: "/app/backtest/:id/validate",
        destination: "/app/evaluate/:id/validate",
        permanent: true,
      },
      {
        source: "/app/journal",
        destination: "/app/live",
        permanent: true,
      },
      {
        source: "/app/risk-calculator",
        destination: "/app/risk",
        permanent: true,
      },
      {
        source: "/app/risk-dashboard",
        destination: "/app/risk",
        permanent: true,
      },
      {
        source: "/app/monitor",
        destination: "/app/live",
        permanent: true,
      },
      {
        source: "/app/referrals",
        destination: "/app/settings",
        permanent: true,
      },
      // Marketing consolidation redirects
      {
        source: "/compare-platforms",
        destination: "/how-it-works",
        permanent: true,
      },
      {
        source: "/compare-platforms/:slug",
        destination: "/how-it-works",
        permanent: true,
      },
      {
        source: "/product/mt5-export",
        destination: "/how-it-works",
        permanent: true,
      },
      {
        source: "/templates",
        destination: "/how-it-works",
        permanent: true,
      },
      {
        source: "/templates/:slug",
        destination: "/how-it-works",
        permanent: true,
      },
      {
        source: "/trading-strategy-templates-mt5",
        destination: "/how-it-works",
        permanent: true,
      },
      {
        source: "/low-drawdown",
        destination: "/verified",
        permanent: true,
      },
      {
        source: "/top-robust",
        destination: "/verified",
        permanent: true,
      },
      {
        source: "/rising",
        destination: "/verified",
        permanent: true,
      },
      {
        source: "/coaching/thank-you",
        destination: "/contact",
        permanent: true,
      },
    ];
  },
  // Security + caching headers
  async headers() {
    return [
      {
        // Cache public marketing pages (homepage, pricing, how-it-works, blog, etc.)
        source:
          "/(|pricing|how-it-works|blog|blog/:slug*|about|faq|contact|privacy|terms|verified)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=3600, stale-while-revalidate=86400",
          },
        ],
      },
      {
        // Apply to all routes
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-XSS-Protection",
            value: "0",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self' blob:",
              // unsafe-inline required by Next.js for hydration scripts; unsafe-eval for dev HMR only
              `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""} https://js.stripe.com https://plausible.io https://challenges.cloudflare.com https://eu-assets.i.posthog.com`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https://api.stripe.com https://*.sentry.io https://*.ingest.sentry.io https://plausible.io https://challenges.cloudflare.com https://eu.i.posthog.com https://eu-assets.i.posthog.com",
              "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://challenges.cloudflare.com",
              "worker-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'self'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

// Sentry configuration options
// NOTE: SENTRY_AUTH_TOKEN must be set in CI/deployment environment for source map upload.
// Generate at: https://sentry.io/settings/auth-tokens/
// Without it, source maps won't be uploaded and production errors will show minified stack traces.
const sentryConfig = {
  // Suppresses source map uploading logs during build
  silent: true,

  // Organization and project slugs (set via env vars)
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Auth token for source map upload (set SENTRY_AUTH_TOKEN in CI env)
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Upload source maps for better debugging
  widenClientFileUpload: true,

  // Automatically tree-shake Sentry logger statements
  disableLogger: true,

  // Hide source maps from generated client bundles
  hideSourceMaps: true,

  // Automatically instrument server actions
  automaticVercelMonitors: true,
};

// Only wrap with Sentry if DSN is configured
export default process.env.SENTRY_DSN ? withSentryConfig(nextConfig, sentryConfig) : nextConfig;
