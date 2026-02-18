import Link from "next/link";
import { MobileNav } from "@/components/mobile-nav";

export function SiteNav() {
  return (
    <nav className="fixed top-0 w-full z-50 bg-[#0D0117]/80 backdrop-blur-md border-b border-[rgba(79,70,229,0.1)]">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="text-xl font-bold text-white">
            AlgoStudio
          </Link>
        </div>
        <div className="hidden md:flex items-center gap-6">
          <Link href="/" className="text-sm text-[#94A3B8] hover:text-white transition-colors">
            Product
          </Link>
          <Link
            href="/templates"
            className="text-sm text-[#94A3B8] hover:text-white transition-colors"
          >
            Templates
          </Link>
          <Link
            href="/pricing"
            className="text-sm text-[#94A3B8] hover:text-white transition-colors"
          >
            Pricing
          </Link>
          <Link
            href="/coaching"
            className="text-sm text-[#94A3B8] hover:text-white transition-colors"
          >
            Coaching
          </Link>
          <Link href="/blog" className="text-sm text-[#94A3B8] hover:text-white transition-colors">
            Blog
          </Link>
          <Link href="/login" className="text-sm text-[#94A3B8] hover:text-white transition-colors">
            Sign in
          </Link>
          <Link
            href="/login?mode=register"
            className="text-sm bg-[#4F46E5] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#6366F1] transition-colors"
          >
            Start Free
          </Link>
        </div>
        <MobileNav />
      </div>
    </nav>
  );
}
