"use client";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ProofPageView } from "./proof-page-view";

// Mock next/link to render plain anchors
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    [k: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

function makeProofData(overrides: Record<string, unknown> = {}) {
  return {
    strategy: {
      name: "Demo Strategy",
      description: "A demo strategy.",
      strategyId: "AS-10F10DCA",
      slug: "demo",
      ownerHandle: null,
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-06-01T00:00:00.000Z",
      currentVersion: { versionNo: 1, fingerprint: "fp123" },
    },
    ladder: { level: "SUBMITTED", label: "Submitted", color: "#7C8DB0", description: "Pending" },
    backtestHealth: null,
    monteCarlo: null,
    instance: null,
    trackRecord: null,
    liveHealth: null,
    chain: null,
    equityCurve: [],
    liveMetrics: null,
    monitoring: null,
    ...overrides,
  };
}

function makeVerification(overrides: Record<string, unknown> = {}) {
  return {
    strategyId: "AS-10F10DCA",
    snapshotHash: "abc123def456ghij7890abcdef123456",
    baselineMetricsHash: "def456abc789klmn0123opqrst456789",
    tradeChainHead: "789abcdef012345678901234deadbeef",
    tradeChainLength: 1234,
    backtestTradeCount: 450,
    liveTradeCount: 120,
    ladderLevel: "VALIDATED",
    generatedAt: "2026-03-04T12:00:00.000Z",
    ...overrides,
  };
}

function mockFetchResponses(
  proofData: unknown,
  verificationData: unknown,
  opts: { verificationFails?: boolean } = {}
) {
  global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
    // Event POST calls — ignore
    if (init?.method === "POST") {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    }
    if (url.includes("/verification")) {
      if (opts.verificationFails) {
        return Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(verificationData) });
    }
    // /api/proof/{strategyId}
    return Promise.resolve({
      ok: proofData !== null,
      json: () => Promise.resolve(proofData),
    });
  });
}

