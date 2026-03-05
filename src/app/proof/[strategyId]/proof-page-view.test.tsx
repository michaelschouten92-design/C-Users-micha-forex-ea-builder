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
