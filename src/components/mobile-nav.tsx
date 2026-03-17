"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Focus trap: move focus into dialog on open, trap Tab, restore on close
  useEffect(() => {
    if (!isOpen || !dialogRef.current) return;

    const focusableSelector = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector);
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    // Move focus to first menu item
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
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const closeAndRestoreFocus = useCallback(() => {
    setIsOpen(false);
    triggerRef.current?.focus();
  }, []);

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
          <div className="fixed inset-0 top-16 bg-black/50 z-40" onClick={closeAndRestoreFocus} />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation menu"
            className="absolute top-16 left-0 right-0 bg-[#09090B]/95 backdrop-blur-md border-b border-[rgba(255,255,255,0.06)] px-6 py-4 flex flex-col gap-4 z-50"
          >
            <Link
              href="/strategies"
              onClick={closeAndRestoreFocus}
              className="text-sm text-[#A1A1AA] hover:text-white transition-colors rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366F1]"
            >
              Strategies
            </Link>
            <Link
              href="/how-it-works"
              onClick={closeAndRestoreFocus}
              className="text-sm text-[#A1A1AA] hover:text-white transition-colors rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366F1]"
            >
              How It Works
            </Link>
            <Link
              href="/pricing"
              onClick={closeAndRestoreFocus}
              className="text-sm text-[#A1A1AA] hover:text-white transition-colors rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366F1]"
            >
              Pricing
            </Link>
            <Link
              href="/about"
              onClick={closeAndRestoreFocus}
              className="text-sm text-[#A1A1AA] hover:text-white transition-colors rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366F1]"
            >
              About
            </Link>
            <Link
              href="/prop-firms"
              onClick={closeAndRestoreFocus}
              className="text-sm text-[#A1A1AA] hover:text-white transition-colors rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366F1]"
            >
              Prop Firms
            </Link>
            <Link
              href="/blog"
              onClick={closeAndRestoreFocus}
              className="text-sm text-[#A1A1AA] hover:text-white transition-colors rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366F1]"
            >
              Blog
            </Link>
            <Link
              href="/login"
              onClick={closeAndRestoreFocus}
              className="text-sm text-[#A1A1AA] hover:text-white transition-colors rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366F1]"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              onClick={closeAndRestoreFocus}
              className="text-sm bg-[#6366F1] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#818CF8] transition-colors text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366F1]"
            >
              Start monitoring
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
