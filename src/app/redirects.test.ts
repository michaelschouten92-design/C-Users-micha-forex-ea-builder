import { describe, it, expect } from "vitest";

/**
 * Structural test: verify that next.config redirect entries exist
 * for all consolidated marketing routes.
 *
 * These tests import the next.config redirects array and verify
 * the expected source→destination mappings are present.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const nextConfig = require("../../next.config.ts");

async function getRedirects(): Promise<
  Array<{ source: string; destination: string; permanent: boolean }>
> {
  const config = nextConfig.default ?? nextConfig;
  return config.redirects();
}

describe("next.config marketing consolidation redirects", () => {
  const expectedRedirects = [
    { source: "/compare-platforms", destination: "/product/how-it-works" },
    { source: "/compare-platforms/:slug", destination: "/product/how-it-works" },
    { source: "/templates", destination: "/product/mt5-export" },
    { source: "/templates/:slug", destination: "/product/mt5-export" },
    { source: "/trading-strategy-templates-mt5", destination: "/product/mt5-export" },
    { source: "/low-drawdown", destination: "/verified" },
    { source: "/top-robust", destination: "/verified" },
    { source: "/rising", destination: "/verified" },
    { source: "/coaching/thank-you", destination: "/contact" },
  ];

  for (const { source, destination } of expectedRedirects) {
    it(`${source} -> ${destination}`, async () => {
      const redirects = await getRedirects();
      const match = redirects.find((r) => r.source === source);
      expect(match).toBeDefined();
      expect(match!.destination).toBe(destination);
      expect(match!.permanent).toBe(true);
    });
  }
});

describe("stale redirects removed", () => {
  it("no /app/live -> /app/monitor redirect (was reversed)", async () => {
    const redirects = await getRedirects();
    const stale = redirects.find(
      (r) => r.source === "/app/live" && r.destination === "/app/monitor"
    );
    expect(stale).toBeUndefined();
  });

  it("/app/journal now points to /app/live (not /app/monitor)", async () => {
    const redirects = await getRedirects();
    const match = redirects.find((r) => r.source === "/app/journal");
    expect(match).toBeDefined();
    expect(match!.destination).toBe("/app/live");
  });
});
