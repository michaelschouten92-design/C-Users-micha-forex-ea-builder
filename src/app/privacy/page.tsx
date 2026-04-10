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
              agreement (DPA) compliant with GDPR Article 28:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>
                <strong>Stripe</strong> — payment processing. Stores your payment method, billing
                address, and Stripe customer ID. Stripe is the sole processor of your card details;
                we never see or store them.
              </li>
              <li>
                <strong>Resend</strong> — transactional emails (account verification, password
                reset, subscription receipts, alerts).
              </li>
              <li>
                <strong>Neon (PostgreSQL)</strong> — primary database hosting. All user data
                (accounts, projects, strategies, trade records) is stored here, encrypted at rest.
              </li>
              <li>
                <strong>Vercel</strong> — application hosting and CDN. Receives request metadata
                (URL, IP, user agent) for routing and rate limiting.
              </li>
              <li>
                <strong>Sentry</strong> — error monitoring (see section 5 for legal basis and data
                minimization).
              </li>
              <li>
                <strong>Cloudflare Turnstile</strong> — CAPTCHA on registration and login. Receives
                IP and browser fingerprint purely for bot detection; no persistent tracking.
              </li>
              <li>
                <strong>OpenAI</strong> — AI strategy analysis, only when you explicitly trigger it
                (see section 4).
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
            <p className="mt-2">
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
            <h2 className="text-xl font-semibold text-[#FAFAFA] mb-3">6. Data Security</h2>
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
            <h2 className="text-xl font-semibold text-[#FAFAFA] mb-3">7. Data Retention</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Account data is retained as long as your account is active</li>
              <li>Deleted projects are permanently removed after 30 days</li>
              <li>Expired password reset tokens are automatically cleaned up</li>
              <li>Webhook events are deleted after 90 days</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#FAFAFA] mb-3">8. Your Rights (GDPR)</h2>
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
            <h2 className="text-xl font-semibold text-[#FAFAFA] mb-3">9. Cookies</h2>
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
            <h2 className="text-xl font-semibold text-[#FAFAFA] mb-3">10. Contact</h2>
            <p>
              For questions about your privacy or to exercise your rights, contact us via the email
              address in your account settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#FAFAFA] mb-3">11. Changes</h2>
            <p>
              We may update this privacy policy from time to time. Changes will be published on this
              page with an updated date.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-[rgba(255,255,255,0.06)] text-sm text-[#71717A]">
          <Link href="/terms" className="hover:text-[#A1A1AA]">
            Terms of Service
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}
