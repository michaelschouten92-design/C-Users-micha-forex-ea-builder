"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";

// ── Dropdown data ─────────────────────────────────────────

const PLATFORM_ITEMS = [
  { label: "Overview", href: "/product" },
  { label: "How It Works", href: "/product/how-it-works" },
  { label: "Monitoring", href: "/product/health-monitor" },
  { label: "Strategy Identity", href: "/product/strategy-identity" },
  { label: "Track Record", href: "/product/track-record" },
  { label: "Monte Carlo", href: "/product/monte-carlo" },
];

const STRATEGIES_ITEMS = [
  { label: "Strategies", href: "/strategies" },
  { label: "Example Proof", href: "/p/demo" },
];

const RESOURCES_ITEMS = [
  { label: "Blog", href: "/blog" },
  { label: "FAQ", href: "/faq" },
  { label: "Roadmap", href: "/roadmap" },
  { label: "System Status", href: "/status" },
  { label: "Contact", href: "/contact" },
];

// ── Desktop dropdown ──────────────────────────────────────

function NavDropdown({
  label,
  items,
}: {
  label: string;
  items: Array<{ label: string; href: string }>;
}) {
  const [open, setOpen] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout>>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const enter = () => {
    if (timeout.current) clearTimeout(timeout.current);
    setOpen(true);
  };

  const leave = () => {
    timeout.current = setTimeout(() => setOpen(false), 150);
  };

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <div ref={containerRef} className="relative" onMouseEnter={enter} onMouseLeave={leave}>
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="true"
        className="text-sm text-[#A1A1AA] hover:text-white transition-colors rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366F1] flex items-center gap-1"
      >
        {label}
        <svg
          className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 min-w-[200px] bg-[#111114] border border-[rgba(255,255,255,0.06)] rounded-lg shadow-lg py-1.5 z-50">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-[#A1A1AA] hover:text-white hover:bg-[rgba(255,255,255,0.04)] transition-colors rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366F1]"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

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
  const sectionClass =
    "text-[10px] font-semibold text-[#71717A] uppercase tracking-wider mt-3 mb-1.5 first:mt-0";

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
            className="absolute top-16 left-0 right-0 bg-[#09090B]/95 backdrop-blur-md border-b border-[rgba(255,255,255,0.06)] px-6 py-4 flex flex-col gap-1 z-50"
          >
            {/* Platform */}
            <p className={sectionClass}>Platform</p>
            {PLATFORM_ITEMS.map((item) => (
              <Link key={item.href} href={item.href} onClick={close} className={linkClass}>
                {item.label}
              </Link>
            ))}

            {/* Strategies */}
            <p className={sectionClass}>Strategies</p>
            {STRATEGIES_ITEMS.map((item) => (
              <Link key={item.href} href={item.href} onClick={close} className={linkClass}>
                {item.label}
              </Link>
            ))}

            {/* Resources */}
            <p className={sectionClass}>Resources</p>
            {RESOURCES_ITEMS.map((item) => (
              <Link key={item.href} href={item.href} onClick={close} className={linkClass}>
                {item.label}
              </Link>
            ))}

            <div className="border-t border-[rgba(255,255,255,0.06)] mt-3 pt-3 flex flex-col gap-2">
              <Link href="/pricing" onClick={close} className={linkClass}>
                Pricing
              </Link>
              <Link href="/about" onClick={close} className={linkClass}>
                About
              </Link>
              <Link href="/login" onClick={close} className={linkClass}>
                Log in
              </Link>
              <Link
                href="/register"
                onClick={close}
                className="text-sm bg-[#6366F1] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#818CF8] transition-colors text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366F1]"
              >
                Start monitoring
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
          <NavDropdown label="Platform" items={PLATFORM_ITEMS} />
          <NavDropdown label="Strategies" items={STRATEGIES_ITEMS} />
          <Link
            href="/pricing"
            className="text-sm text-[#A1A1AA] hover:text-white transition-colors rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366F1]"
          >
            Pricing
          </Link>
          <NavDropdown label="Resources" items={RESOURCES_ITEMS} />
          <Link
            href="/about"
            className="text-sm text-[#A1A1AA] hover:text-white transition-colors rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366F1]"
          >
            About
          </Link>

          {/* Right-side actions */}
          <div className="border-l border-[rgba(255,255,255,0.06)] pl-6 flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm text-[#A1A1AA] hover:text-white transition-colors rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366F1]"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="text-sm bg-[#6366F1] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#818CF8] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366F1]"
            >
              Start monitoring
            </Link>
          </div>
        </div>

        {/* Mobile nav */}
        <MobileNavMenu />
      </div>
    </nav>
  );
}
