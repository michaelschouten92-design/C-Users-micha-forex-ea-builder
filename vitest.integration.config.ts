import { defineConfig } from "vitest/config";
import path from "path";

/**
 * Integration tests that exercise real Prisma against a live Postgres
 * (Neon dev branch). Kept in a separate config so they don't run by
 * default and don't pollute the unit-test timing.
 *
 * Usage: TEST_DATABASE_URL=postgres://... npx vitest run --config vitest.integration.config.ts
 */
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/integration/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    pool: "forks",
    // Load the DB URL override before any test module imports `@/lib/prisma`
    setupFiles: ["./tests/integration/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
