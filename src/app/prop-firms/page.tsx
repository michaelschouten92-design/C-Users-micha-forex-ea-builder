import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import { getAllPropFirms } from "@/data/prop-firms";

const baseUrl = process.env.SITE_URL ?? "https://algo-studio.com";

export const metadata: Metadata = {
  title: "Prop Firm EA Rules Compared — FTMO, E8, FundedNext | Algo Studio",
  description:
    "Compare prop firm rules for Expert Advisors: FTMO, E8 Markets, FundedNext, The Funded Trader. Drawdown limits, profit targets, EA policies, and best configurations.",
  alternates: { canonical: `${baseUrl}/prop-firms` },
  openGraph: {
    title: "Prop Firm EA Rules & Best Settings",
    description: "Compare EA rules across major prop firms. Find the best fit for your strategy.",
    url: `${baseUrl}/prop-firms`,
    type: "website",
    images: ["/opengraph-image"],
  },
  twitter: { card: "summary_large_image" },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "Prop Firms", href: "/prop-firms" },
];

export default function PropFirmsHubPage() {
  const firms = getAllPropFirms();

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Prop Firm EA Rules & Compatibility",
    url: `${baseUrl}/prop-firms`,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: firms.map((f, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: f.name,
        url: `${baseUrl}/prop-firms/${f.slug}`,
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

          <header className="mb-14 max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6366F1] mb-3">
              Prop Firm Guides
            </p>
            <h1 className="text-[30px] md:text-[44px] font-extrabold tracking-tight leading-[1.12] mb-5">
              Prop firm EA rules, compared honestly
            </h1>
            <p className="text-base md:text-lg text-[#A1A1AA] leading-relaxed">
              Every major retail prop firm has its own drawdown rules, profit targets, and EA
              policies. The right firm for your EA depends on its variance, trade frequency, and
              holding period. These guides cut through the marketing and show you the numbers that
              matter.
            </p>
          </header>

          {/* Firm list */}
          <section className="space-y-4 mb-20">
            {firms.map((firm) => (
              <Link
                key={firm.slug}
                href={`/prop-firms/${firm.slug}`}
                className="group block p-6 rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#111114] hover:border-[rgba(99,102,241,0.4)] transition-colors"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
                  <div>
                    <h2 className="text-lg font-bold text-[#FAFAFA] mb-1 group-hover:text-[#818CF8] transition-colors">
                      {firm.name}
                    </h2>
                    <p className="text-xs text-[#71717A]">
                      Founded {firm.founded} · {firm.hqCity}, {firm.hqCountryCode}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-[rgba(99,102,241,0.12)] text-[#818CF8] border border-[rgba(99,102,241,0.3)] whitespace-nowrap shrink-0">
                    Compatibility {firm.algoStudioCompatibility.score}/10
                  </span>
                </div>
                <p className="text-sm text-[#A1A1AA] leading-relaxed mb-3">{firm.tagline}</p>
                <span className="text-xs font-medium text-[#6366F1]">
                  Read full {firm.name} EA guide →
                </span>
              </Link>
            ))}
          </section>

          {/* CTA */}
          <section className="mb-16 pt-12 border-t border-[rgba(255,255,255,0.06)] text-center">
            <h2 className="text-xl md:text-2xl font-bold text-[#FAFAFA] mb-3">
              Monitor your prop firm EA properly
            </h2>
            <p className="text-sm text-[#A1A1AA] max-w-xl mx-auto mb-6 leading-relaxed">
              Prop firm accounts have zero margin for a runaway day. Algo Studio&apos;s drift
              detection + auto-halt prevents degradation from blowing the account before you react.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/sample-evaluation"
                className="inline-block px-5 py-2.5 bg-[#6366F1] text-white text-sm font-medium rounded-lg hover:bg-[#818CF8] transition-colors"
              >
                Start free
              </Link>
              <Link
                href="/features/auto-halt"
                className="inline-block px-5 py-2.5 border border-[rgba(255,255,255,0.12)] text-[#FAFAFA] text-sm font-medium rounded-lg hover:border-[rgba(255,255,255,0.24)] transition-colors"
              >
                Auto-halt feature
              </Link>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
