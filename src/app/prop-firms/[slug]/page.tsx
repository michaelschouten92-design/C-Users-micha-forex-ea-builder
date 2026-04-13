import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import {
  PROP_FIRMS,
  getPropFirmBySlug,
  getRelatedPropFirms,
  isStaleEntry,
  type PropFirm,
} from "@/data/prop-firms";

interface Props {
  params: Promise<{ slug: string }>;
}

const baseUrl = process.env.SITE_URL ?? "https://algo-studio.com";

export function generateStaticParams(): Array<{ slug: string }> {
  return PROP_FIRMS.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const firm = getPropFirmBySlug(slug);
  if (!firm) return { title: "Prop Firm Not Found", robots: { index: false, follow: false } };

  const year = new Date().getFullYear();
  const title = `${firm.name} EA Rules & Best Settings (${year}) | Algo Studio`;
  const description = `${firm.name} EA policy, drawdown rules, profit targets, and proven configuration presets. Monitor your prop firm EA with Algo Studio.`;
  const url = `${baseUrl}/prop-firms/${slug}`;

  return {
    title: title.length > 60 ? `${firm.name} EA Rules & Settings | Algo Studio` : title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${firm.name} EA Rules & Settings`,
      description,
      url,
      type: "article",
      images: [`/prop-firms/${slug}/opengraph-image`],
    },
    twitter: { card: "summary_large_image" },
  };
}

function articleJsonLd(firm: PropFirm, slug: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${firm.name} EA Rules & Configuration Guide`,
    description: firm.tagline,
    url: `${baseUrl}/prop-firms/${slug}`,
    image: `${baseUrl}/opengraph-image`,
    author: { "@type": "Organization", name: "Algo Studio" },
    publisher: {
      "@type": "Organization",
      name: "Algo Studio",
      logo: { "@type": "ImageObject", url: `${baseUrl}/opengraph-image` },
    },
    dateModified: firm.lastVerified,
    about: { "@type": "Organization", name: firm.name, url: firm.officialUrl },
  };
}

