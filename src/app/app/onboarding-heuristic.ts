/**
 * Server-side onboarding heuristic.
 *
 * Determines whether a user should be redirected to the onboarding flow.
 * Returns the redirect path or null if no redirect is needed.
 *
 * Rules (OR logic, fail-closed):
 * - Zero strategies OR zero live EAs → redirect
 * - Both strategies > 0 AND live EAs > 0 → no redirect
 */
export function shouldRedirectToOnboarding(
  strategyCount: number,
  liveEACount: number
): string | null {
  if (strategyCount === 0 || liveEACount === 0) {
    return "/app/onboarding?step=scope";
  }
  return null;
}
