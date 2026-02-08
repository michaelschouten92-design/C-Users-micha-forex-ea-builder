import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy - AlgoStudio",
  description: "AlgoStudio privacy policy - how we handle your data.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPolicyPage() {
  const lastUpdated = "2025-02-07";

  return (
    <div id="main-content" className="min-h-screen text-[#CBD5E1]">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="text-[#4F46E5] hover:text-[#6366F1] text-sm mb-8 inline-block">
          &larr; Back to home
        </Link>

        <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-sm text-[#64748B] mb-10">Last updated: {lastUpdated}</p>

        <div className="space-y-8 text-[#94A3B8] leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. What Data We Collect</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Account data:</strong> email address and (hashed) passwords when registering
                via email, or profile information from your OAuth provider (Google, GitHub).
              </li>
              <li>
                <strong>Project data:</strong> strategy names, descriptions, and builder
                configurations that you create.
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
            <h2 className="text-xl font-semibold text-white mb-3">2. How We Use Your Data</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>To create and manage your account</li>
              <li>To save and export your strategy projects</li>
              <li>To process payments and subscriptions via Stripe</li>
              <li>To send password reset emails via Resend</li>
              <li>To monitor the security and stability of the platform</li>
              <li>To detect and resolve errors (via Sentry)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              3. Sharing Data with Third Parties
            </h2>
            <p>We only share your data with the following processors:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>
                <strong>Stripe</strong> - payment processing
              </li>
              <li>
                <strong>Resend</strong> - transactional emails
              </li>
              <li>
                <strong>Sentry</strong> - error reporting (no personal data)
              </li>
              <li>
                <strong>Neon/PostgreSQL</strong> - database hosting
              </li>
              <li>
                <strong>Vercel</strong> - application hosting
              </li>
            </ul>
            <p className="mt-2">We never sell your data to third parties.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Data Security</h2>
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
            <h2 className="text-xl font-semibold text-white mb-3">5. Data Retention</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Account data is retained as long as your account is active</li>
              <li>Deleted projects are permanently removed after 30 days</li>
              <li>Expired password reset tokens are automatically cleaned up</li>
              <li>Webhook events are deleted after 90 days</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Your Rights (GDPR)</h2>
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
            <h2 className="text-xl font-semibold text-white mb-3">7. Cookies</h2>
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
            <h2 className="text-xl font-semibold text-white mb-3">8. Contact</h2>
            <p>
              For questions about your privacy or to exercise your rights, contact us via the email
              address in your account settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Changes</h2>
            <p>
              We may update this privacy policy from time to time. Changes will be published on this
              page with an updated date.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 text-sm text-[#64748B]">
          <Link href="/terms" className="hover:text-[#94A3B8]">
            Terms of Service
          </Link>
        </div>
      </div>
    </div>
  );
}
