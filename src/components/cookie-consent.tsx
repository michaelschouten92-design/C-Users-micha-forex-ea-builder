"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";

const COOKIE_CONSENT_KEY = "cookie_consent";

export type CookieConsentValue = "accepted" | "essential_only";

export function getCookieConsent(): CookieConsentValue | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(COOKIE_CONSENT_KEY) as CookieConsentValue | null;
}

const noop = () => () => {};

export function CookieConsent() {
  const hasConsent = useSyncExternalStore(
    noop,
    () => localStorage.getItem(COOKIE_CONSENT_KEY) !== null,
    () => true
  );
  const [dismissed, setDismissed] = useState(false);

  function accept() {
    localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    setDismissed(true);
  }

  function reject() {
    localStorage.setItem(COOKIE_CONSENT_KEY, "essential_only");
    setDismissed(true);
  }

  if (hasConsent || dismissed) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-[#1A0626] border-t border-white/10">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-4">
        <p className="text-sm text-[#94A3B8] flex-1">
          We use essential cookies for authentication and security. We also use privacy-friendly
          analytics to improve our service.{" "}
          <Link href="/privacy" className="text-[#4F46E5] hover:underline">
            Privacy Policy
          </Link>
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={reject}
            className="px-4 py-2 text-sm font-medium text-[#94A3B8] border border-[rgba(79,70,229,0.3)] rounded-lg hover:text-white hover:border-[rgba(79,70,229,0.5)] transition-colors whitespace-nowrap"
          >
            Essential Only
          </button>
          <button
            onClick={accept}
            className="px-5 py-2 text-sm font-medium text-white bg-[#4F46E5] rounded-lg hover:bg-[#6366F1] transition-colors whitespace-nowrap"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}
