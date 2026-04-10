"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect, useMemo } from "react";
import { getCookieConsent } from "@/components/cookie-consent";

/**
 * PostHog provider — gated behind cookie consent.
 *
 * PostHog is analytics (not essential infrastructure) so under GDPR it must
 * only run after the user has explicitly accepted analytics cookies. We check
 * the consent value stored by the CookieConsent component before initialising.
 *
 * If the user has only accepted "essential_only", or hasn't made a choice yet,
 * PostHog is not initialised and children are rendered without the provider
 * wrapper.
 *
 * When the user accepts consent later, PostHog starts on the next page
 * navigation (no live re-init — acceptable UX cost, simpler implementation).
 *
 * Implementation note: `shouldTrack` is computed via useMemo so the decision
 * is synchronous with the first render, avoiding setState inside useEffect
 * (which would trigger cascading renders and violate react-hooks rules).
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const shouldTrack = useMemo(() => {
    if (typeof window === "undefined") return false;
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return false;
    return getCookieConsent() === "accepted";
  }, []);

  useEffect(() => {
    if (!shouldTrack) return;

    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
    if (!key) return;

    posthog.init(key, {
      api_host: host || "https://eu.i.posthog.com",
      person_profiles: "identified_only",
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: true,
    });
  }, [shouldTrack]);

  if (!shouldTrack) {
    return <>{children}</>;
  }

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
