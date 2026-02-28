import { describe, it, expect } from "vitest";
import { matchesSegmentFilters, MS_PER_DAY, ACTIVE_USER_MIN_ACTIONS } from "./segment-filter";

// Helper to build a minimal user object
function makeUser(
  overrides: {
    lastLoginAt?: Date | null;
    tier?: string;
    status?: string;
    currentPeriodEnd?: Date | null;
    _activityCount?: number;
  } = {}
) {
  return {
    email: "test@example.com",
    lastLoginAt: "lastLoginAt" in overrides ? overrides.lastLoginAt! : new Date(),
    subscription: {
      tier: overrides.tier ?? "FREE",
      status: overrides.status ?? "active",
      currentPeriodEnd: overrides.currentPeriodEnd ?? null,
    },
    _activityCount: overrides._activityCount ?? 0,
  };
}

describe("MS_PER_DAY", () => {
  it("equals 24 * 60 * 60 * 1000", () => {
    expect(MS_PER_DAY).toBe(24 * 60 * 60 * 1000);
  });
});

describe("matchesSegmentFilters", () => {
  it("returns true when no filters are set", () => {
    expect(matchesSegmentFilters(makeUser(), {})).toBe(true);
  });

  // ---- Login filter ----
  it("passes login filter '7d' when user logged in recently", () => {
    const user = makeUser({ lastLoginAt: new Date(Date.now() - 1 * MS_PER_DAY) });
    expect(matchesSegmentFilters(user, { loginFilter: "7d" })).toBe(true);
  });

  it("fails login filter '7d' when user logged in 10 days ago", () => {
    const user = makeUser({ lastLoginAt: new Date(Date.now() - 10 * MS_PER_DAY) });
    expect(matchesSegmentFilters(user, { loginFilter: "7d" })).toBe(false);
  });

  it("fails login filter '30d' when user logged in 60 days ago", () => {
    const user = makeUser({ lastLoginAt: new Date(Date.now() - 60 * MS_PER_DAY) });
    expect(matchesSegmentFilters(user, { loginFilter: "30d" })).toBe(false);
  });

  it("fails login filter 'NEVER' when user has logged in", () => {
    const user = makeUser({ lastLoginAt: new Date() });
    expect(matchesSegmentFilters(user, { loginFilter: "NEVER" })).toBe(false);
  });

  it("passes login filter 'NEVER' when lastLoginAt is null", () => {
    const user = makeUser({ lastLoginAt: null });
    expect(matchesSegmentFilters(user, { loginFilter: "NEVER" })).toBe(true);
  });

  // ---- Activity filter ----
  it("marks user as active when _activityCount meets threshold", () => {
    const user = makeUser({ _activityCount: ACTIVE_USER_MIN_ACTIONS });
    expect(matchesSegmentFilters(user, { activityFilter: "active" })).toBe(true);
  });

  it("marks user as inactive when _activityCount is below threshold", () => {
    const user = makeUser({ _activityCount: ACTIVE_USER_MIN_ACTIONS - 1 });
    expect(matchesSegmentFilters(user, { activityFilter: "active" })).toBe(false);
  });

  // ---- Tier filter ----
  it("filters by subscription tier", () => {
    const pro = makeUser({ tier: "PRO" });
    expect(matchesSegmentFilters(pro, { tierFilter: "PRO" })).toBe(true);
    expect(matchesSegmentFilters(pro, { tierFilter: "FREE" })).toBe(false);
  });
});
