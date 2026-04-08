import { describe, it, expect, vi, beforeEach } from "vitest";

// ── mocks ────────────────────────────────────────────────────────────
const mockFindUnique = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    strategyIdentity: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
}));

const mockNotFound = vi.fn().mockImplementation(() => {
  throw new Error("NEXT_NOT_FOUND");
});

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  notFound: (...args: unknown[]) => mockNotFound(...args),
}));

vi.mock("@/lib/proof/ladder", () => ({
  LADDER_META: {
    SUBMITTED: { label: "Submitted", color: "#7C8DB0", description: "Pending" },
    VALIDATED: { label: "Validated", color: "#F59E0B", description: "Validated" },
    VERIFIED: { label: "Verified", color: "#10B981", description: "Verified" },
    PROVEN: { label: "Proven", color: "#6366F1", description: "Proven" },
    INSTITUTIONAL: { label: "Institutional", color: "#8B5CF6", description: "Institutional" },
  },
}));

// Mock the client component — we only test server-side gating here
vi.mock("./proof-page-view", () => ({
  ProofPageView: () => null,
}));

import ProofPage, { generateMetadata, dynamic, revalidate } from "./page";

function callPage(strategyId: string) {
  return ProofPage({ params: Promise.resolve({ strategyId }) });
}

function callMetadata(strategyId: string) {
  return generateMetadata({ params: Promise.resolve({ strategyId }) });
}

// ── tests ────────────────────────────────────────────────────────────
describe("/proof/[strategyId] page server component", () => {
  beforeEach(() => vi.clearAllMocks());

  // B5 — unknown strategyId calls notFound()
  it("calls notFound for unknown strategyId", async () => {
    mockFindUnique.mockResolvedValue(null);

    await expect(callPage("AS-UNKNOWN1")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mockNotFound).toHaveBeenCalled();
  });

  // B6 — strategy exists but not public
  it("calls notFound when strategy exists but isPublic is false", async () => {
    mockFindUnique.mockResolvedValue({
      strategyId: "AS-PRIVATE1",
      publicPage: { isPublic: false },
    });

    await expect(callPage("AS-PRIVATE1")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mockNotFound).toHaveBeenCalled();
  });

  // B4 — public strategy renders without throwing
  it("renders for a public strategy without throwing", async () => {
    mockFindUnique.mockResolvedValue({
      strategyId: "AS-10F10DCA",
      publicPage: { isPublic: true },
    });

    // Should not throw — renders ProofPageView
    const result = await callPage("AS-10F10DCA");
    expect(result).toBeDefined();
  });

  // B4 — generateMetadata returns proper title for public strategy
  it("returns proper metadata for a public strategy", async () => {
    mockFindUnique.mockResolvedValue({
      strategyId: "AS-10F10DCA",
      project: { name: "Demo Strategy", description: "A demo." },
      publicPage: { isPublic: true, ladderLevel: "SUBMITTED" },
    });

    const meta = await callMetadata("AS-10F10DCA");
    expect(meta.title).toContain("Demo Strategy");
    expect(meta.title).toContain("Algo Studio");
  });

  // B5 — generateMetadata returns safe fallback for unknown strategy
  it("returns fallback metadata for unknown strategy", async () => {
    mockFindUnique.mockResolvedValue(null);

    const meta = await callMetadata("AS-UNKNOWN1");
    expect(meta.title).toBe("Strategy Not Found | Algo Studio");
  });

  // Caching exports
  it("exports force-dynamic and revalidate=0", () => {
    expect(dynamic).toBe("force-dynamic");
    expect(revalidate).toBe(0);
  });
});
