import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
import { StrategiesView } from "./strategies-view";

const baseUrl = process.env.SITE_URL ?? "https://algo-studio.com";

export const metadata: Metadata = {
  title: "Verified Trading Strategies — Cryptographic Proof | Algo Studio",
  description:
    "Browse independently verified algorithmic trading strategies with hash-chain proof of performance. Every metric from real live trading, not simulated results.",
  alternates: { canonical: `${baseUrl}/strategies` },
  openGraph: {
    title: "Verified Strategies | Algo Studio",
    description:
      "Browse curated, independently verified algorithmic trading strategies with cryptographic proof of performance.",
    url: `${baseUrl}/strategies`,
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function StrategiesPage() {
  return (
    <div className="min-h-screen bg-[#08080A] text-[#FAFAFA]">
      <SiteNav />
      <div className="pt-16">
        <StrategiesView />
        <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-12 text-center">
          <h2 className="text-base font-semibold text-[#FAFAFA] mb-2">
            Want to verify your own strategy?
          </h2>
          <Link
            href="/register"
            className="inline-block px-6 py-2.5 bg-[#6366F1] text-white text-sm font-medium rounded-lg hover:bg-[#818CF8] transition-colors"
          >
            Start monitoring
          </Link>
        </section>
      </div>
      <Footer />
    </div>
  );
}
