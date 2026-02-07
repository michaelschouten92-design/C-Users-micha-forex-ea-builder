"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const COOKIE_CONSENT_KEY = "cookie_consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      setVisible(true);
    }
  }, []);

  function accept() {
    localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-[#1A0626] border-t border-white/10">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-4">
        <p className="text-sm text-[#94A3B8] flex-1">
          We only use essential cookies for authentication and security. No tracking or advertising.{" "}
          <Link href="/privacy" className="text-[#4F46E5] hover:underline">
            Privacy Policy
          </Link>
        </p>
        <button
          onClick={accept}
          className="px-5 py-2 text-sm font-medium text-white bg-[#4F46E5] rounded-lg hover:bg-[#6366F1] transition-colors whitespace-nowrap"
        >
          Got It
        </button>
      </div>
    </div>
  );
}
