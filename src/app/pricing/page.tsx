"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PLANS, formatPrice } from "@/lib/plans";
import { getCsrfHeaders } from "@/lib/api-client";
import { showError } from "@/lib/toast";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";

// ── Icons ──────────────────────────────────────────────

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
    className="w-4 h-4 text-[rgba(255,255,255,0.15)] flex-shrink-0"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
  </svg>
);

// ── Comparison matrix (4 tiers) ────────────────────────

type CellValue = boolean | string;
type MatrixRow = [string, CellValue, CellValue, CellValue, CellValue];

const COMPARISON_MATRIX: { category: string; rows: MatrixRow[] }[] = [
  {
    category: "Plan Limits",
    rows: [
      ["Monitored trading accounts", "1", "Up to 3", "Up to 10", "Unlimited"],
      ["Active strategies", "Unlimited", "Unlimited", "Unlimited", "Unlimited"],
      ["MQL5 exports", "Unlimited", "Unlimited", "Unlimited", "Unlimited"],
    ],
  },
  {
    category: "Strategy Evaluation",
    rows: [
      ["Backtest health scoring", true, true, true, true],
      ["Monte Carlo risk simulation", true, true, true, true],
      ["Strategy journal", true, true, true, true],
      ["EA builder & strategy templates", true, true, true, true],
    ],
  },
  {
    category: "Live Monitoring & Governance",
    rows: [
      ["Live health monitoring", true, true, true, true],
      ["Drift detection", true, true, true, true],
      ["Edge degradation analysis", true, true, true, true],
      ["Lifecycle governance (RUN / PAUSE / STOP)", true, true, true, true],
      ["Governance snapshot logging", true, true, true, true],
      ["Portfolio-level governance", true, true, true, true],
    ],
  },
  {
    category: "Verification & Proof",
    rows: [
      ["Strategy identity & versioning", true, true, true, true],
      ["Verified track record (hash chain)", true, true, true, true],
      ["Public proof page", true, true, true, true],
      ["Embeddable proof widget", true, true, true, true],
    ],
  },
  {
    category: "Support",
    rows: [
      ["Priority support", false, true, true, true],
      ["Direct developer channel", false, false, false, true],
      ["Custom onboarding", false, false, false, true],
    ],
  },
];

// ── FAQ ────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: "What is the difference between the plans?",
    a: "All platform features \u2014 strategy evaluation, live monitoring, governance, and verification \u2014 are included on every plan, including Baseline. Plans differ by the number of monitored trading accounts: Baseline includes 1, Control supports up to 3, Authority supports up to 10, and Institutional offers unlimited. Paid plans also include priority support, with Authority and Institutional adding 1-on-1 strategy reviews and direct developer access.",
  },
  {
    q: "What is a monitored trading account?",
    a: "A monitored trading account is a live MetaTrader 5 trading account connected to AlgoStudio for continuous monitoring. Each connected account is tracked for health, drift, and governance events. Your plan determines how many monitored trading accounts you can run simultaneously.",
  },
  {
    q: "What is a verified track record?",
    a: "Every trade is recorded in a tamper-resistant hash chain. Each entry is cryptographically linked to the previous one, producing a verifiable history that can be independently audited via public proof pages.",
  },
  {
    q: "Are all features really included on the free plan?",
    a: "Yes. Every platform feature \u2014 backtest scoring, Monte Carlo simulation, live monitoring, drift detection, lifecycle governance, verified track records, EA builder, and unlimited exports \u2014 is included on Baseline. The only limit is the number of monitored trading accounts.",
  },
  {
    q: "What happens if I downgrade?",
    a: "All strategies, verified track records, and monitoring data are preserved. If you exceed your new plan\u2019s monitored trading account limit, existing monitored trading accounts remain active but you cannot add new ones until you are within the limit.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from your account settings at any time. No long-term contracts and no cancellation fees. Your subscription remains active until the end of the current billing period.",
  },
  {
    q: "What payment methods do you accept?",
    a: "All major credit and debit cards (Visa, Mastercard, American Express) via Stripe. We do not store card details.",
  },
];

