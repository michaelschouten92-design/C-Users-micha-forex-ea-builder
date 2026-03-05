import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/blog/posts", () => ({
  getAllPosts: () => [{ slug: "test-post", date: "2025-01-01" }],
}));

import sitemap from "./sitemap";

describe("sitemap", () => {
  const entries = sitemap();
  const urls = entries.map((e) => e.url);

  // C12 — /strategies is included
  it("includes /strategies", () => {
    expect(urls).toContain("https://algo-studio.com/strategies");
  });

  // C13 — no /proof/[strategyId] dynamic entries
  it("does not include any /proof/ URLs", () => {
    const proofUrls = urls.filter((u) => u.includes("/proof/"));
    expect(proofUrls).toHaveLength(0);
  });

  // C13 — no /p/ dynamic entries
  it("does not include any /p/ short-URL entries", () => {
    const pUrls = urls.filter((u) => /\/p\/[^/]/.test(u));
    expect(pUrls).toHaveLength(0);
  });

  // Sanity — blog posts are included
  it("includes blog posts", () => {
    expect(urls).toContain("https://algo-studio.com/blog/test-post");
  });
});
