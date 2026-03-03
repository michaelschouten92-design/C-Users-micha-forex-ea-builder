"use client";

import { useEffect, useSyncExternalStore, useCallback } from "react";
import { useRouter } from "next/navigation";
import { OnboardingHero } from "./onboarding-hero";

const STORAGE_KEY = "algostudio-onboarding-complete";

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}

function getSnapshot(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function getServerSnapshot(): boolean {
  // Server: assume complete to avoid flash-redirect on SSR
  return true;
}

/**
 * OnboardingGate — Shown to new users (0 projects, 0 backtests, 0 EAs).
 *
 * If onboarding hasn't been completed yet, redirects to /app/onboarding.
 * If onboarding was already completed (but user still has no data),
 * falls back to the inline OnboardingHero.
 */
export function OnboardingGate() {
  const router = useRouter();
  const complete = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const redirectToOnboarding = useCallback(() => {
    router.replace("/app/onboarding");
  }, [router]);

  useEffect(() => {
    if (!complete) {
      redirectToOnboarding();
    }
  }, [complete, redirectToOnboarding]);

  if (!complete) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-[#4F46E5] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <OnboardingHero />;
}
