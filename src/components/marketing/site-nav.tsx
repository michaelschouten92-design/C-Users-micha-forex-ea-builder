"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// ── Constants ────────────────────────────────────────────

const NAV_LINKS = [
  { href: "/how-it-works", label: "How It Works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
] as const;

// ── Mobile nav ────────────────────────────────────────────

function MobileNavMenu({ pathname }: { pathname: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Focus trap
  useEffect(() => {
    if (!isOpen || !dialogRef.current) return;

    const focusableSelector = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector);
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    firstFocusable?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const close = useCallback(() => {
    setIsOpen(false);
    triggerRef.current?.focus();
  }, []);

  return (
    <div className="md:hidden">
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="text-[#A1A1AA] hover:text-white p-2 rounded-lg transition-colors"
        aria-label={isOpen ? "Close menu" : "Open menu"}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 top-16 bg-black/60 backdrop-blur-sm z-40" onClick={close} />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation menu"
            className="absolute top-16 left-4 right-4 bg-[#111114]/95 backdrop-blur-xl border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-3 flex flex-col gap-1 z-50 shadow-2xl"
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={close}
                className={`text-sm px-3 py-2.5 rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6366F1] ${
                  pathname === link.href
                    ? "text-white bg-[rgba(255,255,255,0.06)]"
                    : "text-[#A1A1AA] hover:text-white hover:bg-[rgba(255,255,255,0.04)]"
                }`}
              >
                {link.label}
              </Link>
            ))}

            <div className="border-t border-[rgba(255,255,255,0.06)] mt-2 pt-2 flex flex-col gap-1">
              <Link
                href="/login"
                onClick={close}
                className="text-sm text-[#A1A1AA] hover:text-white px-3 py-2.5 rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6366F1]"
              >
                Log in
              </Link>
              <Link
                href="/register"
                onClick={close}
                className="text-sm bg-[#6366F1] text-white px-4 py-2.5 rounded-lg font-medium hover:bg-[#818CF8] transition-colors text-center mt-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6366F1]"
              >
                Start free
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── SiteNav ───────────────────────────────────────────────

export function SiteNav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 20);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      role="navigation"
      aria-label="Main navigation"
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#09090B]/90 backdrop-blur-xl border-b border-[rgba(255,255,255,0.08)] shadow-[0_1px_12px_rgba(0,0,0,0.4)]"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366F1]"
        >
          {/* Logomark */}
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#6366F1] to-[#818CF8] flex items-center justify-center flex-shrink-0">
            <svg
              className="w-4 h-4 text-white"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M2 12L5.5 4L9 9L12 6L14 8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          {/* Wordmark */}
          <span className="text-lg font-bold text-white tracking-tight">Algo Studio</span>
        </Link>

        {/* Desktop navigation */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm px-3 py-1.5 rounded-md transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366F1] ${
                pathname === link.href
                  ? "text-white bg-[rgba(255,255,255,0.08)]"
                  : "text-[#A1A1AA] hover:text-white hover:bg-[rgba(255,255,255,0.04)]"
              }`}
            >
              {link.label}
            </Link>
          ))}

          {/* Right-side actions */}
          <div className="border-l border-[rgba(255,255,255,0.08)] ml-4 pl-4 flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-[#A1A1AA] hover:text-white transition-colors px-3 py-1.5 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366F1]"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="text-sm bg-[#6366F1] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#818CF8] transition-colors btn-primary-cta focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366F1]"
            >
              Start free
            </Link>
          </div>
        </div>

        {/* Mobile nav */}
        <MobileNavMenu pathname={pathname} />
      </div>
    </nav>
  );
}
