import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ── Mocks ──────────────────────────────────────────────────
const mockPush = vi.fn();
const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  useSearchParams: () => mockSearchParams,
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

// ── Tests ──────────────────────────────────────────────────
describe("OnboardingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  async function renderPage(params?: string) {
    if (params) {
      mockSearchParams = new URLSearchParams(params);
    }
    // Dynamic import to pick up fresh mock state
    const mod = await import("./page");
    const Page = mod.default;
    return render(<Page />);
  }

  // ── Scope step (path selection) ────────────────────────

  it("renders three path selection cards on initial load", async () => {
    await renderPage();
    expect(screen.getByText("I Have a Validated Backtest")).toBeInTheDocument();
    expect(screen.getByText("I'm Already Trading Live")).toBeInTheDocument();
    expect(screen.getByText("I Want to Validate First")).toBeInTheDocument();
  });

  it("shows step indicator with Scope active", async () => {
    await renderPage();
    // Step 1 should be active (Scope), step number "1" rendered
    expect(screen.getByText("Establish Control Over Your Strategy.")).toBeInTheDocument();
  });

  it("renders the Strategy Control Layer pill badge", async () => {
    await renderPage();
    expect(screen.getByText("Strategy Control Layer")).toBeInTheDocument();
  });

  it("navigates to baseline step when backtest path is selected", async () => {
    await renderPage();
    fireEvent.click(screen.getByText("I Have a Validated Backtest"));
    expect(mockPush).toHaveBeenCalledWith("/app/onboarding?path=backtest&step=baseline");
  });

  it("navigates to baseline step when live path is selected", async () => {
    await renderPage();
    fireEvent.click(screen.getByText("I'm Already Trading Live"));
    expect(mockPush).toHaveBeenCalledWith("/app/onboarding?path=live&step=baseline");
  });

  it("navigates to baseline step when validate path is selected", async () => {
    await renderPage();
    fireEvent.click(screen.getByText("I Want to Validate First"));
    expect(mockPush).toHaveBeenCalledWith("/app/onboarding?path=validate&step=baseline");
  });

  // ── Backtest baseline step ─────────────────────────────

  it("renders backtest baseline step content", async () => {
    await renderPage("path=backtest&step=baseline");
    expect(screen.getByText("Establish Your Statistical Baseline")).toBeInTheDocument();
    expect(screen.getByText("Upload Backtest Report")).toBeInTheDocument();
  });

  it("has skip button on backtest baseline", async () => {
    await renderPage("path=backtest&step=baseline");
    const skipButton = screen.getByText(/I'll do this later/i);
    expect(skipButton).toBeInTheDocument();
    fireEvent.click(skipButton);
    expect(mockPush).toHaveBeenCalledWith("/app/onboarding?path=backtest&step=authority");
  });

  // ── Live baseline step ─────────────────────────────────

  it("renders live baseline step content", async () => {
    await renderPage("path=live&step=baseline");
    expect(screen.getByText("Bring Your Live Strategy Under Control")).toBeInTheDocument();
    expect(screen.getByText("Go to Live Monitor")).toBeInTheDocument();
  });

  it("has skip button on live baseline", async () => {
    await renderPage("path=live&step=baseline");
    const skipButton = screen.getByText(/I'll connect later/i);
    expect(skipButton).toBeInTheDocument();
    fireEvent.click(skipButton);
    expect(mockPush).toHaveBeenCalledWith("/app/onboarding?path=live&step=authority");
  });

  // ── Validate baseline step ─────────────────────────────

  it("renders validate baseline step with template options", async () => {
    await renderPage("path=validate&step=baseline");
    expect(screen.getByText("Build, Test, Then Deploy With Authority")).toBeInTheDocument();
    expect(screen.getByText("EMA Crossover")).toBeInTheDocument();
    expect(screen.getByText("RSI Reversal")).toBeInTheDocument();
    expect(screen.getByText("Range Breakout")).toBeInTheDocument();
  });

  it("has skip button on validate baseline", async () => {
    await renderPage("path=validate&step=baseline");
    const skipButton = screen.getByText(/Skip to authority setup/i);
    expect(skipButton).toBeInTheDocument();
    fireEvent.click(skipButton);
    expect(mockPush).toHaveBeenCalledWith("/app/onboarding?path=validate&step=authority");
  });

  // ── Authority step ─────────────────────────────────────

  it("renders authority step with RUN/PAUSE/STOP states", async () => {
    await renderPage("path=backtest&step=authority");
    expect(screen.getByText("Establish Deterministic Authority")).toBeInTheDocument();
    expect(screen.getByText("RUN")).toBeInTheDocument();
    expect(screen.getByText("PAUSE")).toBeInTheDocument();
    expect(screen.getByText("STOP")).toBeInTheDocument();
  });

  it("shows path-specific context on authority step", async () => {
    await renderPage("path=live&step=authority");
    expect(screen.getByText(/live EA is now under observation/i)).toBeInTheDocument();
  });

  it("completes onboarding and redirects to dashboard", async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
    await renderPage("path=backtest&step=authority");

    fireEvent.click(screen.getByText("Establish Control"));

    expect(setItemSpy).toHaveBeenCalledWith("algostudio-onboarding-complete", "true");
    expect(mockPush).toHaveBeenCalledWith("/app");

    setItemSpy.mockRestore();
  });

  // ── Edge cases ─────────────────────────────────────────

  it("shows scope step when path param is invalid", async () => {
    await renderPage("path=invalid");
    expect(screen.getByText("I Have a Validated Backtest")).toBeInTheDocument();
  });

  it("shows scope step when path is missing but step is set", async () => {
    await renderPage("step=authority");
    expect(screen.getByText("I Have a Validated Backtest")).toBeInTheDocument();
  });

  it("renders footer tagline about deterministic authority", async () => {
    await renderPage();
    expect(screen.getByText(/deterministic lifecycle authority/i)).toBeInTheDocument();
  });
});
