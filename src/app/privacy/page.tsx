import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "Privacy Policy - Algo Studio",
  description:
    "Algo Studio privacy policy. Learn how we protect your data, handle payments securely, use cookies, and comply with GDPR regulations.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPolicyPage() {
  const lastUpdated = "2026-04-10";

  return (
    <div id="main-content" className="min-h-screen flex flex-col bg-[#09090B] text-[#A1A1AA]">
      <SiteNav />
      <div className="max-w-3xl mx-auto px-6 pt-32 pb-16 flex-1">
        <h1 className="text-3xl font-bold text-[#FAFAFA] mb-2">Privacy Policy</h1>
        <p className="text-sm text-[#71717A] mb-10">Last updated: {lastUpdated}</p>

        <div className="space-y-8 text-[#A1A1AA] leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-[#FAFAFA] mb-3">1. What Data We Collect</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Account data:</strong> email address and (hashed) passwords when registering
                via email, or profile information from your OAuth provider (Google, GitHub).
              </li>
              <li>
                <strong>Project data:</strong> strategy names, descriptions, and configurations that
                you create.
              </li>
              <li>
                <strong>Payment data:</strong> processed by Stripe. We do not store credit card
                numbers. We only retain your Stripe customer ID and subscription status.
              </li>
              <li>
                <strong>Usage data:</strong> audit logs of actions (login, export, project changes)
                with anonymized IP addresses for security purposes.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#FAFAFA] mb-3">2. How We Use Your Data</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>To create and manage your account</li>
              <li>To save and export your strategy projects</li>
              <li>To process payments and subscriptions via Stripe</li>
              <li>To send password reset emails via Resend</li>
              <li>To monitor the security and stability of the platform</li>
              <li>To detect and resolve errors (via Sentry)</li>
              <li>
                To generate AI-assisted strategy analysis when you explicitly trigger it (via
                OpenAI) — see section 4
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#FAFAFA] mb-3">
              3. Sharing Data with Third Parties
            </h2>
            <p>
              We share your data with the following processors, each under a written data processing
              agreement (DPA) compliant with GDPR Article 28. Region indicates where your data is
              physically stored.
            </p>

            <h3 className="text-base font-semibold text-[#FAFAFA] mt-4 mb-2">
              EU-hosted processors
            </h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Stripe Payments Europe Ltd</strong> — payment processing. Stores your
                payment method, billing address, and Stripe customer ID. Stripe is the sole
                processor of your card details; we never see or store them. Region: Dublin, Ireland
                (EU).
              </li>
              <li>
                <strong>Resend</strong> — transactional emails (account verification, password
                reset, subscription receipts, alerts). Region: Dublin, Ireland (EU, eu-west-1).
              </li>
              <li>
                <strong>Sentry</strong> — error monitoring (see section 5 for legal basis and data
                minimization). Region: Frankfurt, Germany (EU, de.sentry.io).
              </li>
            </ul>

            <h3 className="text-base font-semibold text-[#FAFAFA] mt-4 mb-2">
              US-hosted infrastructure
            </h3>
            <p className="text-sm mb-2">
              The following core infrastructure providers host data in the United States (AWS
              us-east-1, Virginia). Transfers are covered under the EU-US Data Privacy Framework
              (DPF) and Standard Contractual Clauses (SCCs). See section 6 for details.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Neon (PostgreSQL)</strong> — primary database hosting. All user data
                (accounts, projects, strategies, trade records) is stored here, encrypted at rest.
                Region: AWS us-east-1, Virginia.
              </li>
              <li>
                <strong>Vercel</strong> — application hosting and serverless function execution.
                Receives request metadata (URL, IP, user agent) for routing and rate limiting.
                Function region: iad1 (Washington D.C.). CDN/Edge: global.
              </li>
              <li>
                <strong>Upstash Redis</strong> — rate limiting and ephemeral cache storage. Stores
                temporary counters keyed to your user ID. No personal data beyond user identifiers.
                Region: AWS us-east-1, Virginia (with global replication).
              </li>
            </ul>

            <h3 className="text-base font-semibold text-[#FAFAFA] mt-4 mb-2">
              Optional / opt-in processors
            </h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Cloudflare Turnstile</strong> — CAPTCHA on registration and login. Receives
                IP and browser fingerprint purely for bot detection; no persistent tracking. Region:
                Cloudflare global edge network.
              </li>
              <li>
                <strong>OpenAI</strong> — AI strategy analysis, only when you explicitly trigger it
                (see section 4). Region: United States.
              </li>
              <li>
                <strong>Discord</strong> — only if you log in via Discord OAuth or link Discord to
                your account. We receive your Discord user ID and sync your subscription tier to any
                Discord role we manage. You can disconnect Discord at any time from account
                settings.
              </li>
              <li>
                <strong>Telegram</strong> — only if you opt in to Telegram alerts. Your Telegram
                chat ID is stored so we can deliver notifications you requested. Disconnect at any
                time.
              </li>
            </ul>
            <p className="mt-4">
              We never sell your data to third parties. You can request copies of our DPAs by
              emailing support@algo-studio.com.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#FAFAFA] mb-3">
              4. AI Strategy Analysis (OpenAI)
            </h2>
            <p>
              Algo Studio offers an optional &quot;AI Strategy Doctor&quot; feature that analyzes
              your backtest results using OpenAI&apos;s API. This feature is never triggered
              automatically — you must explicitly click &quot;Analyze&quot; on a backtest result.
            </p>
            <p className="mt-2">
              <strong>What we send to OpenAI:</strong>
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-1">
              <li>Strategy metadata: EA name, symbol, timeframe, test period, initial deposit</li>
              <li>
                Performance metrics: profit factor, drawdown, Sharpe ratio, win rate, expectancy,
                and other statistical measures
              </li>
              <li>
                A sample of up to 100 anonymized trades (open/close prices, profit, timestamps)
              </li>
            </ul>
            <p className="mt-2">
              We do <strong>not</strong> send: your email address, account identifier, payment
              information, or any other directly identifying data.
            </p>
            <p className="mt-2">
              <strong>OpenAI&apos;s data handling:</strong> Under OpenAI&apos;s default API data
              usage policy, data submitted via their API is{" "}
              <strong>not used to train their models</strong>. OpenAI retains API inputs for up to
              30 days for abuse monitoring, after which the data is deleted. For full details see{" "}
              <a
                href="https://openai.com/policies/api-data-usage-policies"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-[#FAFAFA]"
              >
                OpenAI&apos;s API Data Usage Policies
              </a>
              .
            </p>
            <p className="mt-2">
              <strong>How to avoid it:</strong> simply do not use the &quot;Analyze with AI&quot;
              button. The rest of Algo Studio works without any data ever being sent to OpenAI.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#FAFAFA] mb-3">
              5. Error Monitoring (Sentry)
            </h2>
            <p>
              We use Sentry to detect and debug errors in production. Sentry is classified as an
              essential infrastructure service — without it we cannot reliably operate the platform
              or respond to incidents affecting your account.
            </p>
            <p className="mt-2">
              <strong>Legal basis:</strong> legitimate interest (GDPR Art. 6(1)(f)) — specifically,
              our interest in maintaining a secure, reliable, and functional service.
            </p>
            <p className="mt-2">
              <strong>Data minimization:</strong> we scrub personally identifying data before
              sending events to Sentry. Specifically, we remove: authentication cookies, API keys,
              authorization headers, request bodies containing credentials, and any fields known to
              contain sensitive information. Session replays (when enabled) mask all input fields
              and text content so they cannot reveal what you typed.
            </p>
            <p className="mt-2">
              Sentry retains error data according to its own retention policy. You can request that
              we exclude your user ID from Sentry events by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#FAFAFA] mb-3">
              6. International Data Transfers
            </h2>
            <p>
              Some of our infrastructure providers (Neon database, Vercel serverless functions, and
              Upstash Redis for rate limiting) host data in the United States, specifically in AWS
              region us-east-1 (Virginia). This constitutes an international transfer of personal
              data under GDPR Chapter V.
            </p>
            <p className="mt-3">
              <strong>Legal basis for the transfer:</strong>
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>
                <strong>EU-US Data Privacy Framework (DPF)</strong> — Amazon Web Services (the
                underlying infrastructure provider for Neon and Upstash) is certified under the DPF,
                which the European Commission has recognized as providing an adequate level of data
                protection for transfers to the United States (Commission Implementing Decision of
                10 July 2023).
              </li>
              <li>
                <strong>Standard Contractual Clauses (SCCs)</strong> — in addition to DPF, we have
                Standard Contractual Clauses in place with Neon, Vercel, and Upstash as a
                complementary safeguard, in accordance with Article 46(2)(c) GDPR.
              </li>
              <li>
                <strong>Supplementary measures</strong> — all data is encrypted in transit (TLS 1.3)
                and at rest (AES-256). Access to production databases is restricted to authenticated
                administrators via the providers&apos; own access control systems.
              </li>
            </ul>
            <p className="mt-3">
              <strong>Why us-east-1?</strong> Co-locating our database (Neon), serverless functions
              (Vercel), and cache (Upstash) in the same region provides the lowest possible
              application latency. We continuously evaluate EU-only hosting alternatives and may
              migrate in the future if the performance trade-offs become favorable.
            </p>
            <p className="mt-3">
              <strong>Your rights regarding transfers:</strong> you can request a copy of the SCCs
              by emailing support@algo-studio.com. If you prefer that your data not be transferred
              outside the EU, you can request deletion of your account under GDPR Art. 17 (see
              section 9).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#FAFAFA] mb-3">7. Data Security</h2>
            <p>We take appropriate technical and organizational measures to protect your data:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Passwords are hashed with bcrypt</li>
              <li>All connections are encrypted via HTTPS/TLS</li>
              <li>Password reset tokens are stored hashed (SHA-256)</li>
              <li>Rate limiting on all API endpoints</li>
              <li>CSRF protection on all state-changing requests</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#FAFAFA] mb-3">8. Data Retention</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Account data is retained as long as your account is active</li>
              <li>Deleted projects are permanently removed after 30 days</li>
              <li>Expired password reset tokens are automatically cleaned up</li>
              <li>Webhook events are deleted after 90 days</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#FAFAFA] mb-3">9. Your Rights (GDPR)</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>
                <strong>Access</strong> your personal data
              </li>
              <li>
                <strong>Download a copy</strong> of your data (data export)
              </li>
              <li>
                <strong>Correct</strong> inaccurate data
              </li>
              <li>
                <strong>Delete</strong> your account and all associated data
              </li>
              <li>
                <strong>Object</strong> to the processing of your data
              </li>
            </ul>
            <p className="mt-2">
              You can export your data and delete your account through your account settings, or by
              contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#FAFAFA] mb-3">10. Cookies</h2>
            <p>We use the following cookies:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>
                <strong>Session cookie</strong> (essential) - for authentication
              </li>
              <li>
                <strong>CSRF token</strong> (essential) - for protection against cross-site request
                forgery
              </li>
              <li>
                <strong>Cookie preference</strong> (essential) - to remember your cookie choice
              </li>
            </ul>
            <p className="mt-2">We do not use tracking or advertising cookies.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#FAFAFA] mb-3">11. Contact</h2>
            <p>
              For questions about your privacy or to exercise your rights, email{" "}
              <a
                href="mailto:support@algo-studio.com"
                className="text-[#818CF8] hover:text-[#FAFAFA] underline"
              >
                support@algo-studio.com
              </a>
              . For legal entity details, see our{" "}
              <Link href="/imprint" className="text-[#818CF8] hover:text-[#FAFAFA] underline">
                imprint
              </Link>
              . We respond within 24 hours on business days.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#FAFAFA] mb-3">12. Changes</h2>
            <p>
              We may update this privacy policy from time to time. Changes will be published on this
              page with an updated date.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-[rgba(255,255,255,0.06)] text-sm text-[#71717A] flex gap-4 flex-wrap">
          <Link href="/terms" className="hover:text-[#A1A1AA]">
            Terms of Service
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
