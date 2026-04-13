import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import { getAllCompetitors } from "@/data/competitors";

const baseUrl = process.env.SITE_URL ?? "https://algo-studio.com";

export const metadata: Metadata = {
  title: "Algo Studio Alternatives — MyFxBook, FxBlue, Tradervue, Edgewonk",
  description:
    "Honest comparison of Algo Studio against MyFxBook, FxBlue, Tradervue, and Edgewonk. Feature matrix, pricing, and when each tool wins for MT5 EA monitoring.",
  alternates: { canonical: `${baseUrl}/alternatives` },
  openGraph: {
    title: "Algo Studio Alternatives & Comparisons",
    description: "Honest MT5 EA monitoring tool comparisons.",
    url: `${baseUrl}/alternatives`,
    type: "website",
    images: ["/opengraph-image"],
  },
  twitter: { card: "summary_large_image" },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "Alternatives", href: "/alternatives" },
];

export default function AlternativesHubPage() {
  const competitors = getAllCompetitors();

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Algo Studio Alternatives",
    url: `${baseUrl}/alternatives`,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: competitors.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: `Algo Studio vs ${c.name}`,
        url: `${baseUrl}/alternatives/${c.slug}`,
        description: c.tagline,
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

          <header className="mb-14 max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6366F1] mb-3">
              Comparisons
            </p>
            <h1 className="text-[30px] md:text-[44px] font-extrabold tracking-tight leading-[1.12] mb-5">
              Algo Studio alternatives, compared honestly
            </h1>
            <p className="text-base md:text-lg text-[#A1A1AA] leading-relaxed">
              Every tool in the MT5 monitoring and journaling space makes different tradeoffs. These
              comparisons show where each tool wins — including where Algo Studio is not the right
              choice. Pick based on what you actually need, not marketing.
            </p>
          </header>

          {/* Competitor list */}
          <section className="space-y-4 mb-20">
            {competitors.map((comp) => (
              <Link
                key={comp.slug}
                href={`/alternatives/${comp.slug}`}
                className="group block p-6 rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#111114] hover:border-[rgba(99,102,241,0.4)] transition-colors"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
                  <div>
                    <h2 className="text-lg font-bold text-[#FAFAFA] mb-1 group-hover:text-[#818CF8] transition-colors">
                      Algo Studio vs {comp.name}
                    </h2>
                    <p className="text-xs text-[#71717A] capitalize">
                      {comp.category} · Founded {comp.founded}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-[rgba(255,255,255,0.04)] text-[#A1A1AA] border border-[rgba(255,255,255,0.08)] whitespace-nowrap shrink-0">
                    {comp.pricing.hasFreeTier ? "Free tier" : "Paid only"}
                  </span>
                </div>
                <p className="text-sm text-[#A1A1AA] leading-relaxed mb-3">{comp.tagline}</p>
                <span className="text-xs font-medium text-[#6366F1]">Read full comparison →</span>
              </Link>
            ))}
          </section>

          {/* CTA */}
          <section className="mb-16 pt-12 border-t border-[rgba(255,255,255,0.06)] text-center">
            <h2 className="text-xl md:text-2xl font-bold text-[#FAFAFA] mb-3">
              Try Algo Studio free
            </h2>
            <p className="text-sm text-[#A1A1AA] max-w-xl mx-auto mb-6 leading-relaxed">
              Every feature on the free Baseline plan. No credit card, no trial limit. Run it
              alongside your existing tool and compare for yourself.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/sample-evaluation"
                className="inline-block px-5 py-2.5 bg-[#6366F1] text-white text-sm font-medium rounded-lg hover:bg-[#818CF8] transition-colors"
              >
                Start free
              </Link>
              <Link
                href="/features"
                className="inline-block px-5 py-2.5 border border-[rgba(255,255,255,0.12)] text-[#FAFAFA] text-sm font-medium rounded-lg hover:border-[rgba(255,255,255,0.24)] transition-colors"
              >
                Full feature list
              </Link>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
