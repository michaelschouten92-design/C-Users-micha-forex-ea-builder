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
        destination: "/build-mt5-expert-advisor-without-coding",
        permanent: true,
      },
      {
        source: "/no-code-ea-builder",
        destination: "/build-mt5-expert-advisor-without-coding",
        permanent: true,
      },
      {
        source: "/visual-strategy-builder",
        destination: "/visual-trading-bot-builder",
        permanent: true,
      },
      {
        source: "/automated-trading-for-beginners",
        destination: "/product/simplicity",
        permanent: true,
      },
      {
        source: "/features",
        destination: "/product",
        permanent: true,
      },
      {
        source: "/help",
        destination: "/product/how-it-works",
        permanent: true,
      },
    ];
  },
  // Security headers
  async headers() {
    return [
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
              "default-src 'self'",
              // unsafe-inline required by Next.js for hydration scripts; unsafe-eval for dev HMR only
              `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""} https://js.stripe.com https://plausible.io https://challenges.cloudflare.com`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https://api.stripe.com https://*.sentry.io https://*.ingest.sentry.io https://plausible.io https://challenges.cloudflare.com",
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
const sentryConfig = {
  // Suppresses source map uploading logs during build
  silent: true,

  // Organization and project slugs (set via env vars)
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

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
