/**
 * Client-side analytics helper.
 *
 * Centralized wrapper around PostHog (the project's only active analytics
 * provider — see src/components/posthog-provider.tsx). Silent no-op when:
 *   - called on the server
 *   - PostHog not initialised (user declined cookie consent, or NEXT_PUBLIC_POSTHOG_KEY unset)
 *
 * All tracking is gated behind the cookie-consent banner via PostHogProvider,
 * so this helper doesn't need its own consent check.
 */
import posthog from "posthog-js";

type EventProps = Record<string, string | number | boolean | null | undefined>;

export function trackEvent(name: string, props?: EventProps): void {
  if (typeof window === "undefined") return;
  // posthog-js is safe to call before init — it queues or no-ops based on __loaded.
  // __loaded is only true after posthog.init() in PostHogProvider, which only
  // runs after cookie consent is granted.
  if (!posthog.__loaded) return;
  try {
    posthog.capture(name, props);
  } catch {
    // Never let analytics errors break the UI.
  }
}
