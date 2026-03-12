"use client";

import { useState, useEffect } from "react";
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
    className="w-4 h-4 text-[#10B981] flex-shrink-0 mt-0.5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const DashIcon = () => (
  <svg
    className="w-4 h-4 text-[rgba(255,255,255,0.15)] flex-shrink-0 mx-auto"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
  </svg>
);

// ── Comparison matrix ──────────────────────────────────

type CellValue = boolean | string;
type MatrixRow = [string, CellValue, CellValue, CellValue];

const COMPARISON_MATRIX: { category: string; rows: MatrixRow[] }[] = [
  {
    category: "Strategy Monitoring",
    rows: [
      ["Active strategies", "1", "Unlimited", "Unlimited"],
      ["Backtest health scoring", true, true, true],
      ["Monte Carlo risk simulation", true, true, true],
      ["Live health monitoring", false, true, true],
      ["Drift detection", false, true, true],
      ["Edge degradation alerts", false, false, true],
      ["CUSUM drift analysis", false, false, true],
    ],
  },
  {
    category: "Verification & Proof",
    rows: [
      ["Strategy identity & versioning", false, true, true],
      ["Verified track record (hash chain)", false, true, true],
      ["Public proof page", false, true, true],
      ["Embeddable proof widget", false, false, true],
    ],
  },
  {
    category: "Lifecycle Governance",
    rows: [
      ["Lifecycle states (run / pause)", false, true, true],
      ["Full lifecycle control (run / pause / stop)", false, false, true],
      ["Governance snapshot logging", false, true, true],
      ["Automatic intervention on deviation", false, false, true],
      ["Portfolio-level governance", false, false, true],
    ],
  },
  {
    category: "Strategy Tools",
    rows: [
      ["EA builder & strategy templates", true, true, true],
      ["MQL5 export", "3/month", "Unlimited", "Unlimited"],
      ["Strategy journal", true, true, true],
    ],
  },
  {
    category: "Support",
    rows: [
      ["Community support", true, true, true],
      ["Priority support", false, true, true],
      ["1-on-1 strategy review", false, false, "1/month"],
      ["Direct developer channel", false, false, true],
    ],
  },
];

