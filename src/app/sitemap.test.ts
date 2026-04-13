import { describe, it, expect, vi, beforeAll } from "vitest";

vi.mock("@/lib/blog/posts", () => ({
  getAllPosts: () => [{ slug: "test-post", date: "2025-01-01" }],
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    verifiedStrategyPage: {
      findMany: vi
        .fn()
        .mockResolvedValue([{ slug: "demo-strategy", updatedAt: new Date("2025-06-01") }]),
    },
    user: {
      findMany: vi.fn().mockResolvedValue([
        { handle: "trader1", lastLoginAt: new Date("2025-06-01") },
        { handle: null, lastLoginAt: null },
      ]),
    },
  },
}));

import sitemap from "./sitemap";

describe("sitemap", () => {
  let urls: string[] = [];
  beforeAll(async () => {
    const entries = await sitemap();
    urls = entries.map((e) => e.url);
  });

  // C12 — /strategies is included
  it("includes /strategies", () => {
    expect(urls).toContain("https://algo-studio.com/strategies");
  });

  // C13 — no /proof/[strategyId] dynamic entries
  it("does not include any /proof/ URLs", () => {
    const proofUrls = urls.filter((u) => u.includes("/proof/"));
    expect(proofUrls).toHaveLength(0);
  });

  // C13 — no /p/ short-URL entries
  it("does not include any /p/ short-URL entries", () => {
    const pUrls = urls.filter((u) => /\/p\/[^/]/.test(u));
    expect(pUrls).toHaveLength(0);
  });

  // Sanity — blog posts are included
  it("includes blog posts", () => {
    expect(urls).toContain("https://algo-studio.com/blog/test-post");
  });

  // Dynamic — public verified strategy pages are included
  it("includes public verified strategy pages", () => {
    expect(urls).toContain("https://algo-studio.com/strategy/demo-strategy");
  });

  // Dynamic — public trader profiles (with non-null handle) are included
  it("includes public trader profiles", () => {
    expect(urls).toContain("https://algo-studio.com/u/trader1");
  });

  // Dynamic — users with null handle are excluded
  it("excludes users without a handle", () => {
    const traderUrls = urls.filter((u) => u.startsWith("https://algo-studio.com/u/"));
    expect(traderUrls).toHaveLength(1);
  });
});
