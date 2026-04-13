import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import { FEATURES, getFeatureBySlug, getRelatedFeatures, type Feature } from "@/data/features";
import { getPostBySlug } from "@/lib/blog/posts";

interface Props {
  params: Promise<{ slug: string }>;
}

const baseUrl = process.env.SITE_URL ?? "https://algo-studio.com";

export function generateStaticParams(): Array<{ slug: string }> {
  return FEATURES.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const feature = getFeatureBySlug(slug);
  if (!feature) return { title: "Feature Not Found", robots: { index: false, follow: false } };

  const url = `${baseUrl}/features/${slug}`;
  return {
    title: feature.metaTitle,
    description: feature.metaDescription,
    alternates: { canonical: url },
    openGraph: {
      title: feature.metaTitle,
      description: feature.metaDescription,
      url,
      type: "article",
      images: [`/features/${slug}/opengraph-image`],
    },
    twitter: {
      card: "summary_large_image",
      title: feature.metaTitle,
      description: feature.metaDescription,
    },
  };
}

function articleJsonLd(feature: Feature, slug: string) {
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: feature.name,
    description: feature.metaDescription,
    url: `${baseUrl}/features/${slug}`,
    image: `${baseUrl}/opengraph-image`,
    author: { "@type": "Organization", name: "Algo Studio" },
    publisher: {
      "@type": "Organization",
      name: "Algo Studio",
      logo: { "@type": "ImageObject", url: `${baseUrl}/opengraph-image` },
    },
  };
}

function faqJsonLd(feature: Feature) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: feature.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

/** Splits section body into paragraphs on blank lines. No HTML in body. */
function paragraphsOf(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export default async function FeaturePage({ params }: Props) {
  const { slug } = await params;
  const feature = getFeatureBySlug(slug);
  if (!feature) notFound();

  const related = getRelatedFeatures(slug);
  const relatedPosts = feature.relatedBlogPosts
    .map((s) => getPostBySlug(s))
    .filter((p): p is NonNullable<typeof p> => p !== undefined)
    .slice(0, 3);

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Features", href: "/features" },
    { name: feature.name, href: `/features/${slug}` },
  ];

  return (
    <div className="min-h-screen bg-[#08080A] text-[#FAFAFA]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(breadcrumbs)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd(feature, slug)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(feature)) }}
      />

      <SiteNav />

      <main id="main-content" className="pt-24 pb-0 px-6">
        <div className="max-w-3xl mx-auto">
          <Breadcrumbs items={breadcrumbs} />

          {/* Hero */}
          <header className="mb-14">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6366F1] mb-3">
              Feature
            </p>
            <h1 className="text-[30px] md:text-[44px] font-extrabold tracking-tight leading-[1.12] mb-5">
              {feature.name}
            </h1>
            <p className="text-base md:text-lg text-[#A1A1AA] leading-relaxed max-w-2xl">
              {feature.tagline}
            </p>
          </header>

          {/* Sections */}
          <article className="space-y-14">
            {feature.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-xl md:text-2xl font-bold text-[#FAFAFA] tracking-tight mb-4">
                  {section.heading}
                </h2>
                <div className="space-y-4 text-[15px] leading-relaxed text-[#A1A1AA]">
                  {paragraphsOf(section.body).map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </section>
            ))}
          </article>

          {/* FAQs */}
          <section className="mt-20 pt-12 border-t border-[rgba(255,255,255,0.06)]">
            <h2 className="text-xl md:text-2xl font-bold text-[#FAFAFA] tracking-tight mb-6">
              Frequently asked questions
            </h2>
            <div className="space-y-3">
              {feature.faqs.map((f) => (
                <details
                  key={f.q}
                  className="group glass-card p-5 rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#111114]"
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

          {/* Related features */}
          {related.length > 0 && (
            <section className="mt-20 pt-12 border-t border-[rgba(255,255,255,0.06)]">
              <h2 className="text-xl md:text-2xl font-bold text-[#FAFAFA] tracking-tight mb-6">
                Related features
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {related.map((r) => (
                  <Link
                    key={r.slug}
                    href={`/features/${r.slug}`}
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

          {/* Related blog posts */}
          {relatedPosts.length > 0 && (
            <section className="mt-14">
              <h2 className="text-xl md:text-2xl font-bold text-[#FAFAFA] tracking-tight mb-6">
                Related reading
              </h2>
              <ul className="space-y-3">
                {relatedPosts.map((p) => (
                  <li key={p.slug}>
                    <Link
                      href={`/blog/${p.slug}`}
                      className="block p-4 rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#111114] hover:border-[rgba(99,102,241,0.4)] transition-colors"
                    >
                      <h3 className="text-sm font-semibold text-[#FAFAFA] mb-1">{p.title}</h3>
                      <p className="text-xs text-[#71717A] leading-relaxed">{p.description}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* CTA */}
          <section className="mt-20 pt-12 mb-16 border-t border-[rgba(255,255,255,0.06)] text-center">
            <h2 className="text-xl md:text-2xl font-bold text-[#FAFAFA] mb-3">
              Try {feature.name.toLowerCase()} on your own EA
            </h2>
            <p className="text-sm text-[#A1A1AA] max-w-xl mx-auto mb-6 leading-relaxed">
              Free Baseline plan includes every feature. 1 monitored account, no credit card, no
              time limit. Upload your backtest and start monitoring in 5 minutes.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/sample-evaluation"
                className="inline-block px-5 py-2.5 bg-[#6366F1] text-white text-sm font-medium rounded-lg hover:bg-[#818CF8] transition-colors"
              >
                Run a free evaluation
              </Link>
              <Link
                href="/pricing"
                className="inline-block px-5 py-2.5 border border-[rgba(255,255,255,0.12)] text-[#FAFAFA] text-sm font-medium rounded-lg hover:border-[rgba(255,255,255,0.24)] transition-colors"
              >
                See pricing
              </Link>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
