import Link from "next/link";

const SECTIONS = [
  {
    title: "Platform",
    links: [
      { label: "Overview", href: "/product" },
      { label: "How It Works", href: "/product/how-it-works" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    title: "Proof",
    links: [
      { label: "Verified Strategies", href: "/strategies" },
      { label: "Verified Track Record", href: "/product/track-record" },
    ],
  },
  {
    title: "Tools",
    links: [
      { label: "EA Builder", href: "/product/how-it-works" },
      { label: "MT5 Export", href: "/product/mt5-export" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Blog", href: "/blog" },
      { label: "FAQ", href: "/faq" },
      { label: "Roadmap", href: "/roadmap" },
      { label: "System Status", href: "/status" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="py-12 px-6 border-t border-[rgba(255,255,255,0.06)]">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-8 mb-8">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-semibold text-white mb-4">{section.title}</h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-[rgba(255,255,255,0.06)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-white">AlgoStudio</span>
            <span className="text-xs text-[#71717A]">
              Monitoring &amp; Governance for Algorithmic Trading
            </span>
          </div>
          <span className="text-sm text-[#71717A]">
            &copy; {new Date().getFullYear()} AlgoStudio. All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  );
}
