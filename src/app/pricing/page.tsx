import Link from "next/link";
import { PLANS, formatPrice } from "@/lib/plans";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
import { AnimateOnScroll } from "@/components/marketing/animate-on-scroll";
import { SectionHeading } from "@/components/marketing/section-heading";
import { SubscribeButton } from "./subscribe-button";

/* ── Icons ── */
const CheckIcon = () => (
  <svg
    className="w-4 h-4 text-[#10B981] flex-shrink-0"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const DashIcon = () => (
  <svg
    className="w-4 h-4 text-[rgba(255,255,255,0.12)] flex-shrink-0"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
  </svg>
);

/* ── Static data ── */

type CellValue = boolean | string;
type MatrixRow = [string, CellValue, CellValue, CellValue, CellValue];

const COMPARISON_MATRIX: { category: string; rows: MatrixRow[] }[] = [
  {
    category: "Plan Limits",
    rows: [
      ["Monitored trading accounts", "1", "Up to 3", "Up to 10", "Unlimited"],
      ["Active strategies per account", "Unlimited", "Unlimited", "Unlimited", "Unlimited"],
    ],
  },
  {
    category: "Monitoring & Detection",
    rows: [
      ["Real-time EA health monitoring", true, true, true, true],
      ["Statistical drift detection (CUSUM)", true, true, true, true],
      ["Backtest vs live comparison", true, true, true, true],
      ["Automatic strategy halt on drift", true, true, true, true],
      ["Lifecycle governance (RUN / PAUSE / STOP)", true, true, true, true],
    ],
  },
  {
    category: "Verification & Track Records",
    rows: [
      ["Verified track record (hash chain)", true, true, true, true],
      ["Backtest health scoring", true, true, true, true],
      ["Public track record shares", "1", "5", "Unlimited", "Unlimited"],
      ["Embeddable proof widget", true, true, true, true],
      ["Strategy baselines", "1", "Unlimited", "Unlimited", "Unlimited"],
    ],
  },
  {
    category: "Alerts & Support",
    rows: [
      ["Browser push alerts", true, true, true, true],
      ["Telegram alerts", false, true, true, true],
      ["Slack + webhook + email alerts", false, false, true, true],
      ["Earn 20% referral commissions", false, true, true, true],
      ["Priority support", false, true, true, true],
      ["1-on-1 strategy review (1/month)", false, false, true, true],
      ["Direct developer channel", false, false, false, true],
      ["Custom onboarding", false, false, false, true],
    ],
  },
];

const CARD_FEATURES: [string, boolean, boolean, boolean, boolean][] = [
  ["All monitoring features", true, true, true, true],
  ["Drift detection & auto-halt", true, true, true, true],
  ["Verified track records", true, true, true, true],
  ["Telegram alerts", false, true, true, true],
  ["Slack + webhook alerts", false, false, true, true],
  ["Earn 20% referral commissions", false, true, true, true],
  ["Priority support", false, true, true, true],
  ["Direct developer channel", false, false, false, true],
];

const FAQ_ITEMS = [
  {
    q: "What is the difference between the plans?",
    a: "All platform features — drift detection, health monitoring, governance, verified track records — are included on every plan, including the free Baseline tier. Plans differ only by how many trading accounts you can monitor simultaneously.",
  },
  {
    q: "What counts as a monitored trading account?",
    a: "Each MetaTrader 5 trading account connected to Algo Studio counts as one monitored account. You can run unlimited strategies within each account. Your plan determines how many accounts you can monitor at the same time.",
  },
  {
    q: "Are all features really included on the free plan?",
    a: "Yes. Drift detection, backtest comparison, health scoring, auto-halt, verified track records — everything is included on Baseline. The only limit is 1 monitored trading account.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from your account settings at any time. No contracts, no cancellation fees. Your subscription remains active until the end of the current billing period.",
  },
  {
    q: "What happens if I downgrade?",
    a: "Your strategies, track records, and monitoring data are preserved. If you exceed your new plan's account limit, existing accounts stay active but you cannot add new ones.",
  },
  {
    q: "What payment methods do you accept?",
    a: "Visa, Mastercard, and American Express via Stripe. We never store your card details.",
  },
];

/* ── Prices ── */
const proPrice = PLANS.PRO.prices?.monthly;
const elitePrice = PLANS.ELITE.prices?.monthly;
const institutionalPrice = PLANS.INSTITUTIONAL.prices?.monthly;

/* ── Page (Server Component) ── */

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#08080A] text-[#FAFAFA]">
      <SiteNav />

      <main id="main-content" className="pt-32 pb-0 px-6">
        {/* ═══════════════════════════════════════════════════════
            1. HEADER
            ═══════════════════════════════════════════════════════ */}
        <div className="max-w-4xl mx-auto text-center mb-14">
          <h1 className="text-[28px] md:text-[42px] font-extrabold tracking-tight leading-[1.15]">
            Choose your monitoring scale
          </h1>
          <p className="mt-5 text-base text-[#A1A1AA] max-w-xl mx-auto leading-relaxed">
            Every feature is included on every plan — including the free tier. You only pay for how
            many trading accounts you monitor.
          </p>
        </div>

        {/* ═══════════════════════════════════════════════════════
            2. PLAN CARDS
            ═══════════════════════════════════════════════════════ */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto mb-4">
          {/* Baseline — Free */}
          <AnimateOnScroll delay={1}>
            <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#0D0D12] p-6 flex flex-col h-full">
              <h3 className="text-lg font-semibold text-[#FAFAFA]">Baseline</h3>
              <p className="text-xs text-[#71717A] mt-1">Start monitoring one account for free.</p>
              <div className="mt-4">
                <span className="text-3xl font-bold text-[#FAFAFA]">{formatPrice(0, "eur")}</span>
                <span className="text-[#71717A] ml-2 text-sm">/ forever</span>
              </div>

              <div className="mt-4 py-2.5 px-3 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
                <p className="text-sm font-medium text-[#FAFAFA]">1 monitored trading account</p>
              </div>

              <ul className="mt-5 space-y-2.5 flex-1">
                {CARD_FEATURES.map(([label, included]) => (
                  <li key={label} className="flex items-start gap-2.5 text-sm text-[#A1A1AA]">
                    {included ? <CheckIcon /> : <DashIcon />}
                    <span className={included ? undefined : "text-[#52525B]"}>{label}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/register"
                className="mt-6 w-full py-3 rounded-lg font-medium border border-[rgba(255,255,255,0.10)] text-[#FAFAFA] hover:border-[rgba(255,255,255,0.20)] transition-colors block text-center text-sm"
              >
                Start free
              </Link>
              <p className="mt-2 text-center text-xs text-[#71717A]">No credit card required</p>
            </div>
          </AnimateOnScroll>

          {/* Control — Pro */}
          <AnimateOnScroll delay={2}>
            <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#0D0D12] p-6 flex flex-col h-full">
              <h3 className="text-lg font-semibold text-[#FAFAFA]">Control</h3>
              <p className="text-xs text-[#71717A] mt-1">
                Monitor multiple strategies across accounts.
              </p>
              <div className="mt-4">
                {proPrice ? (
                  <>
                    <span className="text-3xl font-bold text-[#FAFAFA]">
                      {formatPrice(proPrice.amount, "eur")}
                    </span>
                    <span className="text-[#71717A] ml-2 text-sm">/ month</span>
                  </>
                ) : (
                  <span className="text-2xl font-bold text-[#71717A]">Coming soon</span>
                )}
              </div>

              <div className="mt-4 py-2.5 px-3 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
                <p className="text-sm font-medium text-[#FAFAFA]">
                  Up to 3 monitored trading accounts
                </p>
              </div>

              <ul className="mt-5 space-y-2.5 flex-1">
                {CARD_FEATURES.map(([label, , included]) => (
                  <li key={label} className="flex items-start gap-2.5 text-sm text-[#A1A1AA]">
                    {included ? <CheckIcon /> : <DashIcon />}
                    <span className={included ? undefined : "text-[#52525B]"}>{label}</span>
                  </li>
                ))}
              </ul>

              <SubscribeButton plan="PRO" disabled={!proPrice} />
              <p className="mt-2 text-center text-xs text-[#71717A]">Cancel anytime</p>
            </div>
          </AnimateOnScroll>

          {/* Authority — Elite (Most Popular) */}
          <AnimateOnScroll delay={3}>
            <div className="rounded-xl border border-[rgba(255,255,255,0.15)] bg-[#0D0D12] p-6 relative flex flex-col h-full">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-[#6366F1] text-white text-[11px] font-semibold px-3 py-1 rounded-full">
                  Most Popular
                </span>
              </div>
              <h3 className="text-lg font-semibold text-[#FAFAFA]">Authority</h3>
              <p className="text-xs text-[#71717A] mt-1">Full portfolio governance at scale.</p>
              <div className="mt-4">
                {elitePrice ? (
                  <>
                    <span className="text-3xl font-bold text-[#FAFAFA]">
                      {formatPrice(elitePrice.amount, "eur")}
                    </span>
                    <span className="text-[#71717A] ml-2 text-sm">/ month</span>
                  </>
                ) : (
                  <span className="text-2xl font-bold text-[#71717A]">Coming soon</span>
                )}
              </div>

              <div className="mt-4 py-2.5 px-3 rounded-lg bg-[rgba(99,102,241,0.06)] border border-[rgba(99,102,241,0.15)]">
                <p className="text-sm font-medium text-[#FAFAFA]">
                  Up to 10 monitored trading accounts
                </p>
              </div>

              <ul className="mt-5 space-y-2.5 flex-1">
                {CARD_FEATURES.map(([label, , , included]) => (
                  <li key={label} className="flex items-start gap-2.5 text-sm text-[#A1A1AA]">
                    {included ? <CheckIcon /> : <DashIcon />}
                    <span className={included ? undefined : "text-[#52525B]"}>{label}</span>
                  </li>
                ))}
              </ul>

              <SubscribeButton plan="ELITE" variant="primary" disabled={!elitePrice} />
              <p className="mt-2 text-center text-xs text-[#71717A]">Cancel anytime</p>
            </div>
          </AnimateOnScroll>

          {/* Institutional */}
          <AnimateOnScroll delay={4}>
            <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#0D0D12] p-6 flex flex-col h-full">
              <h3 className="text-lg font-semibold text-[#FAFAFA]">Institutional</h3>
              <p className="text-xs text-[#71717A] mt-1">
                Unlimited accounts with dedicated support.
              </p>
              <div className="mt-4">
                {institutionalPrice ? (
                  <>
                    <span className="text-3xl font-bold text-[#FAFAFA]">
                      {formatPrice(institutionalPrice.amount, "eur")}
                    </span>
                    <span className="text-[#71717A] ml-2 text-sm">/ month</span>
                  </>
                ) : (
                  <span className="text-2xl font-bold text-[#71717A]">Coming soon</span>
                )}
              </div>

              <div className="mt-4 py-2.5 px-3 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
                <p className="text-sm font-medium text-[#FAFAFA]">
                  Unlimited monitored trading accounts
                </p>
              </div>

              <ul className="mt-5 space-y-2.5 flex-1">
                {CARD_FEATURES.map(([label, , , , included]) => (
                  <li key={label} className="flex items-start gap-2.5 text-sm text-[#A1A1AA]">
                    {included ? <CheckIcon /> : <DashIcon />}
                    <span className={included ? undefined : "text-[#52525B]"}>{label}</span>
                  </li>
                ))}
              </ul>

              <SubscribeButton plan="INSTITUTIONAL" disabled={!institutionalPrice} />
              <p className="mt-2 text-center text-xs text-[#71717A]">Cancel anytime</p>
            </div>
          </AnimateOnScroll>
        </div>

        <p className="text-center text-xs text-[#71717A] mb-20">
          All prices in EUR. VAT included where applicable.
        </p>

        {/* ═══════════════════════════════════════════════════════
            3. COMPARISON MATRIX
            ═══════════════════════════════════════════════════════ */}
        <section className="bg-[#0C0C10] py-20 -mx-6 px-6" aria-label="Plan comparison">
          <div className="max-w-6xl mx-auto">
            <AnimateOnScroll>
              <SectionHeading>Full feature comparison</SectionHeading>
            </AnimateOnScroll>

            <div
              className="mt-12 overflow-x-auto"
              role="region"
              aria-label="Feature comparison table"
            >
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-[rgba(255,255,255,0.08)]">
                    <th className="text-left py-3 px-4 text-[#71717A] font-medium text-xs">
                      Feature
                    </th>
                    <th className="text-center py-3 px-4 text-[#A1A1AA] font-medium text-xs">
                      Baseline
                    </th>
                    <th className="text-center py-3 px-4 text-[#A1A1AA] font-medium text-xs">
                      Control
                    </th>
                    <th className="text-center py-3 px-4 text-[#A1A1AA] font-medium text-xs">
                      Authority
                    </th>
                    <th className="text-center py-3 px-4 text-[#A1A1AA] font-medium text-xs">
                      Institutional
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_MATRIX.map((section) => (
                    <>
                      <tr key={`cat-${section.category}`}>
                        <td
                          className="py-2 px-4 text-[11px] font-semibold text-[#71717A] uppercase tracking-wider pt-6"
                          colSpan={5}
                        >
                          {section.category}
                        </td>
                      </tr>
                      {section.rows.map(([label, baseline, control, authority, institutional]) => (
                        <tr
                          key={label as string}
                          className="border-b border-[rgba(255,255,255,0.04)]"
                        >
                          <td className="py-2.5 px-4 text-[#A1A1AA] text-[13px]">{label}</td>
                          {[baseline, control, authority, institutional].map((val, i) => (
                            <td key={i} className="py-2.5 px-4">
                              {typeof val === "boolean" ? (
                                <div className="flex justify-center">
                                  {val ? <CheckIcon /> : <DashIcon />}
                                </div>
                              ) : (
                                <span className="block text-center text-[#A1A1AA] text-[13px]">
                                  {val}
                                </span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-[#71717A] text-center mt-3 sm:hidden">
              Scroll sideways to see all plans &rarr;
            </p>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            4. FAQ
            ═══════════════════════════════════════════════════════ */}
        <section className="py-20 px-0" aria-label="Pricing FAQ">
          <div className="max-w-3xl mx-auto">
            <AnimateOnScroll>
              <SectionHeading eyebrow="FAQ">Common pricing questions</SectionHeading>
            </AnimateOnScroll>

            <div className="mt-12 space-y-3">
              {FAQ_ITEMS.map((item) => (
                <details
                  key={item.q}
                  className="group rounded-lg border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]"
                >
                  <summary className="px-5 py-4 cursor-pointer flex items-center justify-between text-sm font-medium text-[#FAFAFA] hover:text-white">
                    <h3 className="pr-4">{item.q}</h3>
                    <svg
                      className="w-4 h-4 text-[#71717A] shrink-0 transition-transform group-open:rotate-180"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <p className="px-5 pb-4 text-sm text-[#A1A1AA] leading-relaxed">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            5. FINAL CTA
            ═══════════════════════════════════════════════════════ */}
        <section className="bg-[#0C0C10] py-20 -mx-6 px-6" aria-label="Get started">
          <div className="max-w-2xl mx-auto text-center">
            <AnimateOnScroll>
              <h2 className="text-2xl md:text-[32px] font-bold text-[#FAFAFA] tracking-tight">
                Start monitoring your strategies today
              </h2>
              <p className="mt-4 text-sm text-[#A1A1AA] leading-relaxed">
                All features included on the free plan. No credit card required. Upgrade when you
                need more accounts.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/register"
                  className="px-7 py-3.5 bg-[#6366F1] text-white font-semibold rounded-lg hover:bg-[#818CF8] transition-all text-sm btn-primary-cta"
                >
                  Monitor your first strategy free
                </Link>
                <Link
                  href="/contact"
                  className="text-sm text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors"
                >
                  Questions? Contact us
                </Link>
              </div>
            </AnimateOnScroll>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
