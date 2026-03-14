import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

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