describe("ProofPageView", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // B7 — "Verified by AlgoStudio" badge renders
  it("renders the 'Verified by AlgoStudio' badge", async () => {
    mockFetchResponses(makeProofData(), makeVerification());
    render(<ProofPageView strategyId="AS-10F10DCA" />);

    await waitFor(() => {
      expect(screen.getByText("Verified by AlgoStudio")).toBeInTheDocument();
    });
  });

  // B8 — Verification hash block renders with labels
  it("renders verification hash labels when data exists", async () => {
    mockFetchResponses(makeProofData(), makeVerification());
    render(<ProofPageView strategyId="AS-10F10DCA" />);

    await waitFor(() => {
      expect(screen.getByText("Verification Hashes")).toBeInTheDocument();
    });
    expect(screen.getByText("Snapshot Hash")).toBeInTheDocument();
    expect(screen.getByText("Baseline Hash")).toBeInTheDocument();
    expect(screen.getByText("Trade Chain Head")).toBeInTheDocument();
  });

  // B9 — Hash truncation (16 chars + "...")
  it("truncates hashes to 16 characters with ellipsis", async () => {
    mockFetchResponses(makeProofData(), makeVerification());
    render(<ProofPageView strategyId="AS-10F10DCA" />);

    await waitFor(() => {
      expect(screen.getByText("Verification Hashes")).toBeInTheDocument();
    });
    // snapshotHash "abc123def456ghij7890..." → first 16 chars = "abc123def456ghij"
    expect(screen.getByText(/abc123def456ghij\.\.\./)).toBeInTheDocument();
    // baselineMetricsHash first 16 = "def456abc789klmn"
    expect(screen.getByText(/def456abc789klmn\.\.\./)).toBeInTheDocument();
    // tradeChainHead first 16 = "789abcdef0123456"
    expect(screen.getByText(/789abcdef0123456\.\.\./)).toBeInTheDocument();
  });

  // B9 — Copy buttons exist for each hash
  it("renders copy buttons for each hash", async () => {
    mockFetchResponses(makeProofData(), makeVerification());
    render(<ProofPageView strategyId="AS-10F10DCA" />);

    await waitFor(() => {
      expect(screen.getByText("Verification Hashes")).toBeInTheDocument();
    });
    // Three copy buttons with "Copy to clipboard" title
    const copyButtons = screen.getAllByTitle("Copy to clipboard");
    expect(copyButtons.length).toBe(3);
  });

  // B10 — Download JSON button present
  it("renders the download verification data button", async () => {
    mockFetchResponses(makeProofData(), makeVerification());
    render(<ProofPageView strategyId="AS-10F10DCA" />);

    await waitFor(() => {
      expect(screen.getByText("Download verification data (JSON)")).toBeInTheDocument();
    });
  });

  // B10 — Download error fallback
  it("shows error message when download fails", async () => {
    mockFetchResponses(makeProofData(), makeVerification());
    render(<ProofPageView strategyId="AS-10F10DCA" />);

    await waitFor(() => {
      expect(screen.getByText("Download verification data (JSON)")).toBeInTheDocument();
    });

    // Now make verification fetch fail for the download click
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/verification")) {
        return Promise.resolve({ ok: false, status: 500 });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    fireEvent.click(screen.getByText("Download verification data (JSON)"));

    await waitFor(() => {
      expect(
        screen.getByText("Failed to download verification data. Please try again.")
      ).toBeInTheDocument();
    });
  });

  // B11 — Null states show "Verification hashes not available yet."
  it("shows null state when all verification hashes are null", async () => {
    mockFetchResponses(
      makeProofData(),
      makeVerification({
        snapshotHash: null,
        baselineMetricsHash: null,
        tradeChainHead: null,
      })
    );
    render(<ProofPageView strategyId="AS-10F10DCA" />);

    await waitFor(() => {
      expect(screen.getByText("Verification hashes not available yet.")).toBeInTheDocument();
    });
  });

  // B12 — Verification fetch uses correct URL (no accidental caching)
  it("fetches verification data from correct endpoint", async () => {
    mockFetchResponses(makeProofData(), makeVerification());
    render(<ProofPageView strategyId="AS-10F10DCA" />);

    await waitFor(() => {
      expect(screen.getByText("Verified by AlgoStudio")).toBeInTheDocument();
    });

    // Verify the verification endpoint was called with correct strategyId
    const fetchCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
    const verificationCalls = fetchCalls.filter(
      (c: unknown[]) => typeof c[0] === "string" && c[0].includes("/verification")
    );
    expect(verificationCalls.length).toBeGreaterThanOrEqual(1);
    expect(verificationCalls[0][0]).toBe("/api/proof/AS-10F10DCA/verification");
  });

  // B7 — badge always renders (even without verification data)
  it("renders badge even when verification fetch returns null", async () => {
    mockFetchResponses(makeProofData(), null, { verificationFails: true });
    render(<ProofPageView strategyId="AS-10F10DCA" />);

    await waitFor(() => {
      expect(screen.getByText("Verified by AlgoStudio")).toBeInTheDocument();
    });
  });
});

// ── Share Loop Tests ─────────────────────────────────────────────────

