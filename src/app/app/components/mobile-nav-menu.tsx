"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

type NavItem = "evaluate" | "monitor" | "alerts" | "referrals" | "settings";

const NAV_ITEMS: { key: NavItem; label: string; href: string }[] = [
  { key: "evaluate", label: "Evaluate", href: "/app/evaluate" },
  { key: "monitor", label: "Command Center", href: "/app/live" },
  { key: "alerts", label: "Alerts", href: "/app/alerts" },
  { key: "settings", label: "Settings", href: "/app/settings" },
];

export function MobileNavMenu({ activeItem }: { activeItem?: NavItem }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;

    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as globalThis.Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <div ref={menuRef} className="relative sm:hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-2 text-[#A1A1AA] hover:text-white transition-colors rounded-lg hover:bg-[rgba(255,255,255,0.06)]"
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={open}
      >
        {open ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-[#111114] border border-[rgba(255,255,255,0.10)] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-50 py-2 overflow-hidden">
          <Link
            href="/app/evaluate"
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${activeItem === "evaluate" ? "text-[#818CF8] bg-[rgba(79,70,229,0.08)]" : "text-[#A1A1AA] hover:text-white hover:bg-[rgba(255,255,255,0.06)]"}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            Evaluate
          </Link>
          <Link
            href="/app/live"
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${activeItem === "monitor" ? "text-[#818CF8] bg-[rgba(79,70,229,0.08)]" : "text-[#A1A1AA] hover:text-white hover:bg-[rgba(255,255,255,0.06)]"}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            Command Center
          </Link>
          <Link
            href="/app/alerts"
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${activeItem === "alerts" ? "text-[#818CF8] bg-[rgba(79,70,229,0.08)]" : "text-[#A1A1AA] hover:text-white hover:bg-[rgba(255,255,255,0.06)]"}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            Alerts
          </Link>
          <Link
            href="/app/settings"
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${activeItem === "settings" ? "text-[#818CF8] bg-[rgba(79,70,229,0.08)]" : "text-[#A1A1AA] hover:text-white hover:bg-[rgba(255,255,255,0.06)]"}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Settings
          </Link>
          <div className="border-t border-[rgba(255,255,255,0.06)] mt-1 pt-1">
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#A1A1AA] hover:text-white hover:bg-[rgba(255,255,255,0.06)] transition-colors w-full text-left"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Sign Out
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
