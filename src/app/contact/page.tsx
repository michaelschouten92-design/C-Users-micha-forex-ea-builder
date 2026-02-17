import type { Metadata } from "next";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with AlgoStudio. Contact us for support, questions, or feedback about our no-code EA builder.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div id="main-content" className="min-h-screen flex flex-col">
      <SiteNav />
      <div className="max-w-2xl mx-auto pt-32 pb-16 px-4 flex-1">
        <h1 className="text-4xl font-bold text-white mb-4">Contact</h1>
        <p className="text-[#94A3B8] mb-10">
          Have a question, found a bug, or need help? We&apos;re here to help.
        </p>

        <div className="space-y-6">
          {/* Contact Form */}
          <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Send us a message</h2>
            <ContactForm />
          </div>

          {/* Email */}
          <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-[rgba(79,70,229,0.15)] rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-[#A78BFA]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">Email</h2>
                <p className="text-sm text-[#94A3B8] mb-3">Prefer to email directly?</p>
                <a
                  href="mailto:support@algo-studio.com"
                  className="text-[#A78BFA] hover:text-[#C4B5FD] transition-colors font-medium"
                >
                  support@algo-studio.com
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Response time */}
        <p className="text-sm text-[#64748B] mt-8">
          We typically respond within 24 hours on business days.
        </p>
      </div>
      <Footer />
    </div>
  );
}
