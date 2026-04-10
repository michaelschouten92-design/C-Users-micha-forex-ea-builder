import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "Imprint - Algo Studio",
  description:
    "Legal imprint for Algo Studio. Company details, registration information, and responsible contact under Dutch and EU law.",
  alternates: { canonical: "/imprint" },
  robots: {
    index: true,
    follow: false,
  },
};

export default function ImprintPage() {
  const lastUpdated = "2026-04-10";

  return (
    <div id="main-content" className="min-h-screen flex flex-col bg-[#09090B] text-[#A1A1AA]">
      <SiteNav />
      <div className="max-w-3xl mx-auto px-6 pt-32 pb-16 flex-1">
        <h1 className="text-3xl font-bold text-[#FAFAFA] mb-2">Imprint</h1>
        <p className="text-sm text-[#71717A] mb-10">Last updated: {lastUpdated}</p>

        <div className="space-y-8 text-[#A1A1AA] leading-relaxed">
          <section>
            <p className="mb-4">
              This imprint is provided in accordance with Dutch and EU legal requirements for online
              service providers (Article 3:15d of the Dutch Civil Code and the EU E-Commerce
              Directive).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#FAFAFA] mb-3">Legal Entity</h2>
            <dl className="space-y-2">
              <div className="grid grid-cols-[180px,1fr] gap-4">
                <dt className="text-[#71717A]">Business name</dt>
                <dd className="text-[#FAFAFA]">Algo Studio</dd>
              </div>
              <div className="grid grid-cols-[180px,1fr] gap-4">
                <dt className="text-[#71717A]">Legal form</dt>
                <dd className="text-[#FAFAFA]">Eenmanszaak (sole proprietorship)</dd>
              </div>
              <div className="grid grid-cols-[180px,1fr] gap-4">
                <dt className="text-[#71717A]">Owner</dt>
                <dd className="text-[#FAFAFA]">Michael Schouten</dd>
              </div>
            </dl>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#FAFAFA] mb-3">Registered Address</h2>
            <address className="not-italic">
              <p className="text-[#FAFAFA]">Algo Studio</p>
              <p>Snippenhoek 6</p>
              <p>2317 WX Leiden</p>
              <p>Netherlands</p>
            </address>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#FAFAFA] mb-3">Registration</h2>
            <dl className="space-y-2">
              <div className="grid grid-cols-[180px,1fr] gap-4">
                <dt className="text-[#71717A]">KvK number</dt>
                <dd className="text-[#FAFAFA] font-mono">96041420</dd>
              </div>
              <div className="grid grid-cols-[180px,1fr] gap-4">
                <dt className="text-[#71717A]">VAT / BTW</dt>
                <dd className="text-[#FAFAFA] font-mono">NL209735922B02</dd>
              </div>
              <div className="grid grid-cols-[180px,1fr] gap-4">
                <dt className="text-[#71717A]">Chamber of Commerce</dt>
                <dd>
                  <a
                    href="https://www.kvk.nl/handelsregister/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#818CF8] hover:text-[#FAFAFA] transition-colors underline"
                  >
                    Kamer van Koophandel (KvK)
                  </a>
                </dd>
              </div>
            </dl>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#FAFAFA] mb-3">Contact</h2>
            <dl className="space-y-2">
              <div className="grid grid-cols-[180px,1fr] gap-4">
                <dt className="text-[#71717A]">Email</dt>
                <dd>
                  <a
                    href="mailto:support@algo-studio.com"
                    className="text-[#818CF8] hover:text-[#FAFAFA] transition-colors"
                  >
                    support@algo-studio.com
                  </a>
                </dd>
              </div>
              <div className="grid grid-cols-[180px,1fr] gap-4">
                <dt className="text-[#71717A]">Response time</dt>
                <dd className="text-[#FAFAFA]">Within 24 hours on business days</dd>
              </div>
            </dl>
            <p className="mt-4 text-sm text-[#71717A]">
              Algo Studio operates as an online service and provides customer support via email.
              Support inquiries, legal notices, and GDPR data requests should be sent to the email
              address above.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#FAFAFA] mb-3">
              Responsible for Content (V.i.S.d.P.)
            </h2>
            <p>
              Michael Schouten
              <br />
              Snippenhoek 6
              <br />
              2317 WX Leiden, Netherlands
            </p>
            <p className="mt-4 text-sm text-[#71717A]">
              Responsible for the content of this website in accordance with applicable Dutch and EU
              media law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#FAFAFA] mb-3">
              Jurisdiction & Governing Law
            </h2>
            <p>
              This website is operated from the Netherlands. Any disputes arising from the use of
              this website or Algo Studio&apos;s services are subject to Dutch law and the exclusive
              jurisdiction of the courts of the Netherlands, except where mandatory consumer
              protection law provides otherwise.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#FAFAFA] mb-3">
              EU Online Dispute Resolution
            </h2>
            <p>
              The European Commission provides a platform for online dispute resolution (ODR),
              available at{" "}
              <a
                href="https://ec.europa.eu/consumers/odr/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#818CF8] hover:text-[#FAFAFA] transition-colors underline"
              >
                ec.europa.eu/consumers/odr
              </a>
              . We are not obligated and not willing to participate in dispute resolution
              proceedings before a consumer arbitration board.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#FAFAFA] mb-3">Liability Disclaimer</h2>
            <p className="mb-3">
              The content of this website is provided for informational purposes only. While we
              strive to keep information accurate and up to date, we make no representations or
              warranties of any kind, express or implied, about the completeness, accuracy,
              reliability, or suitability of any information on this website.
            </p>
            <p>
              Algo Studio provides monitoring infrastructure for algorithmic trading strategies. We
              do not provide financial advice, investment recommendations, or trading signals. Any
              trading decisions made based on information from this website are the sole
              responsibility of the user. Trading financial instruments carries substantial risk of
              loss. Past performance does not guarantee future results.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#FAFAFA] mb-3">Related Documents</h2>
            <ul className="space-y-2 list-disc pl-6">
              <li>
                <Link
                  href="/privacy"
                  className="text-[#818CF8] hover:text-[#FAFAFA] transition-colors underline"
                >
                  Privacy Policy
                </Link>{" "}
                — how we handle your personal data (GDPR)
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-[#818CF8] hover:text-[#FAFAFA] transition-colors underline"
                >
                  Terms of Service
                </Link>{" "}
                — terms governing the use of Algo Studio
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-[#818CF8] hover:text-[#FAFAFA] transition-colors underline"
                >
                  Contact
                </Link>{" "}
                — general contact form
              </li>
            </ul>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}
