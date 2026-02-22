import Link from "next/link";

export function Footer() {
  return (
    <footer className="py-12 px-6 border-t border-[rgba(79,70,229,0.1)]">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Platform</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/product"
                  className="text-sm text-[#64748B] hover:text-[#94A3B8] transition-colors"
                >
                  Platform Overview
                </Link>
              </li>
              <li>
                <Link
                  href="/product/track-record"
                  className="text-sm text-[#64748B] hover:text-[#94A3B8] transition-colors"
                >
                  Verified Track Record
                </Link>
              </li>
              <li>
                <Link
                  href="/templates"
                  className="text-sm text-[#64748B] hover:text-[#94A3B8] transition-colors"
                >
                  Strategy Templates
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="text-sm text-[#64748B] hover:text-[#94A3B8] transition-colors"
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  href="/roadmap"
                  className="text-sm text-[#64748B] hover:text-[#94A3B8] transition-colors"
                >
                  Roadmap
                </Link>
              </li>
              <li>
                <Link
                  href="/status"
                  className="text-sm text-[#64748B] hover:text-[#94A3B8] transition-colors"
                >
                  System Status
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Resources</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/blog"
                  className="text-sm text-[#64748B] hover:text-[#94A3B8] transition-colors"
                >
                  Blog
                </Link>
              </li>
              <li>
                <Link
                  href="/prop-firms"
                  className="text-sm text-[#64748B] hover:text-[#94A3B8] transition-colors"
                >
                  Prop Firms
                </Link>
              </li>
              <li>
                <Link
                  href="/compare-platforms"
                  className="text-sm text-[#64748B] hover:text-[#94A3B8] transition-colors"
                >
                  Compare Platforms
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-[#64748B] hover:text-[#94A3B8] transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-sm text-[#64748B] hover:text-[#94A3B8] transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Support</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/contact"
                  className="text-sm text-[#64748B] hover:text-[#94A3B8] transition-colors"
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="text-sm text-[#64748B] hover:text-[#94A3B8] transition-colors"
                >
                  FAQ
                </Link>
              </li>
              <li>
                <a
                  href="mailto:support@algo-studio.com"
                  className="text-sm text-[#64748B] hover:text-[#94A3B8] transition-colors"
                >
                  support@algo-studio.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-[rgba(79,70,229,0.1)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-white">AlgoStudio</span>
            <span className="text-xs text-[#64748B]">Strategy Intelligence Platform</span>
          </div>
          <span className="text-sm text-[#64748B]">
            &copy; {new Date().getFullYear()} AlgoStudio. All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  );
}
