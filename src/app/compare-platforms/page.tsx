import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import { CTASection } from "@/components/marketing/cta-section";

export const metadata: Metadata = {
  title: "AlgoStudio vs Competitors — Platform Comparisons",
  description:
    "Compare AlgoStudio with EA Builder, StrategyQuant, FXDreema, and other EA building platforms. Honest feature, pricing, and usability comparisons.",
  alternates: { canonical: "/compare-platforms" },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "Compare Platforms", href: "/compare-platforms" },
];

const comparisons = [
  {
    slug: "vs-ea-builder",
    competitor: "EA Builder",
    tagline: "Template-driven simplicity vs drag-and-drop complexity",
    description:
      "EA Builder offers a free drag-and-drop interface for creating EAs. See how AlgoStudio's template-based approach compares on speed, output quality, and ease of use.",
    strengths: ["Free basic version", "Large user community"],
    algoBetter: ["Faster time to first EA", "Cleaner MQL5 output", "Built-in risk management"],
  },
  {
    slug: "vs-strategyquant",
    competitor: "StrategyQuant",
    tagline: "Focused simplicity vs full quantitative platform",
    description:
      "StrategyQuant is a powerful quantitative strategy development platform. Compare it with AlgoStudio's streamlined approach for traders who want results fast.",
    strengths: ["AI-powered strategy generation", "Built-in backtesting engine"],
    algoBetter: ["No coding required", "Minutes instead of hours", "Lower price point"],
  },
  {
    slug: "vs-fxdreema",
    competitor: "FXDreema",
    tagline: "Pre-built templates vs visual flowchart programming",
    description:
      "FXDreema uses a flowchart-based visual editor for building EAs. See how AlgoStudio's template-first approach offers a faster path to a working Expert Advisor.",
    strengths: ["Free to use", "Highly flexible flowchart editor"],
    algoBetter: ["Start with working strategy", "Simpler interface", "Better code quality"],
  },
];

export default function ComparePlatformsPage() {
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(breadcrumbs)) }}
      />

      <SiteNav />

      <main className="pt-24 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <Breadcrumbs items={breadcrumbs} />

          <section className="text-center mb-20">
            <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
              How AlgoStudio Compares
            </h1>
            <p className="text-lg text-[#94A3B8] max-w-2xl mx-auto">
              There are several ways to build MT5 Expert Advisors. We believe in honest comparisons
              — every tool has strengths. Here is how AlgoStudio stacks up.
            </p>
          </section>

          {/* Overview table */}
          <section className="mb-20">
            <h2 className="text-2xl font-bold text-white mb-8 text-center">At a Glance</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[rgba(79,70,229,0.2)]">
                    <th className="text-left py-4 px-4 text-[#64748B] font-medium">Feature</th>
                    <th className="text-center py-4 px-4 text-[#A78BFA] font-medium">AlgoStudio</th>
                    <th className="text-center py-4 px-4 text-[#64748B] font-medium">EA Builder</th>
                    <th className="text-center py-4 px-4 text-[#64748B] font-medium">
                      StrategyQuant
                    </th>
                    <th className="text-center py-4 px-4 text-[#64748B] font-medium">FXDreema</th>
                  </tr>
                </thead>
                <tbody className="text-[#94A3B8]">
                  {[
                    ["Approach", "Templates", "Drag-and-drop", "AI generation", "Flowchart"],
                    ["Time to first EA", "< 5 min", "30-60 min", "1-3 hours", "30-60 min"],
                    ["Coding required", "None", "Minimal", "Optional", "None"],
                    ["MQL5 output", "Clean source", "Basic source", "Generated", "Generated"],
                    ["MQL4 support", "Pro+", "Yes", "Yes", "Yes"],
                    ["Built-in risk mgmt", "Yes", "Basic", "Advanced", "Manual"],
                    ["Free tier", "Yes", "Limited free", "No", "Yes"],
                    ["Built-in backtesting", "Via MT5", "No", "Yes", "No"],
                    ["Learning curve", "Minimal", "Moderate", "Steep", "Moderate"],
                  ].map(([feature, algo, ea, sq, fx]) => (
                    <tr key={feature} className="border-b border-[rgba(79,70,229,0.1)]">
                      <td className="py-3 px-4 text-[#CBD5E1] font-medium">{feature}</td>
                      <td className="py-3 px-4 text-center text-[#22D3EE]">{algo}</td>
                      <td className="py-3 px-4 text-center">{ea}</td>
                      <td className="py-3 px-4 text-center">{sq}</td>
                      <td className="py-3 px-4 text-center">{fx}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Individual comparison cards */}
          <section className="mb-20">
            <h2 className="text-2xl font-bold text-white mb-8 text-center">Detailed Comparisons</h2>
            <div className="grid gap-6">
              {comparisons.map((c) => (
                <Link
                  key={c.slug}
                  href={`/compare-platforms/${c.slug}`}
                  className="block bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-8 hover:border-[rgba(79,70,229,0.4)] hover:shadow-[0_4px_24px_rgba(79,70,229,0.15)] transition-all duration-200 group"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white group-hover:text-[#22D3EE] transition-colors mb-2">
                        AlgoStudio vs {c.competitor}
                      </h3>
                      <p className="text-xs text-[#A78BFA] font-medium mb-3">{c.tagline}</p>
                      <p className="text-sm text-[#94A3B8] leading-relaxed">{c.description}</p>
                    </div>
                    <div className="flex-shrink-0 md:text-right">
                      <span className="text-sm text-[#A78BFA] font-medium group-hover:underline">
                        Read full comparison &rarr;
                      </span>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 mt-6">
                    <div>
                      <p className="text-xs text-[#64748B] font-medium mb-2 uppercase tracking-wider">
                        {c.competitor} strengths
                      </p>
                      <ul className="space-y-1">
                        {c.strengths.map((s) => (
                          <li key={s} className="text-xs text-[#94A3B8] flex items-start gap-2">
                            <span className="text-[#64748B] mt-0.5 flex-shrink-0">&#8226;</span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs text-[#64748B] font-medium mb-2 uppercase tracking-wider">
                        AlgoStudio advantages
                      </p>
                      <ul className="space-y-1">
                        {c.algoBetter.map((s) => (
                          <li key={s} className="text-xs text-[#22D3EE] flex items-start gap-2">
                            <span className="mt-0.5 flex-shrink-0">&#10003;</span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Existing comparison link */}
          <section className="mb-20 text-center">
            <p className="text-[#94A3B8] mb-4">
              Also see our general comparison of template-based vs complex EA builders:
            </p>
            <Link
              href="/compare/algostudio-vs-complex-ea-builders"
              className="text-sm text-[#A78BFA] font-medium hover:underline"
            >
              AlgoStudio vs Complex EA Builders &rarr;
            </Link>
          </section>
        </div>
      </main>

      <CTASection
        title="See the difference for yourself"
        description="Pick a template and export your first EA in minutes. No credit card required."
      />

      <Footer />
    </div>
  );
}
