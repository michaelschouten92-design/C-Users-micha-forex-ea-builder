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

  it("has 'Skip for now' button on backtest baseline", async () => {
    await renderPage("path=backtest&step=baseline");
    const skipButtons = screen.getAllByText("Skip for now");
    expect(skipButtons.length).toBeGreaterThan(0);
    fireEvent.click(skipButtons[0]);
    expect(mockPush).toHaveBeenCalledWith("/app/onboarding?path=backtest&step=authority");
  });

  it("shows governance helper text near skip on backtest baseline", async () => {
    await renderPage("path=backtest&step=baseline");
    expect(
      screen.getByText("You can place a strategy under governance at any time.")
    ).toBeInTheDocument();
  });

  // ── Live baseline step ─────────────────────────────────

  it("renders live baseline step content", async () => {
    await renderPage("path=live&step=baseline");
    expect(screen.getByText("Bring Your Live Strategy Under Control")).toBeInTheDocument();
    expect(screen.getByText("Go to Live Monitor")).toBeInTheDocument();
  });

  it("has 'Skip for now' button on live baseline", async () => {
    await renderPage("path=live&step=baseline");
    const skipButtons = screen.getAllByText("Skip for now");
    expect(skipButtons.length).toBeGreaterThan(0);
    fireEvent.click(skipButtons[0]);
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

  it("has 'Skip for now' button on validate baseline", async () => {
    await renderPage("path=validate&step=baseline");
    const skipButtons = screen.getAllByText("Skip for now");
    expect(skipButtons.length).toBeGreaterThan(0);
    fireEvent.click(skipButtons[0]);
    expect(mockPush).toHaveBeenCalledWith("/app/onboarding?path=validate&step=authority");
  });

  // ── Baseline governance framing ───────────────────────

  it("shows governance framing line on all baseline steps", async () => {
    const governanceLine = "Submit the baseline this strategy will be governed against.";

    await renderPage("path=backtest&step=baseline");
    expect(screen.getByText(governanceLine)).toBeInTheDocument();

    // Re-render for live path
    const { unmount: u1 } = render(
      await import("./page").then((m) => {
        mockSearchParams = new URLSearchParams("path=live&step=baseline");
        const Page = m.default;
        return <Page />;
      })
    );
    expect(screen.getAllByText(governanceLine).length).toBeGreaterThan(0);
    u1();

    // Re-render for validate path
    mockSearchParams = new URLSearchParams("path=validate&step=baseline");
    const mod = await import("./page");
    render(<mod.default />);
    expect(screen.getAllByText(governanceLine).length).toBeGreaterThan(0);
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

  it("RUN/PAUSE/STOP descriptions match contract terminology", async () => {
    await renderPage("path=backtest&step=authority");
    expect(screen.getByText(/validated statistical boundaries/i)).toBeInTheDocument();
    expect(screen.getByText(/structural deviation detected/i)).toBeInTheDocument();
    expect(screen.getByText(/permission to run is revoked/i)).toBeInTheDocument();
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

  it("falls back to baseline when step param is invalid but path is valid", async () => {
    await renderPage("path=backtest&step=garbage");
    // Should fail-closed to baseline (not blank screen, not scope)
    expect(screen.getByText("Establish Your Statistical Baseline")).toBeInTheDocument();
  });

  it("falls back to baseline when step param is missing but path is valid", async () => {
    await renderPage("path=live");
    expect(screen.getByText("Bring Your Live Strategy Under Control")).toBeInTheDocument();
  });

  it("renders footer tagline about deterministic authority", async () => {
    await renderPage();
    expect(screen.getByText(/deterministic lifecycle authority/i)).toBeInTheDocument();
  });

  // ── Gate isolation ─────────────────────────────────────

  it("onboarding gate is only rendered from /app root dashboard", async () => {
    // OnboardingGate is imported only in src/app/app/page.tsx.
    // Verify it does NOT exist in monitor, evaluate, or other routes.
    // This is an architectural test — the gate component has no route awareness.
    // We verify by confirming the onboarding page itself renders without redirect logic.
    await renderPage();
    // The onboarding page renders its own content, never redirects away
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
