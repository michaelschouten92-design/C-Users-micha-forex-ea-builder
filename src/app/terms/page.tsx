import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "Terms of Service - AlgoStudio",
  description:
    "Read AlgoStudio's terms of service. Understand our policies on subscriptions, accounts, intellectual property, and trading risk disclaimers.",
  alternates: { canonical: "/terms" },
};

export default function TermsOfServicePage() {
  const lastUpdated = "2026-02-14";

  return (
    <div id="main-content" className="min-h-screen flex flex-col text-[#CBD5E1]">
      <SiteNav />
      <div className="max-w-3xl mx-auto px-6 pt-32 pb-16 flex-1">
        <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
        <p className="text-sm text-[#64748B] mb-10">Last updated: {lastUpdated}</p>

        <div className="space-y-8 text-[#94A3B8] leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Acceptance of Terms</h2>
            <p>
              By using AlgoStudio, you agree to these terms of service. If you do not agree, please
              do not use the platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Description of Service</h2>
            <p>
              AlgoStudio is a visual no-code builder that allows you to design Expert Advisors (EAs)
              for MetaTrader 5. The platform offers:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>A visual interface for building trading strategies</li>
              <li>Export of strategies to MQL5 code</li>
              <li>Version control for strategy designs</li>
              <li>Multiple subscription tiers (Free, Pro, Elite)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Accounts and Registration</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>You are responsible for keeping your login credentials confidential</li>
              <li>You must provide a valid email address</li>
              <li>You may only create one account per person</li>
              <li>We reserve the right to restrict or delete accounts in case of abuse</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Subscriptions and Payments</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Paid subscriptions are billed monthly or annually via Stripe</li>
              <li>You can cancel your subscription at any time through the Stripe portal</li>
              <li>Upon cancellation, you retain access until the end of the paid period</li>
              <li>We do not offer refunds for partial periods</li>
              <li>Price changes will be announced at least 30 days in advance</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Intellectual Property</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>You retain full ownership of the strategies you create</li>
              <li>The exported MQL5 code is yours and you may use it freely</li>
              <li>The AlgoStudio platform, logo, and interface are our property</li>
              <li>You may not reverse-engineer or copy the platform</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Disclaimer - Trading Risk</h2>
            <p className="font-semibold text-amber-400">
              IMPORTANT: Trading in the financial markets involves significant risks.
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>AlgoStudio is a tool for designing trading strategies, not financial advice</li>
              <li>We do not guarantee that generated EAs will be profitable</li>
              <li>
                You are fully responsible for testing and deploying strategies on live accounts
              </li>
              <li>Always test strategies on a demo account first</li>
              <li>We are not liable for financial losses resulting from the use of exported EAs</li>
              <li>Past performance does not guarantee future results</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Availability</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>We aim for 99.9% uptime but do not guarantee it</li>
              <li>The platform may be temporarily unavailable for maintenance</li>
              <li>We are not liable for damages caused by downtime</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Acceptable Use</h2>
            <p>You may not use the platform to:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Overload the service (e.g., automated bulk exports)</li>
              <li>Circumvent security measures</li>
              <li>Support illegal activities</li>
              <li>Disrupt the service for other users</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Limitation of Liability</h2>
            <p>
              AlgoStudio is provided &quot;as is&quot;. To the fullest extent permitted by law, we
              are not liable for indirect damages, consequential damages, or lost profits resulting
              from the use of the platform or exported code.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">10. Changes</h2>
            <p>
              We may modify these terms. In the event of substantial changes, we will notify you by
              email. Continued use after a change constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">11. Governing Law</h2>
            <p>
              These terms are governed by the laws of the Netherlands. Disputes shall be submitted
              to the competent court in the Netherlands.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 text-sm text-[#64748B]">
          <Link href="/privacy" className="hover:text-[#94A3B8]">
            Privacy Policy
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}
