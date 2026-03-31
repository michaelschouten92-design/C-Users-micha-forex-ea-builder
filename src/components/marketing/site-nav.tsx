"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";

// ── Mobile nav ────────────────────────────────────────────

function MobileNavMenu() {
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

  const linkClass =
    "text-sm text-[#A1A1AA] hover:text-white transition-colors rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366F1]";

  return (
    <div className="md:hidden">
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="text-[#A1A1AA] hover:text-white p-2"
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
          <div className="fixed inset-0 top-16 bg-black/50 z-40" onClick={close} />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation menu"
            className="absolute top-16 left-0 right-0 bg-[#09090B]/95 backdrop-blur-md border-b border-[rgba(255,255,255,0.06)] px-6 py-4 flex flex-col gap-2 z-50"
          >
            <Link href="/how-it-works" onClick={close} className={linkClass}>
              How It Works
            </Link>
            <Link href="/pricing" onClick={close} className={linkClass}>
              Pricing
            </Link>
            <Link href="/faq" onClick={close} className={linkClass}>
              FAQ
            </Link>
            <Link href="/strategies" onClick={close} className={linkClass}>
              Strategies
            </Link>

            <div className="border-t border-[rgba(255,255,255,0.06)] mt-2 pt-3 flex flex-col gap-2">
              <Link href="/login" onClick={close} className={linkClass}>
                Log in
              </Link>
              <Link
                href="/register"
                onClick={close}
                className="text-sm bg-[#6366F1] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#818CF8] transition-colors text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366F1]"
              >
                Sign up free
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
  const linkClass =
    "text-sm text-[#A1A1AA] hover:text-white transition-colors rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366F1]";

  return (
    <nav
      role="navigation"
      aria-label="Main navigation"
      className="fixed top-0 w-full z-50 bg-[#09090B]/80 backdrop-blur-md border-b border-[rgba(255,255,255,0.06)]"
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="text-xl font-bold text-white rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366F1]"
          >
            AlgoStudio
          </Link>
          <span className="text-[10px] text-[#71717A] font-medium tracking-wider uppercase border border-[rgba(255,255,255,0.10)] rounded px-1.5 py-0.5 hidden sm:inline">
            Monitoring &amp; Governance
          </span>
        </div>

        {/* Desktop navigation */}
        <div className="hidden md:flex items-center gap-6">
          <Link href="/how-it-works" className={linkClass}>
            How It Works
          </Link>
          <Link href="/pricing" className={linkClass}>
            Pricing
          </Link>
          <Link href="/faq" className={linkClass}>
            FAQ
          </Link>
          <Link href="/strategies" className={linkClass}>
            Strategies
          </Link>

          {/* Right-side actions */}
          <div className="border-l border-[rgba(255,255,255,0.06)] pl-6 flex items-center gap-4">
            <Link href="/login" className={linkClass}>
              Log in
            </Link>
            <Link
              href="/register"
              className="text-sm bg-[#6366F1] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#818CF8] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366F1]"
            >
              Sign up free
            </Link>
          </div>
        </div>

        {/* Mobile nav */}
        <MobileNavMenu />
      </div>
    </nav>
  );
}
