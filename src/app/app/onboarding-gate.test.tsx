import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { shouldRedirectToOnboarding } from "./onboarding-heuristic";

// ── Mocks ──────────────────────────────────────────────────

const mockReplace = vi.fn();
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  redirect: vi.fn(),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/strategy-presets", () => ({
  STRATEGY_PRESETS: [
    {
      id: "ema-crossover",
      name: "EMA Crossover",
      description: "Simple EMA strategy",
      buildJson: { nodes: [{ id: "1" }, { id: "2" }] },
    },
    {
      id: "rsi-reversal",
      name: "RSI Reversal",
      description: "RSI-based reversal",
      buildJson: { nodes: [{ id: "1" }] },
    },
    {
      id: "range-breakout",
      name: "Range Breakout",
      description: "Range breakout strategy",
      buildJson: { nodes: [{ id: "1" }, { id: "2" }, { id: "3" }] },
    },
  ],
}));

vi.mock("@/lib/api-client", () => ({
  getCsrfHeaders: () => ({ "x-csrf-token": "test" }),
}));

vi.mock("@/lib/toast", () => ({
  showError: vi.fn(),
}));

// ── Client component: OnboardingGate ──────────────────────

describe("OnboardingGate (client component)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders OnboardingHero inline — never calls router.replace()", async () => {
    localStorage.removeItem("algostudio-onboarding-banner-dismissed");

    const { OnboardingGate } = await import("./components/onboarding-gate");
    render(<OnboardingGate />);

    // Should render hero content, NOT a spinner or redirect
    expect(screen.getByText("Welcome to AlgoStudio")).toBeInTheDocument();

    // Must NEVER call router.replace — localStorage does not trigger redirects
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("does not redirect even when localStorage has no onboarding key", async () => {
    localStorage.clear();

    const { OnboardingGate } = await import("./components/onboarding-gate");
    render(<OnboardingGate />);

    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("hides banner when dismissed via localStorage", async () => {
    localStorage.setItem("algostudio-onboarding-banner-dismissed", "true");

    const { OnboardingGate } = await import("./components/onboarding-gate");
    const { container } = render(<OnboardingGate />);

    expect(container.innerHTML).toBe("");
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

// ── Server-side heuristic: shouldRedirectToOnboarding ─────

describe("shouldRedirectToOnboarding", () => {
  it("redirects when zero strategies AND zero live EAs", () => {
    expect(shouldRedirectToOnboarding(0, 0)).toBe("/app/onboarding?step=scope");
  });

  it("redirects when zero strategies but has live EAs (0, 1)", () => {
    expect(shouldRedirectToOnboarding(0, 1)).toBe("/app/onboarding?step=scope");
  });

  it("redirects when has strategies but zero live EAs (1, 0)", () => {
    expect(shouldRedirectToOnboarding(1, 0)).toBe("/app/onboarding?step=scope");
  });

  it("does NOT redirect when user has both strategies and live EAs (1, 1)", () => {
    expect(shouldRedirectToOnboarding(1, 1)).toBeNull();
  });

  it("does NOT redirect with larger counts", () => {
    expect(shouldRedirectToOnboarding(5, 3)).toBeNull();
  });

  it("accepts no cookie parameter — signature is (number, number)", () => {
    // Type-level verification: the function takes exactly 2 args
    expect(shouldRedirectToOnboarding.length).toBe(2);
  });

  it("localStorage alone does NOT prevent server redirect", () => {
    // Server cannot read localStorage.
    // Even if localStorage says onboarding is complete, the server
    // only looks at DB counts. Zero strategies → redirect.
    expect(shouldRedirectToOnboarding(0, 0)).toBe("/app/onboarding?step=scope");
    expect(shouldRedirectToOnboarding(0, 5)).toBe("/app/onboarding?step=scope");
    expect(shouldRedirectToOnboarding(3, 0)).toBe("/app/onboarding?step=scope");
  });
});