// ── Card feature rows (unified across all plans) ──────
// [label, baseline, control, authority, institutional]
const CARD_FEATURES: [string, boolean, boolean, boolean, boolean][] = [
  ["All platform features included", true, true, true, true],
  ["Unlimited strategies & exports", true, true, true, true],
  ["Priority support", false, true, true, true],
  ["Email, webhook & Telegram alerts", false, true, true, true],
  ["Direct developer channel", false, false, false, true],
  ["Custom onboarding", false, false, false, true],
];

// ── Page ───────────────────────────────────────────────

export default function PricingPage() {
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const proPrice = PLANS.PRO.prices?.monthly;
  const elitePrice = PLANS.ELITE.prices?.monthly;
  const institutionalPrice = PLANS.INSTITUTIONAL.prices?.monthly;

  async function handleSubscribe(plan: "PRO" | "ELITE" | "INSTITUTIONAL") {
    setLoadingPlan(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({ plan, interval: "monthly" }),
      });
      if (res.status === 401) {
        router.push(`/login?mode=register&redirect=/pricing`);
        return;
      }
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        showError(
          data.details ? `${data.error}: ${data.details}` : data.error || "Failed to start checkout"
        );
        setLoadingPlan(null);
      }
    } catch {
      showError("Something went wrong. Please try again.");
      setLoadingPlan(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#09090B] text-white">
      <SiteNav />

      <main id="main-content" className="pt-32 pb-0 px-6">
        {/* ════════════════════════════════════════════════════════════
            1. HEADER
            ════════════════════════════════════════════════════════════ */}
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h1 className="text-[28px] md:text-[36px] font-extrabold tracking-tight leading-[1.2]">
            Pricing for live strategy monitoring
          </h1>
          <p className="mt-4 text-sm md:text-base text-[#A1A1AA] max-w-2xl mx-auto">
            All features included on every plan. Choose how many monitored trading accounts you
            need.
          </p>
          <p className="mt-3 text-sm text-[#71717A] max-w-2xl mx-auto">
            Unlimited strategies. Unlimited exports. Billed monthly. Cancel anytime.
          </p>
        </div>

        {/* ════════════════════════════════════════════════════════════
            2. PLAN CARDS
            ════════════════════════════════════════════════════════════ */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto mb-4">
          {/* Baseline — Free */}
          <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-6 flex flex-col">
            <h3 className="text-lg font-semibold text-[#FAFAFA]">Baseline</h3>
            <p className="text-xs text-[#71717A] mt-1">Evaluate and validate before going live.</p>
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
            <p className="mt-2 text-center text-xs text-[#71717A]">No credit card required.</p>
          </div>

          {/* Control — Pro */}
          <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-6 flex flex-col">
            <h3 className="text-lg font-semibold text-[#FAFAFA]">Control</h3>
            <p className="text-xs text-[#71717A] mt-1">Monitor multiple live strategies.</p>
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

            <button
              onClick={() => handleSubscribe("PRO")}
              disabled={loadingPlan !== null || !proPrice}
              className="mt-6 w-full py-3 rounded-lg font-medium border border-[rgba(255,255,255,0.10)] text-[#FAFAFA] hover:border-[rgba(255,255,255,0.20)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {loadingPlan === "PRO" ? "Loading..." : "Start monitoring"}
            </button>
            <p className="mt-2 text-center text-xs text-[#71717A]">Cancel anytime.</p>
          </div>

          {/* Authority — Elite (Most Popular) */}
          <div className="rounded-xl border border-[#6366F1] bg-[#111114] p-6 relative flex flex-col">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-[#6366F1] text-white text-[11px] font-semibold px-3 py-1 rounded-full">
                Most Popular
              </span>
            </div>
            <h3 className="text-lg font-semibold text-[#FAFAFA]">Authority</h3>
            <p className="text-xs text-[#71717A] mt-1">Govern strategy portfolios at scale.</p>
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

            <div className="mt-4 py-2.5 px-3 rounded-lg bg-[rgba(99,102,241,0.08)] border border-[rgba(99,102,241,0.20)]">
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

            <button
              onClick={() => handleSubscribe("ELITE")}
              disabled={loadingPlan !== null || !elitePrice}
              className="mt-6 w-full py-3 rounded-lg font-medium bg-[#6366F1] text-white hover:bg-[#818CF8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {loadingPlan === "ELITE" ? "Loading..." : "Start monitoring"}
            </button>
            <p className="mt-2 text-center text-xs text-[#71717A]">Cancel anytime.</p>
          </div>

          {/* Institutional */}
          <div className="rounded-xl border border-[rgba(245,158,11,0.25)] bg-[#111114] p-6 flex flex-col">
            <h3 className="text-lg font-semibold text-[#FAFAFA]">Institutional</h3>
            <p className="text-xs text-[#71717A] mt-1">
              Unlimited capacity with dedicated onboarding.
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

            <div className="mt-4 py-2.5 px-3 rounded-lg bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.20)]">
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

            <button
              onClick={() => handleSubscribe("INSTITUTIONAL")}
              disabled={loadingPlan !== null || !institutionalPrice}
              className="mt-6 w-full py-3 rounded-lg font-medium border border-[rgba(245,158,11,0.30)] text-[#FAFAFA] hover:border-[rgba(245,158,11,0.50)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {loadingPlan === "INSTITUTIONAL" ? "Loading..." : "Start monitoring"}
            </button>
            <p className="mt-2 text-center text-xs text-[#71717A]">Cancel anytime.</p>
          </div>
        </div>

        <p className="text-center text-xs text-[#71717A] mb-16">
          All prices in EUR. VAT included where applicable.
        </p>

        {/* ════════════════════════════════════════════════════════════
            3. COMPARISON MATRIX
            ════════════════════════════════════════════════════════════ */}
        <div className="max-w-6xl mx-auto mb-16">
          <h2 className="text-xl font-bold text-[#FAFAFA] text-center mb-8 tracking-tight">
            Plan comparison
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.06)]">
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
                        className="py-2 px-4 text-[11px] font-semibold text-[#71717A] uppercase tracking-wider pt-5"
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
                          <td key={i} className="py-2.5 px-4 text-center">
                            {typeof val === "boolean" ? (
                              val ? (
                                <CheckIcon />
                              ) : (
                                <DashIcon />
                              )
                            ) : (
                              <span className="text-[#A1A1AA] text-[13px]">{val}</span>
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

        {/* ════════════════════════════════════════════════════════════
            4. FAQ
            ════════════════════════════════════════════════════════════ */}
        <div className="max-w-3xl mx-auto mb-16">
          <h2 className="text-xl font-bold text-[#FAFAFA] text-center mb-8 tracking-tight">
            Frequently asked questions
          </h2>
          <div className="space-y-2">
            {FAQ_ITEMS.map((item, i) => (
              <details
                key={i}
                className="group rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] overflow-hidden"
              >
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer text-[#FAFAFA] font-medium text-sm list-none">
                  {item.q}
                  <svg
                    className="w-4 h-4 text-[#71717A] group-open:rotate-180 transition-transform flex-shrink-0 ml-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </summary>
                <div className="px-5 pb-4 text-sm text-[#A1A1AA] leading-relaxed">{item.a}</div>
              </details>
            ))}
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════
            5. FINAL CTA
            ════════════════════════════════════════════════════════════ */}
        <div className="max-w-2xl mx-auto text-center py-12 md:py-16">
          <h2 className="text-xl font-bold text-[#FAFAFA] tracking-tight">
            Start monitoring your strategies with AlgoStudio.
          </h2>
          <p className="mt-3 text-sm text-[#A1A1AA]">Free to start. No credit card required.</p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="px-6 py-3 bg-[#6366F1] text-white font-medium rounded-lg hover:bg-[#818CF8] transition-colors text-sm"
            >
              Start monitoring
            </Link>
            <Link
              href="/contact"
              className="text-sm text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors"
            >
              Contact support
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