// ── FAQ ────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: "What is the difference between the three plans?",
    a: "Baseline provides strategy evaluation tools: health scoring, Monte Carlo simulation, and the EA builder. Control adds live monitoring, verified track records, public proof pages, and lifecycle governance for individual strategies. Authority extends governance to the portfolio level with full lifecycle control, advanced drift analysis, and incident handling.",
  },
  {
    q: "What is a verified track record?",
    a: "Every trade is recorded in a tamper-resistant hash chain. Each entry is cryptographically linked to the previous one, producing a verifiable history. Control and Authority plans include public proof pages where this track record can be independently audited.",
  },
  {
    q: "Are EA builder and MQL5 export included in all plans?",
    a: "Yes. The EA builder and strategy templates are available on all plans including Baseline. Baseline includes 3 MQL5 exports per month. Control and Authority include unlimited exports.",
  },
  {
    q: "What happens if I downgrade?",
    a: "All strategies and verified track records are preserved. Active monitoring and governance features revert to the capabilities of your new plan. You can upgrade again at any time.",
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

// ── Page ───────────────────────────────────────────────

export default function PricingPage() {
  const router = useRouter();
  const [interval, setBillingInterval] = useState<"monthly" | "yearly">(() => {
    if (typeof window !== "undefined") {
      return (sessionStorage.getItem("billingInterval") as "monthly" | "yearly") || "monthly";
    }
    return "monthly";
  });
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  useEffect(() => {
    sessionStorage.setItem("billingInterval", interval);
  }, [interval]);

  const proPrice = PLANS.PRO.prices?.[interval];
  const elitePrice = PLANS.ELITE.prices?.[interval];
  const proMonthlyTotal = (PLANS.PRO.prices?.monthly.amount ?? 0) * 12;
  const proYearlyPrice = PLANS.PRO.prices?.yearly.amount ?? 0;
  const proYearlySavings = proMonthlyTotal - proYearlyPrice;
  const eliteMonthlyTotal = (PLANS.ELITE.prices?.monthly.amount ?? 0) * 12;
  const eliteYearlyPrice = PLANS.ELITE.prices?.yearly.amount ?? 0;
  const eliteYearlySavings = eliteMonthlyTotal - eliteYearlyPrice;

  async function handleSubscribe(plan: "PRO" | "ELITE") {
    setLoadingPlan(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({ plan, interval }),
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
            Pricing
          </h1>
          <p className="mt-4 text-sm md:text-base text-[#A1A1AA] max-w-2xl mx-auto">
            Simple plans for strategy monitoring, verification, and governance.
          </p>
          <p className="mt-3 text-sm text-[#71717A] max-w-2xl mx-auto">
            AlgoStudio monitors whether your trading strategy still has an edge — and governs what
            happens when it doesn&apos;t.
          </p>
        </div>

        {/* ════════════════════════════════════════════════════════════
            BILLING TOGGLE
            ════════════════════════════════════════════════════════════ */}
        <div className="flex justify-center mb-10">
          <div className="flex rounded-lg bg-[#111114] border border-[rgba(255,255,255,0.06)] p-1">
            <button
              onClick={() => setBillingInterval("monthly")}
              className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${
                interval === "monthly"
                  ? "bg-[#6366F1] text-white"
                  : "text-[#A1A1AA] hover:text-[#FAFAFA]"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval("yearly")}
              className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${
                interval === "yearly"
                  ? "bg-[#6366F1] text-white"
                  : "text-[#A1A1AA] hover:text-[#FAFAFA]"
              }`}
            >
              Yearly
              <span className="ml-1.5 text-[10px] font-bold text-white bg-[#10B981] px-1.5 py-0.5 rounded-full">
                Save 15%
              </span>
            </button>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════
            2. PLAN CARDS
            ════════════════════════════════════════════════════════════ */}
        <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto mb-4">
          {/* Baseline — Free */}
          <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-6 flex flex-col">
            <h3 className="text-lg font-semibold text-[#FAFAFA]">Baseline</h3>
            <p className="text-xs text-[#71717A] mt-1">
              Evaluate strategy viability before going live.
            </p>
            <div className="mt-4">
              <span className="text-3xl font-bold text-[#FAFAFA]">{formatPrice(0, "eur")}</span>
              <span className="text-[#71717A] ml-2 text-sm">/ forever</span>
            </div>

            <ul className="mt-6 space-y-2.5 flex-1">
              {[
                "Backtest health scoring",
                "Monte Carlo risk simulation",
                "Strategy journal",
                "1 active strategy",
                "EA builder & templates",
                "3 MQL5 exports / month",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-[#A1A1AA]">
                  <CheckIcon />
                  {f}
                </li>
              ))}
            </ul>

            <Link
              href="/register"
              className="mt-6 w-full py-3 rounded-lg font-medium border border-[rgba(255,255,255,0.10)] text-[#FAFAFA] hover:border-[rgba(255,255,255,0.20)] transition-colors block text-center text-sm"
            >
              Start monitoring
            </Link>
            <p className="mt-2 text-center text-xs text-[#71717A]">No credit card required.</p>
          </div>

          {/* Control — Pro */}
          <div className="rounded-xl border border-[#6366F1] bg-[#111114] p-6 relative flex flex-col">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-[#6366F1] text-white text-[11px] font-semibold px-3 py-1 rounded-full">
                Recommended
              </span>
            </div>
            <h3 className="text-lg font-semibold text-[#FAFAFA]">Control</h3>
            <p className="text-xs text-[#71717A] mt-1">
              Deterministic lifecycle authority over live strategies.
            </p>
            <div className="mt-4">
              {proPrice ? (
                <>
                  <span className="text-3xl font-bold text-[#FAFAFA]">
                    {formatPrice(proPrice.amount, "eur")}
                  </span>
                  <span className="text-[#71717A] ml-2 text-sm">
                    / {interval === "monthly" ? "month" : "year"}
                  </span>
                  {interval === "yearly" && (
                    <>
                      <div className="mt-2 inline-flex items-center gap-2 bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.20)] rounded-full px-3 py-1">
                        <span className="text-xs text-[#71717A] line-through">
                          {formatPrice(proMonthlyTotal, "eur")}
                        </span>
                        <span className="text-xs text-[#10B981] font-semibold">
                          Save {formatPrice(proYearlySavings, "eur")}
                        </span>
                      </div>
                      <p className="text-xs text-[#71717A] mt-1">
                        = {formatPrice(Math.round(proYearlyPrice / 12), "eur")}/month, billed
                        annually
                      </p>
                    </>
                  )}
                </>
              ) : (
                <span className="text-2xl font-bold text-[#71717A]">Coming soon</span>
              )}
            </div>

            <ul className="mt-6 space-y-2.5 flex-1">
              {[
                "Execution Authority (RUN / PAUSE)",
                "Continuous heartbeat monitoring",
                "Structural deviation detection",
                "Verified Track Record (hash chain)",
                "Strategy Identity & versioning",
                "Governance snapshot logging",
                "Email, webhook & Telegram alerts",
                "Unlimited strategies & exports",
                "Priority support",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-[#A1A1AA]">
                  <CheckIcon />
                  {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSubscribe("PRO")}
              disabled={loadingPlan !== null || !proPrice}
              className="mt-6 w-full py-3 rounded-lg font-medium bg-[#6366F1] text-white hover:bg-[#818CF8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {loadingPlan === "PRO" ? "Loading..." : "Start monitoring"}
            </button>
            <p className="mt-2 text-center text-xs text-[#71717A]">Cancel anytime.</p>
          </div>

          {/* Authority — Elite */}
          <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-6 flex flex-col">
            <h3 className="text-lg font-semibold text-[#FAFAFA]">Authority</h3>
            <p className="text-xs text-[#71717A] mt-1">
              Portfolio-level deterministic governance framework.
            </p>
            <div className="mt-4">
              {elitePrice ? (
                <>
                  <span className="text-3xl font-bold text-[#FAFAFA]">
                    {formatPrice(elitePrice.amount, "eur")}
                  </span>
                  <span className="text-[#71717A] ml-2 text-sm">
                    / {interval === "monthly" ? "month" : "year"}
                  </span>
                  {interval === "yearly" && (
                    <>
                      <div className="mt-2 inline-flex items-center gap-2 bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.20)] rounded-full px-3 py-1">
                        <span className="text-xs text-[#71717A] line-through">
                          {formatPrice(eliteMonthlyTotal, "eur")}
                        </span>
                        <span className="text-xs text-[#10B981] font-semibold">
                          Save {formatPrice(eliteYearlySavings, "eur")}
                        </span>
                      </div>
                      <p className="text-xs text-[#71717A] mt-1">
                        = {formatPrice(Math.round(eliteYearlyPrice / 12), "eur")}/month, billed
                        annually
                      </p>
                    </>
                  )}
                </>
              ) : (
                <span className="text-2xl font-bold text-[#71717A]">Coming soon</span>
              )}
            </div>

            <ul className="mt-6 space-y-2.5 flex-1">
              {[
                "Everything in Control",
                "Full lifecycle authority (RUN / PAUSE / STOP)",
                "Incident escalation framework",
                "CUSUM drift analysis",
                "Edge degradation detection",
                "Portfolio authority aggregation",
                "Embeddable proof widget",
                "1-on-1 strategy review (1/month)",
                "Direct developer channel",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-[#A1A1AA]">
                  <CheckIcon />
                  {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSubscribe("ELITE")}
              disabled={loadingPlan !== null || !elitePrice}
              className="mt-6 w-full py-3 rounded-lg font-medium border border-[rgba(255,255,255,0.10)] text-[#FAFAFA] hover:border-[rgba(255,255,255,0.20)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {loadingPlan === "ELITE" ? "Loading..." : "Start monitoring"}
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
        <div className="max-w-5xl mx-auto mb-16">
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
                </tr>
              </thead>
              <tbody>
                {COMPARISON_MATRIX.map((section) => (
                  <>
                    <tr key={`cat-${section.category}`}>
                      <td
                        className="py-2 px-4 text-[11px] font-semibold text-[#71717A] uppercase tracking-wider pt-5"
                        colSpan={4}
                      >
                        {section.category}
                      </td>
                    </tr>
                    {section.rows.map(([label, free, pro, elite]) => (
                      <tr
                        key={label as string}
                        className="border-b border-[rgba(255,255,255,0.04)]"
                      >
                        <td className="py-2.5 px-4 text-[#A1A1AA] text-[13px]">{label}</td>
                        {[free, pro, elite].map((val, i) => (
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
