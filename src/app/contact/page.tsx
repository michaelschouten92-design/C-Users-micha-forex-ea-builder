import type { Metadata } from "next";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contact — Support & Questions | Algo Studio",
  description:
    "Get in touch with Algo Studio. Questions about MT5 monitoring, strategy drift detection, or pricing? We respond within 24 hours.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact | Algo Studio",
    description: "Get in touch with Algo Studio. Contact us for support, questions, or feedback.",
    images: ["/opengraph-image"],
  },
};

export default function ContactPage() {
  return (
    <div id="main-content" className="min-h-screen flex flex-col bg-[#08080A]">
      <SiteNav />
      <div className="max-w-2xl mx-auto pt-32 pb-16 px-4 flex-1">
        <h1 className="text-[28px] md:text-[36px] font-extrabold text-[#FAFAFA] tracking-tight mb-4">
          Contact us
        </h1>
        <p className="text-[#A1A1AA] mb-10">
          Have a question, found a bug, or need help? We&apos;re here to help.
        </p>

        <div className="space-y-6">
          {/* Contact Form */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-[#FAFAFA] mb-4">Send us a message</h2>
            <ContactForm />
          </div>

          {/* Email */}
          <div className="glass-card p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-[rgba(99,102,241,0.10)] rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-[#6366F1]"
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
                <h2 className="text-lg font-semibold text-[#FAFAFA] mb-1">Email</h2>
                <p className="text-sm text-[#A1A1AA] mb-3">Prefer to email directly?</p>
                <a
                  href="mailto:support@algo-studio.com"
                  className="text-[#6366F1] hover:text-[#818CF8] transition-colors font-medium"
                >
                  support@algo-studio.com
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Response time */}
        <p className="text-sm text-[#71717A] mt-8">
          We typically respond within 24 hours on business days.
        </p>
      </div>
      <Footer />
    </div>
  );
}
