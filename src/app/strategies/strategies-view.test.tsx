"use client";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { StrategiesView } from "./strategies-view";

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

function makeItem(overrides: Record<string, unknown> = {}) {
  return {
    strategyId: "AS-10F10DCA",
    name: "Demo Strategy",
    slug: "demo",
    lifecycle: "RUN",
    ladderLevel: "SUBMITTED",
    profitFactor: 1.85,
    maxDrawdownPct: 12.3,
    tradeCount: 450,
    monteCarloSurvivalPct: 82,
    winRate: 0.63,
    updatedAt: "2025-06-01T00:00:00.000Z",
    ...overrides,
  };
}

function mockFetch(items: unknown[]) {
  global.fetch = vi.fn().mockResolvedValue({
    json: () => Promise.resolve({ items }),
  });
}

describe("StrategiesView", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // B7 — empty state renders without crash
  it("renders empty state when API returns zero items", async () => {
    mockFetch([]);
    render(<StrategiesView />);

    await waitFor(() => {
      expect(
        screen.getByText("No verified strategies match the criteria yet.")
      ).toBeInTheDocument();
    });
  });

  // B8 — table headings render when items exist
  it("renders table column headers when items exist", async () => {
    mockFetch([makeItem()]);
    render(<StrategiesView />);

    await waitFor(() => {
      // Strategy name appears in both table + mobile card; just confirm it's present
      expect(screen.getAllByText("Demo Strategy").length).toBeGreaterThanOrEqual(1);
    });
    // Column headers are unique to the table <th> elements
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Ladder")).toBeInTheDocument();
    expect(screen.getByText("Max DD")).toBeInTheDocument();
  });

  // B9 — slug link prefers /p/{slug}
  it("links to /p/{slug} when slug exists", async () => {
    mockFetch([makeItem({ slug: "my-slug" })]);
    render(<StrategiesView />);

    await waitFor(() => {
      expect(screen.getAllByText("Demo Strategy").length).toBeGreaterThanOrEqual(1);
    });
    // The desktop table <a> and mobile card <a> should both link to /p/my-slug
    const links = screen.getAllByText("Demo Strategy").map((el) => el.closest("a"));
    for (const link of links) {
      expect(link).toHaveAttribute("href", "/p/my-slug");
    }
  });

  // B10 — fallback link to /proof/{strategyId} when slug empty
  it("falls back to /proof/{strategyId} when slug is empty", async () => {
    mockFetch([makeItem({ slug: "", strategyId: "AS-ABCD1234" })]);
    render(<StrategiesView />);

    await waitFor(() => {
      expect(screen.getAllByText("Demo Strategy").length).toBeGreaterThanOrEqual(1);
    });
    const links = screen.getAllByText("Demo Strategy").map((el) => el.closest("a"));
    for (const link of links) {
      expect(link).toHaveAttribute("href", "/proof/AS-ABCD1234");
    }
  });

  // B7 — null-safe: fetch failure renders empty state
  it("renders empty state on fetch failure", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
    render(<StrategiesView />);

    await waitFor(() => {
      expect(
        screen.getByText("No verified strategies match the criteria yet.")
      ).toBeInTheDocument();
    });
  });

  // B11 — sorting: Profit Factor desc is default
  it("sorts by Profit Factor desc by default", async () => {
    mockFetch([
      makeItem({ strategyId: "AS-LOW00001", name: "Low PF", profitFactor: 1.3 }),
      makeItem({ strategyId: "AS-HIGH0001", name: "High PF", profitFactor: 2.5 }),
    ]);
    render(<StrategiesView />);

    await waitFor(() => {
      expect(screen.getAllByText("High PF").length).toBeGreaterThanOrEqual(1);
    });

    const rows = screen.getAllByRole("row");
    // rows[0] is header, rows[1] should be High PF (desc), rows[2] Low PF
    expect(rows[1]).toHaveTextContent("High PF");
    expect(rows[2]).toHaveTextContent("Low PF");
  });

  // B11 — sorting: Lowest Drawdown asc
  it("sorts by Lowest Drawdown asc when selected", async () => {
    mockFetch([
      makeItem({
        strategyId: "AS-HIGHDD01",
        name: "High DD",
        maxDrawdownPct: 25.0,
        profitFactor: 1.5,
      }),
      makeItem({
        strategyId: "AS-LOWDD001",
        name: "Low DD",
        maxDrawdownPct: 5.0,
        profitFactor: 1.8,
      }),
    ]);
    render(<StrategiesView />);

    await waitFor(() => {
      expect(screen.getAllByText("High DD").length).toBeGreaterThanOrEqual(1);
    });

    // Default sort is PF desc → High DD (1.8) first, Low DD (1.5) second
    // After clicking "Lowest Drawdown" → Low DD (5.0) first, High DD (25.0) second
    fireEvent.click(screen.getByText("Lowest Drawdown"));

    const rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Low DD");
    expect(rows[2]).toHaveTextContent("High DD");
  });
});
