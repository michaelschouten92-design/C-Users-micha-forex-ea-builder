import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Providers } from "./providers";
import { CookieConsent } from "@/components/cookie-consent";
import { Analytics } from "@vercel/analytics/next";
import { Suspense } from "react";
import { ReferralClickTracker } from "@/components/referral/click-tracker";
import { PostHogProvider } from "@/components/posthog-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.AUTH_URL || "https://algo-studio.com"),
  title: {
    default: "Algo Studio — The Proof Layer for Algorithmic Trading",
    template: "%s | Algo Studio",
  },
  description:
    "Verify your trading strategy with cryptographic proof. Instant health scoring, Monte Carlo analysis, and tamper-proof track records.",
  openGraph: {
    title: "Algo Studio — Proof > Backtests",
    description:
      "Verify your trading strategy with cryptographic proof. Validated backtests, tamper-proof live track records, and independent verification.",
    type: "website",
    siteName: "Algo Studio",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Algo Studio — The Proof Layer for Algorithmic Trading",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Algo Studio — The Proof Layer for Algorithmic Trading",
    description:
      "Verify your trading strategy with cryptographic proof. Tamper-proof track records, Monte Carlo validation, and independent auditing. Free to start.",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Algo Studio",
  url: process.env.AUTH_URL || "https://algo-studio.com",
  logo: `${process.env.AUTH_URL || "https://algo-studio.com"}/opengraph-image`,
  description:
    "The proof layer for algorithmic trading. Verify strategies with cryptographic track records, Monte Carlo validation, and independent auditing.",
  foundingDate: "2025",
  sameAs: ["https://x.com/AlgoStudio_"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased overflow-x-hidden`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[#4F46E5] focus:text-white focus:rounded-lg focus:text-sm focus:font-medium"
        >
          Skip to main content
        </a>
        <PostHogProvider>
          <Providers>{children}</Providers>
        </PostHogProvider>
        <Suspense fallback={null}>
          <ReferralClickTracker />
        </Suspense>
        <Analytics />
        <CookieConsent />
        {process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN && (
          <Script
            src="https://plausible.io/js/script.js"
            strategy="lazyOnload"
            data-domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN}
          />
        )}
      </body>
    </html>
  );
}
