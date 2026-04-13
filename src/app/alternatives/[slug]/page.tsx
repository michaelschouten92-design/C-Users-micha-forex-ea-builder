import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import {
  COMPETITORS,
  getCompetitorBySlug,
  getRelatedCompetitors,
  isStaleEntry,
  FEATURE_DIMENSIONS,
  ALGO_STUDIO_FEATURES,
  type Competitor,
  type FeatureLevel,
} from "@/data/competitors";

interface Props {
  params: Promise<{ slug: string }>;
}

const baseUrl = process.env.SITE_URL ?? "https://algo-studio.com";

export function generateStaticParams(): Array<{ slug: string }> {
  return COMPETITORS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const comp = getCompetitorBySlug(slug);
  if (!comp) return { title: "Alternative Not Found", robots: { index: false, follow: false } };

  const title = `${comp.name} Alternative — Algo Studio vs ${comp.name}`;
  const description = `Honest comparison of Algo Studio and ${comp.name}. Feature matrix, when each tool wins, and a migration guide for MT5 EA traders.`;
  const url = `${baseUrl}/alternatives/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      images: [`/alternatives/${slug}/opengraph-image`],
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

function articleJsonLd(comp: Competitor, slug: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `Algo Studio vs ${comp.name} — Honest Comparison`,
    description: `Feature matrix, pros/cons, and migration guide.`,
    url: `${baseUrl}/alternatives/${slug}`,
    image: `${baseUrl}/opengraph-image`,
    author: { "@type": "Organization", name: "Algo Studio" },
    publisher: {
      "@type": "Organization",
      name: "Algo Studio",
      logo: { "@type": "ImageObject", url: `${baseUrl}/opengraph-image` },
    },
    dateModified: comp.lastVerified,
    about: { "@type": "Organization", name: comp.name, url: comp.officialUrl },
  };
}

function faqJsonLd(comp: Competitor) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: comp.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

function paragraphsOf(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

const LEVEL_LABEL: Record<FeatureLevel, string> = {
  full: "Full",
  partial: "Partial",
  limited: "Limited",
  none: "None",
};

const LEVEL_STYLE: Record<FeatureLevel, string> = {
  full: "text-[#22C55E]",
  partial: "text-[#F59E0B]",
  limited: "text-[#F59E0B]",
  none: "text-[#EF4444]",
};

const LEVEL_GLYPH: Record<FeatureLevel, string> = {
  full: "✓",
  partial: "~",
  limited: "~",
  none: "✗",
};

export default async function AlternativePage({ params }: Props) {
  const { slug } = await params;
  const comp = getCompetitorBySlug(slug);
  if (!comp) notFound();

  const related = getRelatedCompetitors(slug);
  const isStale = isStaleEntry(comp);

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Alternatives", href: "/alternatives" },
    { name: comp.name, href: `/alternatives/${slug}` },
  ];

  return (
    <div className="min-h-screen bg-[#08080A] text-[#FAFAFA]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(breadcrumbs)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd(comp, slug)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(comp)) }}
      />

      <SiteNav />

      <main id="main-content" className="pt-24 pb-0 px-6">
        <div className="max-w-3xl mx-auto">
          <Breadcrumbs items={breadcrumbs} />

          {/* Hero */}
          <header className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6366F1] mb-3">
              Alternative
            </p>
            <h1 className="text-[28px] md:text-[40px] font-extrabold tracking-tight leading-[1.15] mb-5">
              Algo Studio vs {comp.name}
            </h1>
            <p className="text-base md:text-lg text-[#A1A1AA] leading-relaxed max-w-2xl">
              {comp.tagline}
            </p>
          </header>

          {/* Stale disclaimer */}
          {isStale && (
            <div className="mb-10 p-4 rounded-lg border border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.06)]">
              <p className="text-sm text-[#F59E0B] font-medium mb-1">
                Comparison data may be out of date
              </p>
              <p className="text-xs text-[#A1A1AA] leading-relaxed">
                Last verified {comp.lastVerified}. Check{" "}
                <a
                  href={comp.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="text-[#818CF8] hover:underline"
                >
                  {comp.name}&apos;s official site
                </a>{" "}
                for current pricing and features.
              </p>
            </div>
          )}

          {/* Overview */}
          <section className="mb-14">
            <h2 className="text-xl md:text-2xl font-bold text-[#FAFAFA] tracking-tight mb-4">
              What is {comp.name}?
            </h2>
            <div className="space-y-4 text-[15px] leading-relaxed text-[#A1A1AA]">
              {paragraphsOf(comp.overview).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </section>

          {/* Feature matrix */}
          <section className="mb-14">
            <h2 className="text-xl md:text-2xl font-bold text-[#FAFAFA] tracking-tight mb-6">
              Feature comparison
            </h2>
            <div className="overflow-x-auto rounded-lg border border-[rgba(255,255,255,0.06)]">
              <table className="w-full text-sm">
                <thead className="bg-[#111114] border-b border-[rgba(255,255,255,0.06)]">
                  <tr>
                    <th className="text-left p-3 font-semibold text-[#71717A] text-xs uppercase tracking-wider">
                      Feature
                    </th>
                    <th className="p-3 font-semibold text-[#6366F1] text-xs uppercase tracking-wider">
                      Algo Studio
                    </th>
                    <th className="p-3 font-semibold text-[#A1A1AA] text-xs uppercase tracking-wider">
                      {comp.name}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {FEATURE_DIMENSIONS.map((dim, i) => {
                    const asLevel = ALGO_STUDIO_FEATURES[dim.key];
                    const compLevel = comp.features[dim.key];
                    return (
                      <tr
                        key={dim.key}
                        className={i % 2 === 0 ? "bg-[#08080A]" : "bg-[rgba(255,255,255,0.02)]"}
                      >
                        <td className="p-3 text-[#FAFAFA]">
                          <div className="font-medium text-[13px]">{dim.label}</div>
                          <div className="text-xs text-[#52525B] mt-0.5">{dim.description}</div>
                        </td>
                        <td className={`p-3 text-center font-semibold ${LEVEL_STYLE[asLevel]}`}>
                          <span className="text-lg">{LEVEL_GLYPH[asLevel]}</span>
                          <div className="text-xs">{LEVEL_LABEL[asLevel]}</div>
                        </td>
                        <td className={`p-3 text-center font-semibold ${LEVEL_STYLE[compLevel]}`}>
                          <span className="text-lg">{LEVEL_GLYPH[compLevel]}</span>
                          <div className="text-xs">{LEVEL_LABEL[compLevel]}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Pricing */}
          <section className="mb-14">
            <h2 className="text-xl md:text-2xl font-bold text-[#FAFAFA] tracking-tight mb-4">
              Pricing
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-lg border border-[rgba(99,102,241,0.3)] bg-[rgba(99,102,241,0.04)]">
                <h3 className="text-sm font-bold text-[#6366F1] mb-2">Algo Studio</h3>
                <p className="text-2xl font-extrabold text-[#FAFAFA] mb-1">€0/mo</p>
                <p className="text-xs text-[#A1A1AA] leading-relaxed">
                  Baseline plan: every feature, 1 account, no credit card. Control/Authority plans
                  scale account count, not feature access.
                </p>
              </div>
              <div className="p-5 rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#111114]">
                <h3 className="text-sm font-bold text-[#A1A1AA] mb-2">{comp.name}</h3>
                <p className="text-2xl font-extrabold text-[#FAFAFA] mb-1">
                  {comp.pricing.hasFreeTier && comp.pricing.paidMonthlyFromUsd === null
                    ? "Free"
                    : comp.pricing.paidMonthlyFromUsd !== null
                      ? `$${comp.pricing.paidMonthlyFromUsd}/mo+`
                      : "—"}
                </p>
                <p className="text-xs text-[#A1A1AA] leading-relaxed">{comp.pricing.summary}</p>
              </div>
            </div>
          </section>

          {/* Pros / cons of competitor */}
          <section className="mb-14">
            <h2 className="text-xl md:text-2xl font-bold text-[#FAFAFA] tracking-tight mb-6">
              {comp.name}: the honest take
            </h2>
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <h3 className="text-sm font-semibold text-[#22C55E] mb-3">Where it wins</h3>
                <ul className="space-y-2">
                  {comp.pros.map((p) => (
                    <li key={p} className="flex gap-2 text-xs leading-relaxed text-[#A1A1AA]">
                      <span className="text-[#22C55E]">✓</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#EF4444] mb-3">Where it falls short</h3>
                <ul className="space-y-2">
                  {comp.cons.map((c) => (
                    <li key={c} className="flex gap-2 text-xs leading-relaxed text-[#A1A1AA]">
                      <span className="text-[#EF4444]">✗</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* When to choose each */}
          <section className="mb-14 pt-12 border-t border-[rgba(255,255,255,0.06)]">
            <h2 className="text-xl md:text-2xl font-bold text-[#FAFAFA] tracking-tight mb-6">
              Which should you choose?
            </h2>
            <div className="space-y-5">
              <div className="p-5 rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#111114]">
                <h3 className="text-sm font-bold text-[#A1A1AA] mb-3">Choose {comp.name} when…</h3>
                <ul className="space-y-2">
                  {comp.whenToChooseThem.map((item) => (
                    <li key={item} className="flex gap-2 text-sm leading-relaxed text-[#A1A1AA]">
                      <span className="text-[#71717A]">·</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-5 rounded-lg border border-[rgba(99,102,241,0.3)] bg-[rgba(99,102,241,0.04)]">
                <h3 className="text-sm font-bold text-[#6366F1] mb-3">Choose Algo Studio when…</h3>
                <ul className="space-y-2">
                  {comp.whenToChooseUs.map((item) => (
                    <li key={item} className="flex gap-2 text-sm leading-relaxed text-[#A1A1AA]">
                      <span className="text-[#818CF8]">·</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* Migration steps */}
          {comp.migrationSteps.length > 0 && (
            <section className="mb-14">
              <h2 className="text-xl md:text-2xl font-bold text-[#FAFAFA] tracking-tight mb-4">
                Migrating from {comp.name}
              </h2>
              <ol className="space-y-3 list-decimal pl-5 text-[15px] leading-relaxed text-[#A1A1AA] marker:text-[#6366F1] marker:font-bold">
                {comp.migrationSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </section>
          )}

          {/* FAQs */}
          <section className="mb-14 pt-12 border-t border-[rgba(255,255,255,0.06)]">
            <h2 className="text-xl md:text-2xl font-bold text-[#FAFAFA] tracking-tight mb-6">
              Frequently asked questions
            </h2>
            <div className="space-y-3">
              {comp.faqs.map((f) => (
                <details
                  key={f.q}
                  className="group p-5 rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#111114]"
                >
                  <summary className="cursor-pointer text-[15px] font-medium text-[#FAFAFA] flex items-center justify-between gap-4">
                    <span>{f.q}</span>
                    <span
                      aria-hidden="true"
                      className="text-[#6366F1] transition-transform group-open:rotate-45 text-xl leading-none"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-[#A1A1AA]">{f.a}</p>
                </details>
              ))}
            </div>
          </section>

          {/* Related competitors */}
          {related.length > 0 && (
            <section className="mb-14 pt-12 border-t border-[rgba(255,255,255,0.06)]">
              <h2 className="text-xl md:text-2xl font-bold text-[#FAFAFA] tracking-tight mb-6">
                Other alternatives
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {related.map((r) => (
                  <Link
                    key={r.slug}
                    href={`/alternatives/${r.slug}`}
                    className="block p-5 rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#111114] hover:border-[rgba(99,102,241,0.4)] transition-colors"
                  >
                    <h3 className="text-sm font-semibold text-[#FAFAFA] mb-1.5">
                      Algo Studio vs {r.name}
                    </h3>
                    <p className="text-xs text-[#71717A] leading-relaxed line-clamp-3">
                      {r.tagline}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* CTA */}
          <section className="mt-20 pt-12 mb-16 border-t border-[rgba(255,255,255,0.06)] text-center">
            <h2 className="text-xl md:text-2xl font-bold text-[#FAFAFA] mb-3">
              Try Algo Studio alongside {comp.name}
            </h2>
            <p className="text-sm text-[#A1A1AA] max-w-xl mx-auto mb-6 leading-relaxed">
              Free Baseline plan, no credit card, no conflicts with your existing setup. Most
              traders start by running both in parallel for a few weeks.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/sample-evaluation"
                className="inline-block px-5 py-2.5 bg-[#6366F1] text-white text-sm font-medium rounded-lg hover:bg-[#818CF8] transition-colors"
              >
                Start free
              </Link>
              <Link
                href="/pricing"
                className="inline-block px-5 py-2.5 border border-[rgba(255,255,255,0.12)] text-[#FAFAFA] text-sm font-medium rounded-lg hover:border-[rgba(255,255,255,0.24)] transition-colors"
              >
                See pricing
              </Link>
            </div>
            <p className="text-xs text-[#52525B] mt-6">Last verified: {comp.lastVerified}</p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
