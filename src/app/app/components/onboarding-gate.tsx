"use client";

import { useSyncExternalStore } from "react";
import { OnboardingHero } from "./onboarding-hero";

const DISMISSED_KEY = "algostudio-onboarding-banner-dismissed";

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}

function getSnapshot(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "true";
  } catch {
    return false;
  }
}

function getServerSnapshot(): boolean {
  return false;
}

/**
 * OnboardingGate — Inline welcome content for users with no data.
 *
 * Server-side redirect (in page.tsx) handles the actual onboarding gate.
 * This component only renders the OnboardingHero inline.
 * localStorage controls ONLY banner dismissal — never redirects.
 */
export function OnboardingGate() {
  const dismissed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (dismissed) return null;

  return <OnboardingHero />;
}
