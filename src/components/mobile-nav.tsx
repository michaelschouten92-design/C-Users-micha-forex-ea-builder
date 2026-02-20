"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-[#94A3B8] hover:text-white p-2"
        aria-label={isOpen ? "Close menu" : "Open menu"}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 top-16 bg-black/50 z-40" onClick={() => setIsOpen(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation menu"
            className="absolute top-16 left-0 right-0 bg-[#0D0117]/95 backdrop-blur-md border-b border-[rgba(79,70,229,0.2)] px-6 py-4 flex flex-col gap-4 z-50"
          >
            <Link
              href="/product"
              onClick={() => setIsOpen(false)}
              className="text-sm text-[#94A3B8] hover:text-white transition-colors"
            >
              Platform
            </Link>
            <Link
              href="/pricing"
              onClick={() => setIsOpen(false)}
              className="text-sm text-[#94A3B8] hover:text-white transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/about"
              onClick={() => setIsOpen(false)}
              className="text-sm text-[#94A3B8] hover:text-white transition-colors"
            >
              About
            </Link>
            <Link
              href="/templates"
              onClick={() => setIsOpen(false)}
              className="text-sm text-[#94A3B8] hover:text-white transition-colors"
            >
              Templates
            </Link>
            <Link
              href="/prop-firms"
              onClick={() => setIsOpen(false)}
              className="text-sm text-[#94A3B8] hover:text-white transition-colors"
            >
              Prop Firms
            </Link>
            <Link
              href="/docs"
              onClick={() => setIsOpen(false)}
              className="text-sm text-[#94A3B8] hover:text-white transition-colors"
            >
              Docs
            </Link>
            <Link
              href="/blog"
              onClick={() => setIsOpen(false)}
              className="text-sm text-[#94A3B8] hover:text-white transition-colors"
            >
              Blog
            </Link>
            <Link
              href="/login"
              onClick={() => setIsOpen(false)}
              className="text-sm text-[#94A3B8] hover:text-white transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/login?mode=register"
              onClick={() => setIsOpen(false)}
              className="text-sm bg-[#4F46E5] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#6366F1] transition-colors text-center"
            >
              Start Free
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
