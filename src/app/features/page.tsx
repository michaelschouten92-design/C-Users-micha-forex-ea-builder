import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import { getAllFeatures } from "@/data/features";

const baseUrl = process.env.SITE_URL ?? "https://algo-studio.com";

export const metadata: Metadata = {
  title: "Features — MT5 EA Monitoring & Verification | Algo Studio",
  description:
    "Drift detection, health scoring, Monte Carlo analysis, cryptographic proof, and auto-halt governance for MT5 Expert Advisors. Free plan, every feature.",
  alternates: { canonical: `${baseUrl}/features` },
  openGraph: {
    title: "Algo Studio Features — MT5 Strategy Monitoring",
    description:
      "Every feature needed to monitor, verify, and govern algorithmic trading strategies.",
    url: `${baseUrl}/features`,
    type: "website",
    images: ["/opengraph-image"],
  },
  twitter: { card: "summary_large_image" },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "Features", href: "/features" },
];

export default function FeaturesHubPage() {
  const features = getAllFeatures();

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Algo Studio Features",
    description: "Feature catalog for MT5 Expert Advisor monitoring and verification.",
    url: `${baseUrl}/features`,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: features.map((f, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: f.name,
        url: `${baseUrl}/features/${f.slug}`,
        description: f.tagline,
      })),
    },
  };

  return (
    <div className="min-h-screen bg-[#08080A] text-[#FAFAFA]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(breadcrumbs)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />

      <SiteNav />

      <main id="main-content" className="pt-24 pb-0 px-6">
        <div className="max-w-5xl mx-auto">
          <Breadcrumbs items={breadcrumbs} />

          {/* Hero */}
          <header className="mb-14 max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6366F1] mb-3">
              Product
            </p>
            <h1 className="text-[30px] md:text-[44px] font-extrabold tracking-tight leading-[1.12] mb-5">
              Every feature you need to monitor an MT5 EA
            </h1>
            <p className="text-base md:text-lg text-[#A1A1AA] leading-relaxed">
              Statistical drift detection, composite health scoring, Monte Carlo analysis,
              cryptographic proof of record, and automatic halt governance. All included on the free
              Baseline plan.
            </p>
          </header>

          {/* Feature grid */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-20">
            {features.map((f) => (
              <Link
                key={f.slug}
                href={`/features/${f.slug}`}
                className="group block p-6 rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#111114] hover:border-[rgba(99,102,241,0.4)] transition-colors"
              >
                <h2 className="text-lg font-bold text-[#FAFAFA] mb-2 group-hover:text-[#818CF8] transition-colors">
                  {f.name}
                </h2>
                <p className="text-sm text-[#A1A1AA] leading-relaxed mb-4 line-clamp-3">
                  {f.tagline}
                </p>
                <span className="text-xs font-medium text-[#6366F1]">Learn more →</span>
              </Link>
            ))}
          </section>

          {/* CTA */}
          <section className="mb-16 pt-12 border-t border-[rgba(255,255,255,0.06)] text-center">
            <h2 className="text-xl md:text-2xl font-bold text-[#FAFAFA] mb-3">
              Ready to monitor your EA?
            </h2>
            <p className="text-sm text-[#A1A1AA] max-w-xl mx-auto mb-6 leading-relaxed">
              Upload your backtest, connect your MT5 terminal, and get drift alerts before
              degradation hits your equity curve.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/sample-evaluation"
                className="inline-block px-5 py-2.5 bg-[#6366F1] text-white text-sm font-medium rounded-lg hover:bg-[#818CF8] transition-colors"
              >
                Start free
              </Link>
              <Link
                href="/how-it-works"
                className="inline-block px-5 py-2.5 border border-[rgba(255,255,255,0.12)] text-[#FAFAFA] text-sm font-medium rounded-lg hover:border-[rgba(255,255,255,0.24)] transition-colors"
              >
                How it works
              </Link>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
