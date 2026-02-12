import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { CookieConsent } from "@/components/cookie-consent";
import { auth } from "@/lib/auth";

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

export const metadata: Metadata = {
  metadataBase: new URL(process.env.AUTH_URL || "https://algo-studio.com"),
  title: {
    default: "AlgoStudio — No-Code MT5 Bot Builder | Expert Advisor Generator",
    template: "%s | AlgoStudio",
  },
  description:
    "Build MT5 Expert Advisors without coding. Pick a strategy template, customize risk management, and export clean MQL5 code. Free no-code MT5 bot builder for forex and prop firm traders.",
  openGraph: {
    title: "AlgoStudio — No-Code MT5 Bot Builder",
    description:
      "Turn trading ideas into MT5 bots in minutes. No-code EA builder with proven strategy templates and clean MQL5 export. Works with any broker.",
    type: "website",
    siteName: "AlgoStudio",
  },
  twitter: {
    card: "summary_large_image",
    title: "AlgoStudio — No-Code MT5 Bot Builder",
    description:
      "Build MT5 Expert Advisors without coding. Strategy templates, clean MQL5 export, works with any MT5 broker. Free to start.",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "AlgoStudio",
  url: process.env.AUTH_URL || "https://algo-studio.com",
  logo: `${process.env.AUTH_URL || "https://algo-studio.com"}/opengraph-image`,
  description:
    "No-code platform for building, testing, and exporting MetaTrader 5 Expert Advisors with a visual drag-and-drop strategy builder.",
  foundingDate: "2025",
  sameAs: [],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        {process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN && (
          <script
            defer
            data-domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN}
            src="https://plausible.io/js/script.js"
          />
        )}
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased overflow-x-hidden`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[#4F46E5] focus:text-white focus:rounded-lg focus:text-sm focus:font-medium"
        >
          Skip to main content
        </a>
        <Providers session={session}>{children}</Providers>
        <CookieConsent />
      </body>
    </html>
  );
}
