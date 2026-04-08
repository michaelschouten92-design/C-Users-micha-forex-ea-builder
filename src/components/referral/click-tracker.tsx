"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Client component that tracks referral clicks.
 * Detects ?ref= parameter and sends a click event to the API.
 * Renders nothing visible.
 */
export function ReferralClickTracker() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (!ref) return;

    fetch("/api/referral/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ref, path: window.location.pathname }),
    }).catch(() => {
      // Silently ignore — clicks are analytics, not truth
    });
  }, [searchParams]);

  return null;
}
