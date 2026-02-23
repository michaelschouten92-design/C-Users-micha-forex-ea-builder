import Link from "next/link";
import { MobileNav } from "@/components/mobile-nav";

export function SiteNav() {
  return (
    <nav
      role="navigation"
      aria-label="Main navigation"
      className="fixed top-0 w-full z-50 bg-[#0D0117]/80 backdrop-blur-md border-b border-[rgba(79,70,229,0.1)]"
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="text-xl font-bold text-white">
            AlgoStudio
          </Link>
          <span className="text-[10px] text-[#64748B] font-medium tracking-wider uppercase border border-[rgba(79,70,229,0.3)] rounded px-1.5 py-0.5 hidden sm:inline">
            EA Builder
          </span>
        </div>
        <div className="hidden md:flex items-center gap-6">
          <Link
            href="/product"
            className="text-sm text-[#94A3B8] hover:text-white transition-colors"
          >
            Platform
          </Link>
          <Link
            href="/pricing"
            className="text-sm text-[#94A3B8] hover:text-white transition-colors"
          >
            Pricing
          </Link>
          <Link href="/about" className="text-sm text-[#94A3B8] hover:text-white transition-colors">
            About
          </Link>
          <Link href="/login" className="text-sm text-[#94A3B8] hover:text-white transition-colors">
            Sign in
          </Link>
          <Link
            href="/login?mode=register&redirect=/app/backtest"
            className="text-sm bg-[#4F46E5] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#6366F1] transition-colors"
          >
            Upload Backtest
          </Link>
        </div>
        <MobileNav />
      </div>
    </nav>
  );
}
