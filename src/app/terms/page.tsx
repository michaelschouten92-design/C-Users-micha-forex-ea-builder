import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "Terms of Service - Algo Studio",
  description:
    "Read Algo Studio's terms of service. Understand our policies on subscriptions, accounts, intellectual property, and trading risk disclaimers.",
  alternates: { canonical: "/terms" },
};

export default function TermsOfServicePage() {
  const lastUpdated = "2026-04-10";

  return (
    <div id="main-content" className="min-h-screen flex flex-col bg-[#09090B] text-[#A1A1AA]">
      <SiteNav />
      <div className="max-w-3xl mx-auto px-6 pt-32 pb-16 flex-1">
        <h1 className="text-3xl font-bold text-[#FAFAFA] mb-2">Terms of Service</h1>
        <p className="text-sm text-[#71717A] mb-10">Last updated: {lastUpdated}</p>

        <div className="space-y-8 text-[#A1A1AA] leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-[#FAFAFA] mb-3">1. Acceptance of Terms</h2>
            <p>
              By using Algo Studio, you agree to these terms of service. If you do not agree, please
              do not use the platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#FAFAFA] mb-3">2. Description of Service</h2>
            <p>
              Algo Studio is a strategy monitoring and governance platform for algorithmic traders.
              The platform offers:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Performance monitoring and health scoring for trading strategies</li>
              <li>Verification and tamper-evident track records</li>
              <li>Strategy governance with lifecycle management</li>
              <li>Multiple subscription tiers (Free, Pro, Elite)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#FAFAFA] mb-3">
              3. Accounts and Registration
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>You are responsible for keeping your login credentials confidential</li>
              <li>You must provide a valid email address</li>
              <li>You may only create one account per person</li>
              <li>We reserve the right to restrict or delete accounts in case of abuse</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#FAFAFA] mb-3">
              4. Subscriptions and Payments
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Paid subscriptions are billed monthly or annually via Stripe</li>
              <li>You can cancel your subscription at any time through the Stripe portal</li>
              <li>Upon cancellation, you retain access until the end of the paid period</li>
              <li>We do not offer refunds for partial periods</li>
              <li>Price changes will be announced at least 30 days in advance</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#FAFAFA] mb-3">5. Intellectual Property</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>You retain full ownership of the strategies you monitor</li>
              <li>Verification data and reports generated for your strategies are yours</li>
              <li>The Algo Studio platform, logo, and interface are our property</li>
              <li>You may not reverse-engineer or copy the platform</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#FAFAFA] mb-3">
              6. Disclaimer - Trading Risk
            </h2>
            <p className="font-semibold text-amber-400">
              IMPORTANT: Trading in the financial markets involves significant risks.
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Algo Studio is a monitoring and governance tool, not financial advice</li>
              <li>We do not guarantee that monitored strategies will be profitable</li>
              <li>You are fully responsible for your trading decisions and live accounts</li>
              <li>Always test strategies on a demo account first</li>
              <li>We are not liable for financial losses resulting from trading decisions</li>
              <li>Past performance does not guarantee future results</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#FAFAFA] mb-3">7. Availability</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>We aim for 99.9% uptime but do not guarantee it</li>
              <li>The platform may be temporarily unavailable for maintenance</li>
              <li>We are not liable for damages caused by downtime</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#FAFAFA] mb-3">8. Acceptable Use</h2>
            <p>You may not use the platform to:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Overload the service (e.g., automated bulk exports)</li>
              <li>Circumvent security measures</li>
              <li>Support illegal activities</li>
              <li>Disrupt the service for other users</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#FAFAFA] mb-3">
              9. Limitation of Liability
            </h2>
            <p>
              Algo Studio is provided &quot;as is&quot;. To the fullest extent permitted by law, we
              are not liable for indirect damages, consequential damages, or lost profits resulting
              from the use of the platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#FAFAFA] mb-3">10. Referral Program</h2>
            <p className="mb-3">
              Algo Studio operates an optional referral program that allows eligible users
              (&quot;Partners&quot;) to earn commissions by referring new paying customers. The
              following terms govern participation in this program and supplement the rest of these
              Terms of Service.
            </p>

            <h3 className="text-base font-semibold text-[#FAFAFA] mt-4 mb-2">
              10.1 Eligibility and Registration
            </h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                The program is available via two tracks: (a) invitation by Algo Studio with a custom
                commission rate, or (b) self-registration by users with an active Pro, Elite, or
                Institutional subscription.
              </li>
              <li>
                Self-registered partners are automatically approved upon registration and receive
                the default commission rate.
              </li>
              <li>Free-tier users are not eligible for the referral program.</li>
              <li>
                Partners must provide accurate payout details, including a valid IBAN and the
                corresponding account holder name, in their account settings.
              </li>
            </ul>

            <h3 className="text-base font-semibold text-[#FAFAFA] mt-4 mb-2">
              10.2 Attribution and Tracking
            </h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Referrals are tracked via a first-party cookie set when a prospective customer
                visits Algo Studio through a Partner&apos;s unique referral link.
              </li>
              <li>
                The attribution window is <strong>60 days</strong> from the first click. If the
                referred visitor signs up and purchases a subscription within this window, the
                referral is credited to the Partner.
              </li>
              <li>
                If multiple Partners refer the same user, the <strong>last click</strong> before
                purchase wins attribution.
              </li>
              <li>
                Self-referrals (creating an account via one&apos;s own referral link) are not
                eligible for commission and constitute grounds for termination under section 10.6.
              </li>
            </ul>

            <h3 className="text-base font-semibold text-[#FAFAFA] mt-4 mb-2">
              10.3 Commissions and Payouts
            </h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Commissions are calculated as a percentage of the net subscription revenue (after
                taxes and Stripe processing fees) paid by successfully referred customers.
              </li>
              <li>
                The default commission rate is 20% unless a different rate is specified in your
                Partner profile (as set by Algo Studio for invited partners).
              </li>
              <li>
                Commissions accrue on each successful payment. They become payable after the
                reversal window described in section 10.4.
              </li>
              <li>
                <strong>Minimum payout threshold:</strong> €50. Commission balances below this
                threshold roll over to the next payout cycle.
              </li>
              <li>
                <strong>Payout frequency:</strong> quarterly, on or around the 1st of January,
                April, July, and October, for the previous quarter&apos;s eligible commissions.
              </li>
              <li>
                <strong>Payout method:</strong> SEPA bank transfer only. Partners outside the SEPA
                zone may not be able to receive payouts at this time.
              </li>
              <li>
                Algo Studio is not responsible for errors resulting from incorrect payout
                information provided by the Partner. Failed transfers due to invalid IBAN or account
                holder mismatch will be rolled over to the next cycle after the Partner corrects the
                information.
              </li>
            </ul>

            <h3 className="text-base font-semibold text-[#FAFAFA] mt-4 mb-2">
              10.4 Commission Reversals
            </h3>
            <p className="mb-2">
              Commissions may be reversed (debited from the Partner&apos;s balance) in the following
              circumstances:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Full refund within 60 days of purchase:</strong> if a referred customer
                receives a full refund within 60 days of their purchase, the corresponding
                commission is automatically reversed.
              </li>
              <li>
                <strong>Chargebacks:</strong> if a payment is lost in a dispute (chargeback),
                regardless of timing, the corresponding commission is reversed.
              </li>
              <li>
                <strong>Partial refunds</strong> (e.g., goodwill credits) do <strong>not</strong>{" "}
                trigger commission reversal.
              </li>
              <li>
                If a reversal results in a negative Partner balance, it will be offset against
                future commissions.
              </li>
            </ul>

            <h3 className="text-base font-semibold text-[#FAFAFA] mt-4 mb-2">
              10.5 Tax Responsibility
            </h3>
            <p>
              Partners are solely responsible for declaring and paying any taxes (income tax,
              VAT/BTW, self-employment tax, etc.) due on commissions received, in accordance with
              the laws of their country of residence. Algo Studio does not withhold taxes on payouts
              and does not provide tax advice. VAT-registered Partners in the EU should provide
              their VAT number and may be required to issue an invoice for commissions.
            </p>

            <h3 className="text-base font-semibold text-[#FAFAFA] mt-4 mb-2">
              10.6 Termination Grounds
            </h3>
            <p className="mb-2">
              Algo Studio may suspend or terminate a Partner&apos;s participation in the referral
              program, and withhold outstanding commissions, in the following cases:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Fraud and self-dealing:</strong> creating accounts for the purpose of
                self-referral, using fake identities, colluding with users to generate commissions,
                or any attempt to manipulate the referral system.
              </li>
              <li>
                <strong>Misleading marketing:</strong> making claims about Algo Studio that are
                false, misleading, or guarantee specific financial outcomes. This includes but is
                not limited to guaranteeing returns, claiming endorsement from financial regulators,
                or misrepresenting the product&apos;s capabilities.
              </li>
              <li>
                <strong>Spam and unsolicited marketing:</strong> distributing referral links via
                unsolicited email (spam), unauthorized forum posting, comment spam, or any marketing
                channel that violates CAN-SPAM, GDPR, or equivalent laws. Partners are responsible
                for compliance with all applicable advertising laws in their jurisdiction.
              </li>
              <li>
                <strong>Brand misuse:</strong> Partners may use the Algo Studio name and logo for
                promotion but must not (a) use them in ways that imply official partnership beyond
                the referral relationship, (b) register domains containing &quot;algo-studio&quot;
                or typo-squat variants, or (c) run paid ads on branded keywords (e.g., &quot;Algo
                Studio&quot; on Google Ads) without written permission.
              </li>
              <li>
                <strong>Illegal content and platforms:</strong> promoting Algo Studio via platforms
                that distribute illegal content, facilitate illegal activities, or are on
                international sanctions lists.
              </li>
              <li>
                <strong>Program changes or discontinuation:</strong> Algo Studio reserves the right
                to modify, pause, or terminate the referral program at any time. Partners will
                receive at least 30 days&apos; notice for material changes affecting future
                commissions. Previously earned commissions past the 60-day reversal window remain
                payable.
              </li>
              <li>
                <strong>Termination process:</strong> in the case of a suspected violation, Algo
                Studio may suspend the partnership pending investigation. If violations are
                confirmed, the partnership will be terminated and outstanding commissions may be
                withheld. Partners will be notified via their registered email address.
              </li>
            </ul>

            <h3 className="text-base font-semibold text-[#FAFAFA] mt-4 mb-2">
              10.7 No Employment Relationship
            </h3>
            <p>
              Participation in the referral program does not create an employment, agency, joint
              venture, or partnership relationship between the Partner and Algo Studio. Partners act
              as independent contractors and are not authorized to make representations or
              commitments on behalf of Algo Studio.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#FAFAFA] mb-3">11. Changes</h2>
            <p>
              We may modify these terms. In the event of substantial changes, we will notify you by
              email. Continued use after a change constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#FAFAFA] mb-3">12. Governing Law</h2>
            <p>
              These terms are governed by the laws of the Netherlands. Disputes shall be submitted
              to the competent court in the Netherlands. For legal entity details, see our{" "}
              <Link href="/imprint" className="text-[#818CF8] hover:text-[#FAFAFA] underline">
                imprint
              </Link>
              .
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-[rgba(255,255,255,0.06)] text-sm text-[#71717A] flex gap-4 flex-wrap">
          <Link href="/privacy" className="hover:text-[#A1A1AA]">
            Privacy Policy
          </Link>
          <span>·</span>
          <Link href="/imprint" className="hover:text-[#A1A1AA]">
            Imprint
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}
