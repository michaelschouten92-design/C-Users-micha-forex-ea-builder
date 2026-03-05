import { describe, it, expect, vi, beforeEach } from "vitest";

// ── mocks ────────────────────────────────────────────────────────────
const mockFindUnique = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    verifiedStrategyPage: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
}));

// next/navigation: redirect() and notFound() throw special sentinels
const mockRedirect = vi.fn().mockImplementation((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
const mockNotFound = vi.fn().mockImplementation(() => {
  throw new Error("NEXT_NOT_FOUND");
});

vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
  notFound: (...args: unknown[]) => mockNotFound(...args),
}));

// ── import after mocks ──────────────────────────────────────────────
import ProofShortUrl from "./page";

function callPage(code: string) {
  return ProofShortUrl({ params: Promise.resolve({ code }) });
}

// ── tests ────────────────────────────────────────────────────────────
describe("/p/[code] redirect route", () => {
  beforeEach(() => vi.clearAllMocks());

  // A1 — public slug redirects to /proof/{strategyId}
  it("redirects to /proof/{strategyId} for a public slug", async () => {
    mockFindUnique.mockResolvedValue({
      isPublic: true,
      strategyIdentity: { strategyId: "AS-10F10DCA" },
    });

    await expect(callPage("demo")).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/proof/AS-10F10DCA");
  });

  // A1 variant — AS-prefixed codes passthrough without DB lookup
  it("redirects directly for AS-prefixed strategy IDs", async () => {
    await expect(callPage("AS-abc12345")).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/proof/AS-ABC12345");
    // No DB call should have been made
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  // A2 — unknown slug returns 404
  it("returns 404 for unknown slug", async () => {
    mockFindUnique.mockResolvedValue(null);

    await expect(callPage("nonexistent")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mockNotFound).toHaveBeenCalled();
  });

  // A3 — slug exists but isPublic=false returns 404 (no leak)
  it("returns 404 when slug exists but isPublic is false", async () => {
    mockFindUnique.mockResolvedValue({
      isPublic: false,
      strategyIdentity: { strategyId: "AS-SECRET01" },
    });

    await expect(callPage("private-slug")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mockNotFound).toHaveBeenCalled();
    // Must NOT have called redirect (would leak strategyId)
    expect(mockRedirect).not.toHaveBeenCalledWith(expect.stringContaining("AS-SECRET01"));
  });
});
