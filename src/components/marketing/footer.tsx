import Link from "next/link";

const SECTIONS = [
  {
    title: "Platform",
    links: [
      { label: "How It Works", href: "/how-it-works" },
      { label: "Features", href: "/features" },
      { label: "Strategies", href: "/strategies" },
      { label: "Pricing", href: "/pricing" },
      { label: "Sample Evaluation", href: "/sample-evaluation" },
    ],
  },
  {
    title: "Guides",
    links: [
      { label: "Prop Firms", href: "/prop-firms" },
      { label: "Alternatives", href: "/alternatives" },
      { label: "FAQ", href: "/faq" },
      { label: "Blog", href: "/blog" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Roadmap", href: "/roadmap" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "System Status", href: "/status" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Imprint", href: "/imprint" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative">
      {/* Gradient top border */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.3) 30%, rgba(34,211,238,0.15) 70%, transparent 100%)",
        }}
        aria-hidden="true"
      />

      <div className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Main grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-10 mb-12">
            {/* Brand column */}
            <div className="col-span-2 sm:col-span-4 lg:col-span-1 mb-4 lg:mb-0">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#6366F1] to-[#818CF8] flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-4 h-4 text-white"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path
                      d="M2 12L5.5 4L9 9L12 6L14 8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <span className="text-lg font-bold text-white tracking-tight">Algo Studio</span>
              </div>
              <p className="text-sm text-[#71717A] leading-relaxed max-w-xs">
                The monitoring layer for algorithmic trading. Built for traders who take their edge
                seriously.
              </p>
              {/* Social links */}
              <div className="flex items-center gap-3 mt-5">
                <a
                  href="https://x.com/AlgoStudio_"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#71717A] hover:text-white transition-colors"
                  aria-label="Follow Algo Studio on X"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Link columns */}
            {SECTIONS.map((section) => (
              <div key={section.title}>
                <h3 className="text-xs font-semibold text-[#FAFAFA] uppercase tracking-wider mb-4">
                  {section.title}
                </h3>
                <ul className="space-y-2.5">
                  {section.links.map((link) => (
                    <li key={link.href + link.label}>
                      <Link
                        href={link.href}
                        className="text-sm text-[#71717A] hover:text-[#FAFAFA] transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div className="pt-6 border-t border-[rgba(255,255,255,0.06)] flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-[#52525B]">
              &copy; {new Date().getFullYear()} Algo Studio. All rights reserved.
            </span>
            <span className="text-xs text-[#52525B]">
              Not financial advice. Trading involves risk.
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