function faqJsonLd(firm: PropFirm) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: firm.faqs.map((f) => ({
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

function formatEAPolicy(policy: PropFirm["eaPolicy"]): string {
  switch (policy) {
    case "allowed":
      return "EAs allowed";
    case "allowed-with-restrictions":
      return "EAs allowed (with restrictions)";
    case "case-by-case":
      return "Case-by-case approval";
    case "restricted":
      return "Restricted";
    case "prohibited":
      return "EAs prohibited";
  }
}

function policyColor(policy: PropFirm["eaPolicy"]): string {
  switch (policy) {
    case "allowed":
      return "text-[#22C55E]";
    case "allowed-with-restrictions":
      return "text-[#22C55E]";
    case "case-by-case":
      return "text-[#F59E0B]";
    case "restricted":
      return "text-[#F59E0B]";
    case "prohibited":
      return "text-[#EF4444]";
  }
}

export default async function PropFirmPage({ params }: Props) {
  const { slug } = await params;
  const firm = getPropFirmBySlug(slug);
  if (!firm) notFound();

  const related = getRelatedPropFirms(slug);
  const isStale = isStaleEntry(firm);

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Prop Firms", href: "/prop-firms" },
    { name: firm.name, href: `/prop-firms/${slug}` },
  ];

  return (
    <div className="min-h-screen bg-[#08080A] text-[#FAFAFA]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(breadcrumbs)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd(firm, slug)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(firm)) }}
      />

      <SiteNav />

      <main id="main-content" className="pt-24 pb-0 px-6">
        <div className="max-w-3xl mx-auto">
          <Breadcrumbs items={breadcrumbs} />

          {/* Hero */}
          <header className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6366F1] mb-3">
              Prop Firm Guide
            </p>
            <h1 className="text-[28px] md:text-[40px] font-extrabold tracking-tight leading-[1.15] mb-5">
              {firm.name} EA Rules, Settings & Algo Studio Compatibility
            </h1>
            <p className="text-base text-[#A1A1AA] leading-relaxed max-w-2xl">{firm.tagline}</p>

            {/* Key facts row */}
            <dl className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <dt className="text-[#52525B] uppercase tracking-wider font-semibold mb-1">
                  Founded
                </dt>
                <dd className="text-[#FAFAFA] font-medium">{firm.founded}</dd>
              </div>
              <div>
                <dt className="text-[#52525B] uppercase tracking-wider font-semibold mb-1">
                  Based in
                </dt>
                <dd className="text-[#FAFAFA] font-medium">
                  {firm.hqCity}, {firm.hqCountryCode}
                </dd>
              </div>
              <div>
                <dt className="text-[#52525B] uppercase tracking-wider font-semibold mb-1">
                  EA policy
                </dt>
                <dd className={`font-medium ${policyColor(firm.eaPolicy)}`}>
                  {formatEAPolicy(firm.eaPolicy)}
                </dd>
              </div>
              <div>
                <dt className="text-[#52525B] uppercase tracking-wider font-semibold mb-1">
                  Payout split
                </dt>
                <dd className="text-[#FAFAFA] font-medium">{firm.payoutSplit}</dd>
              </div>
            </dl>
          </header>

          {/* Stale disclaimer */}
          {isStale && (
            <div className="mb-10 p-4 rounded-lg border border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.06)]">
              <p className="text-sm text-[#F59E0B] font-medium mb-1">
                Rules may have changed since last review
              </p>
              <p className="text-xs text-[#A1A1AA] leading-relaxed">
                This guide was last sanity-checked on {firm.lastVerified}. Prop firm rules change
                frequently — always verify the current rules on{" "}
                <a
                  href={firm.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="text-[#818CF8] hover:underline"
                >
                  {firm.name}&apos;s official site
                </a>{" "}
                before applying.
              </p>
            </div>
          )}

          {/* Overview */}
          <section className="mb-14">
            <h2 className="text-xl md:text-2xl font-bold text-[#FAFAFA] tracking-tight mb-4">
              About {firm.name}
            </h2>
            <div className="space-y-4 text-[15px] leading-relaxed text-[#A1A1AA]">
              {paragraphsOf(firm.overview).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </section>

          {/* Programs */}
          <section className="mb-14">
            <h2 className="text-xl md:text-2xl font-bold text-[#FAFAFA] tracking-tight mb-6">
              Challenge programs
            </h2>
            <div className="space-y-4">
              {firm.programs.map((prog) => (
                <div
                  key={prog.name}
                  className="p-5 rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#111114]"
                >
                  <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
                    <h3 className="text-base font-semibold text-[#FAFAFA]">{prog.name}</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(99,102,241,0.12)] text-[#818CF8] border border-[rgba(99,102,241,0.3)] whitespace-nowrap">
                      {prog.phases === 0
                        ? "Instant funding"
                        : prog.phases === 1
                          ? "One-step"
                          : "Two-step"}
                    </span>
                  </div>
                  <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <dt className="text-[#52525B] font-semibold mb-1">Daily loss limit</dt>
                      <dd className="text-[#EF4444] font-bold text-sm">{prog.maxDailyLossPct}%</dd>
                    </div>
                    <div>
                      <dt className="text-[#52525B] font-semibold mb-1">Max drawdown</dt>
                      <dd className="text-[#EF4444] font-bold text-sm">
                        {prog.maxOverallDrawdownPct}%
                      </dd>
                    </div>
                    {prog.profitTargetPhase1Pct !== null && (
                      <div>
                        <dt className="text-[#52525B] font-semibold mb-1">
                          {prog.phases === 2 ? "Phase 1 target" : "Target"}
                        </dt>
                        <dd className="text-[#22C55E] font-bold text-sm">
                          {prog.profitTargetPhase1Pct}%
                        </dd>
                      </div>
                    )}
                    {prog.profitTargetPhase2Pct !== null && (
                      <div>
                        <dt className="text-[#52525B] font-semibold mb-1">Phase 2 target</dt>
                        <dd className="text-[#22C55E] font-bold text-sm">
                          {prog.profitTargetPhase2Pct}%
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-[#52525B] font-semibold mb-1">Account sizes</dt>
                      <dd className="text-[#A1A1AA] text-xs">
                        {prog.accountSizes
                          .map((s) => `$${(s / 1000).toLocaleString()}k`)
                          .join(", ")}
                      </dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          </section>

          {/* EA restrictions */}
          {firm.eaRestrictions.length > 0 && (
            <section className="mb-14">
              <h2 className="text-xl md:text-2xl font-bold text-[#FAFAFA] tracking-tight mb-4">
                EA restrictions to be aware of
              </h2>
              <ul className="space-y-2">
                {firm.eaRestrictions.map((r) => (
                  <li key={r} className="flex gap-3 text-[15px] leading-relaxed text-[#A1A1AA]">
                    <span className="text-[#F59E0B] flex-shrink-0">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-[#71717A] mt-4">
                Always confirm the current restriction list on{" "}
                <a
                  href={firm.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="text-[#818CF8] hover:underline"
                >
                  {firm.officialUrl.replace(/^https?:\/\//, "")}
                </a>
                .
              </p>
            </section>
          )}

          {/* Position holding */}
          <section className="mb-14">
            <h2 className="text-xl md:text-2xl font-bold text-[#FAFAFA] tracking-tight mb-4">
              Position holding
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div
                className={`p-4 rounded-lg border ${
                  firm.holdOvernight
                    ? "border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.06)]"
                    : "border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.06)]"
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-[#71717A] mb-1">
                  Overnight
                </p>
                <p
                  className={`text-base font-bold ${
                    firm.holdOvernight ? "text-[#22C55E]" : "text-[#EF4444]"
                  }`}
                >
                  {firm.holdOvernight ? "Allowed" : "Not allowed"}
                </p>
              </div>
              <div
                className={`p-4 rounded-lg border ${
                  firm.holdWeekend
                    ? "border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.06)]"
                    : "border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.06)]"
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-[#71717A] mb-1">
                  Weekend
                </p>
                <p
                  className={`text-base font-bold ${
                    firm.holdWeekend ? "text-[#22C55E]" : "text-[#EF4444]"
                  }`}
                >
                  {firm.holdWeekend ? "Allowed" : "Not allowed"}
                </p>
              </div>
            </div>
          </section>

          {/* Algo Studio compatibility */}
          <section className="mb-14 p-6 rounded-lg border border-[rgba(99,102,241,0.3)] bg-[rgba(99,102,241,0.04)]">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xl md:text-2xl font-bold text-[#FAFAFA] tracking-tight">
                Algo Studio compatibility
              </h2>
              <span className="text-2xl font-extrabold text-[#6366F1]">
                {firm.algoStudioCompatibility.score}/10
              </span>
            </div>
            <p className="text-[15px] leading-relaxed text-[#A1A1AA] mb-6">
              {firm.algoStudioCompatibility.summary}
            </p>

            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <h3 className="text-sm font-semibold text-[#22C55E] mb-2">Fits well</h3>
                <ul className="space-y-1.5">
                  {firm.algoStudioCompatibility.fitsWell.map((item) => (
                    <li key={item} className="flex gap-2 text-xs text-[#A1A1AA] leading-relaxed">
                      <span className="text-[#22C55E]">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#F59E0B] mb-2">Caveats</h3>
                <ul className="space-y-1.5">
                  {firm.algoStudioCompatibility.caveats.map((item) => (
                    <li key={item} className="flex gap-2 text-xs text-[#A1A1AA] leading-relaxed">
                      <span className="text-[#F59E0B]">!</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* Configuration notes */}
          <section className="mb-14">
            <h2 className="text-xl md:text-2xl font-bold text-[#FAFAFA] tracking-tight mb-4">
              Recommended Algo Studio configuration for {firm.name}
            </h2>
            <ol className="space-y-3 list-decimal pl-5 text-[15px] leading-relaxed text-[#A1A1AA] marker:text-[#6366F1] marker:font-bold">
              {firm.configurationNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ol>
          </section>

          {/* FAQs */}
          <section className="mb-14 pt-12 border-t border-[rgba(255,255,255,0.06)]">
            <h2 className="text-xl md:text-2xl font-bold text-[#FAFAFA] tracking-tight mb-6">
              Frequently asked questions
            </h2>
            <div className="space-y-3">
              {firm.faqs.map((f) => (
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

          {/* Related firms */}
          {related.length > 0 && (
            <section className="mb-14 pt-12 border-t border-[rgba(255,255,255,0.06)]">
              <h2 className="text-xl md:text-2xl font-bold text-[#FAFAFA] tracking-tight mb-6">
                Other prop firms
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {related.map((r) => (
                  <Link
                    key={r.slug}
                    href={`/prop-firms/${r.slug}`}
                    className="block p-5 rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#111114] hover:border-[rgba(99,102,241,0.4)] transition-colors"
                  >
                    <h3 className="text-sm font-semibold text-[#FAFAFA] mb-1.5">{r.name}</h3>
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
              Test your EA against {firm.name}&apos;s rules
            </h2>
            <p className="text-sm text-[#A1A1AA] max-w-xl mx-auto mb-6 leading-relaxed">
              Upload your backtest and run Monte Carlo analysis against {firm.name}&apos;s drawdown
              limits. See the survival probability before you risk the evaluation fee.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/sample-evaluation"
                className="inline-block px-5 py-2.5 bg-[#6366F1] text-white text-sm font-medium rounded-lg hover:bg-[#818CF8] transition-colors"
              >
                Run free evaluation
              </Link>
              <Link
                href="/features/drift-detection"
                className="inline-block px-5 py-2.5 border border-[rgba(255,255,255,0.12)] text-[#FAFAFA] text-sm font-medium rounded-lg hover:border-[rgba(255,255,255,0.24)] transition-colors"
              >
                Drift detection
              </Link>
            </div>
            <p className="text-xs text-[#52525B] mt-6">
              Last verified: {firm.lastVerified} · Always check {firm.name}&apos;s official rules
              before applying.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
