"use client";

import { useState, useEffect } from "react";
import { getCsrfHeaders } from "@/lib/api-client";
import { showSuccess, showError } from "@/lib/toast";

export function EmailVerificationBanner() {
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  // Read localStorage after mount to avoid SSR hydration mismatch
  useEffect(() => {
    if (localStorage.getItem("emailVerificationDismissed") === "true") {
      setDismissed(true);
    }
  }, []);

  if (dismissed) return null;

  async function handleResend() {
    if (cooldown > 0) return;
    setSending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: getCsrfHeaders(),
      });
      if (res.ok) {
        showSuccess("Verification email sent! Check your inbox.");
        setCooldown(60);
        const interval = setInterval(() => {
          setCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        const data = await res.json();
        showError(data.error || "Failed to send verification email");
      }
    } catch {
      showError("Something went wrong");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="bg-[rgba(251,191,36,0.1)] border border-[rgba(251,191,36,0.3)] px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
      <div className="flex items-start sm:items-center gap-3 min-w-0">
        <svg
          className="w-5 h-5 text-[#FBBF24] flex-shrink-0 mt-0.5 sm:mt-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
        <p className="text-sm text-[#FBBF24]">
          Please verify your email address. Check your inbox for a verification link.
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleResend}
          disabled={sending || cooldown > 0}
          className="text-xs text-[#FBBF24] hover:text-white border border-[rgba(251,191,36,0.3)] px-3 py-1.5 rounded-lg hover:bg-[rgba(251,191,36,0.1)] disabled:opacity-50 transition-all w-full sm:w-auto"
        >
          {sending ? "Sending..." : cooldown > 0 ? `Resend (${cooldown}s)` : "Resend"}
        </button>
        <button
          onClick={() => {
            setDismissed(true);
            localStorage.setItem("emailVerificationDismissed", "true");
          }}
          className="text-[#94A3B8] hover:text-white p-1 flex-shrink-0"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