describe("ProofPageView — Share Loop", () => {
  let mockClipboard: { writeText: ReturnType<typeof vi.fn> };
  let mockWindowOpen: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockClipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
    Object.defineProperty(navigator, "clipboard", {
      value: mockClipboard,
      writable: true,
      configurable: true,
    });
    mockWindowOpen = vi.fn();
    vi.stubGlobal("open", mockWindowOpen);
  });

  // A1 — slug exists → share URL uses /p/{slug}
  it("Copy link uses /p/{slug} when slug exists", async () => {
    mockFetchResponses(makeProofData(), makeVerification());
    render(<ProofPageView strategyId="AS-10F10DCA" />);

    await waitFor(() => {
      expect(screen.getByText("Copy link")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Copy link"));

    await waitFor(() => {
      expect(mockClipboard.writeText).toHaveBeenCalledWith(expect.stringContaining("/p/demo"));
    });
    // Must not contain /proof/ fallback
    const copiedUrl = mockClipboard.writeText.mock.calls[0][0] as string;
    expect(copiedUrl).not.toContain("/proof/");
    // Must have protocol + origin (no double slashes beyond protocol)
    expect(copiedUrl).toMatch(/^https?:\/\/[^/]+\/p\/demo$/);
  });

  // A2 — slug missing → share URL falls back to /proof/{strategyId}
  it("Copy link uses /proof/{strategyId} when slug is empty", async () => {
    mockFetchResponses(
      makeProofData({
        strategy: {
          name: "No Slug Strategy",
          description: null,
          strategyId: "AS-NOSLUG01",
          slug: "",
          ownerHandle: null,
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-06-01T00:00:00.000Z",
          currentVersion: null,
        },
      }),
      makeVerification()
    );
    render(<ProofPageView strategyId="AS-NOSLUG01" />);

    await waitFor(() => {
      expect(screen.getByText("Copy link")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Copy link"));

    await waitFor(() => {
      expect(mockClipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining("/proof/AS-NOSLUG01")
      );
    });
    const copiedUrl = mockClipboard.writeText.mock.calls[0][0] as string;
    expect(copiedUrl).toMatch(/^https?:\/\/[^/]+\/proof\/AS-NOSLUG01$/);
  });

  // A3 — no double slashes, protocol present
  it("share URL has no double slashes beyond protocol", async () => {
    mockFetchResponses(makeProofData(), makeVerification());
    render(<ProofPageView strategyId="AS-10F10DCA" />);

    await waitFor(() => {
      expect(screen.getByText("Copy link")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Copy link"));

    await waitFor(() => {
      expect(mockClipboard.writeText).toHaveBeenCalled();
    });
    const url = mockClipboard.writeText.mock.calls[0][0] as string;
    // After removing protocol "://", no "//" should remain
    const afterProtocol = url.replace(/^https?:\/\//, "");
    expect(afterProtocol).not.toContain("//");
  });

  // B4 — X share URL uses intent endpoint with proper encoding
  it("Share on X opens x.com/intent/tweet with encoded url and text", async () => {
    mockFetchResponses(makeProofData(), makeVerification());
    render(<ProofPageView strategyId="AS-10F10DCA" />);

    await waitFor(() => {
      expect(screen.getByText("Share on X")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Share on X"));

    expect(mockWindowOpen).toHaveBeenCalledTimes(1);
    const openedUrl = mockWindowOpen.mock.calls[0][0] as string;
    expect(openedUrl).toContain("https://x.com/intent/tweet");
    expect(openedUrl).toContain("text=");
    expect(openedUrl).toContain("url=");
    // URL param must be encoded (contains %3A for ":" and %2F for "/")
    expect(openedUrl).toMatch(/url=[^&]*%3A%2F%2F/);
    // Must contain the /p/demo slug path encoded
    expect(openedUrl).toContain(encodeURIComponent("/p/demo"));
    // Target = _blank
    expect(mockWindowOpen.mock.calls[0][1]).toBe("_blank");
  });

  // B5 — Reddit share URL uses submit endpoint with proper encoding
  it("Share on Reddit opens reddit.com/submit with encoded url + title", async () => {
    mockFetchResponses(makeProofData(), makeVerification());
    render(<ProofPageView strategyId="AS-10F10DCA" />);

    await waitFor(() => {
      expect(screen.getByText("Share on Reddit")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Share on Reddit"));

    expect(mockWindowOpen).toHaveBeenCalledTimes(1);
    const openedUrl = mockWindowOpen.mock.calls[0][0] as string;
    expect(openedUrl).toContain("https://www.reddit.com/submit");
    expect(openedUrl).toContain("url=");
    expect(openedUrl).toContain("title=");
    // URL param properly encoded
    expect(openedUrl).toMatch(/url=[^&]*%3A%2F%2F/);
    // Title is encoded
    expect(openedUrl).toContain(encodeURIComponent("Verified strategy proof page"));
  });

  // B6 — Discord share copies formatted message with canonical URL
  it("Share to Discord copies message with canonical /p/{slug} URL", async () => {
    mockFetchResponses(makeProofData(), makeVerification());
    render(<ProofPageView strategyId="AS-10F10DCA" />);

    await waitFor(() => {
      expect(screen.getByText("Share to Discord")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Share to Discord"));

    await waitFor(() => {
      expect(mockClipboard.writeText).toHaveBeenCalled();
    });
    const discordText = mockClipboard.writeText.mock.calls[0][0] as string;
    // Contains strategy name in bold
    expect(discordText).toContain("**Demo Strategy**");
    // Contains the canonical URL with /p/demo
    expect(discordText).toContain("/p/demo");
    // Does NOT contain /proof/ fallback
    expect(discordText).not.toContain("/proof/");
  });

  // C7 — non-public strategy: share section does not render
  it("does not render share buttons when API returns null (private strategy)", async () => {
    mockFetchResponses(null, null, { verificationFails: true });
    render(<ProofPageView strategyId="AS-PRIVATE1" />);

    await waitFor(() => {
      expect(screen.getByText("Strategy Not Found")).toBeInTheDocument();
    });
    expect(screen.queryByText("Copy link")).not.toBeInTheDocument();
    expect(screen.queryByText("Share on X")).not.toBeInTheDocument();
    expect(screen.queryByText("Share on Reddit")).not.toBeInTheDocument();
    expect(screen.queryByText("Share to Discord")).not.toBeInTheDocument();
  });

  // C8 — no strategyId leaks in share URLs for private strategies
  it("does not expose any share URLs for private strategies", async () => {
    mockFetchResponses(null, null, { verificationFails: true });
    render(<ProofPageView strategyId="AS-SECRET01" />);

    await waitFor(() => {
      expect(screen.getByText("Strategy Not Found")).toBeInTheDocument();
    });
    // No clipboard calls, no window.open calls
    expect(mockClipboard.writeText).not.toHaveBeenCalled();
    expect(mockWindowOpen).not.toHaveBeenCalled();
  });

  // D9 — Clipboard success shows "Copied!"
  it("shows 'Copied!' after successful clipboard write", async () => {
    mockFetchResponses(makeProofData(), makeVerification());
    render(<ProofPageView strategyId="AS-10F10DCA" />);

    await waitFor(() => {
      expect(screen.getByText("Copy link")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Copy link"));

    await waitFor(() => {
      expect(screen.getByText("Copied!")).toBeInTheDocument();
    });
  });

  // D10 — Clipboard API unavailable does not crash
  it("does not crash when clipboard API is unavailable", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    mockFetchResponses(makeProofData(), makeVerification());
    render(<ProofPageView strategyId="AS-10F10DCA" />);

    await waitFor(() => {
      expect(screen.getByText("Copy link")).toBeInTheDocument();
    });

    // Should not throw
    expect(() => fireEvent.click(screen.getByText("Copy link"))).not.toThrow();
    // "Copied!" should NOT appear since clipboard is unavailable
    expect(screen.queryByText("Copied!")).not.toBeInTheDocument();
  });

  // D10 — Clipboard rejection does not crash
  it("does not crash when clipboard.writeText rejects", async () => {
    mockClipboard.writeText.mockRejectedValue(new Error("Permission denied"));
    mockFetchResponses(makeProofData(), makeVerification());
    render(<ProofPageView strategyId="AS-10F10DCA" />);

    await waitFor(() => {
      expect(screen.getByText("Copy link")).toBeInTheDocument();
    });

    // Should not throw
    expect(() => fireEvent.click(screen.getByText("Copy link"))).not.toThrow();

    // Wait a tick for the rejected promise to settle (no unhandled rejection)
    await waitFor(() => {
      expect(screen.queryByText("Copied!")).not.toBeInTheDocument();
    });
  });

  // D11 — All four share buttons are present and clickable
  it("renders all four share buttons", async () => {
    mockFetchResponses(makeProofData(), makeVerification());
    render(<ProofPageView strategyId="AS-10F10DCA" />);

    await waitFor(() => {
      expect(screen.getByText("Share this proof")).toBeInTheDocument();
    });
    expect(screen.getByText("Copy link")).toBeInTheDocument();
    expect(screen.getByText("Share on X")).toBeInTheDocument();
    expect(screen.getByText("Share on Reddit")).toBeInTheDocument();
    expect(screen.getByText("Share to Discord")).toBeInTheDocument();
  });

  // X and Reddit share also use /p/{slug} (canonical URL consistency)
  it("X and Reddit share URLs use /p/{slug} not /proof/", async () => {
    mockFetchResponses(makeProofData(), makeVerification());
    render(<ProofPageView strategyId="AS-10F10DCA" />);

    await waitFor(() => {
      expect(screen.getByText("Share on X")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Share on X"));
    const xUrl = mockWindowOpen.mock.calls[0][0] as string;
    expect(xUrl).toContain(encodeURIComponent("/p/demo"));
    expect(xUrl).not.toContain(encodeURIComponent("/proof/"));

    fireEvent.click(screen.getByText("Share on Reddit"));
    const redditUrl = mockWindowOpen.mock.calls[1][0] as string;
    expect(redditUrl).toContain(encodeURIComponent("/p/demo"));
    expect(redditUrl).not.toContain(encodeURIComponent("/proof/"));
  });

  // Discord share also does not crash when clipboard unavailable
  it("Discord share does not crash when clipboard is unavailable", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    mockFetchResponses(makeProofData(), makeVerification());
    render(<ProofPageView strategyId="AS-10F10DCA" />);

    await waitFor(() => {
      expect(screen.getByText("Share to Discord")).toBeInTheDocument();
    });

    expect(() => fireEvent.click(screen.getByText("Share to Discord"))).not.toThrow();
  });
});
