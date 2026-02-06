import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test("dashboard page loads for authenticated user", async ({ page }) => {
    await page.goto("/app");

    // Should see dashboard heading (h2 with "My Projects" text)
    await expect(page.locator("h2").filter({ hasText: "My Projects" })).toBeVisible();

    // Should see create project button (use first() as there may be two)
    await expect(
      page.getByRole("button", { name: /New Project/i }).first()
    ).toBeVisible();
  });

  test("can create a new project", async ({ page }) => {
    await page.goto("/app");

    // Click create project button (use first() as there may be two)
    await page.getByRole("button", { name: /New Project/i }).first().click();

    // Should see create project modal/form
    await expect(page.getByLabel(/^Name/i)).toBeVisible();

    // Fill in project name
    const projectName = `Test Project ${Date.now()}`;
    await page.getByLabel(/^Name/i).fill(projectName);

    // Submit form
    await page.getByRole("button", { name: /Create/i }).click();

    // Should redirect to builder or see project in list
    await page.waitForURL(/\/app\/projects\/.*/, { timeout: 10000 });

    // Should be on the project builder page (use heading to avoid strict mode)
    await expect(page.getByRole("heading", { name: projectName })).toBeVisible();
  });

  test("subscription panel shows current plan", async ({ page }) => {
    await page.goto("/app");

    // Should see subscription tier badge in nav (span with tier name)
    // The tier is shown in a span in the nav bar
    await expect(
      page.locator("nav span").filter({ hasText: /^(FREE|STARTER|PRO)$/i })
    ).toBeVisible();
  });

  test("can navigate to pricing from dashboard", async ({ page }) => {
    await page.goto("/app");

    // Find and click upgrade link
    const upgradeLink = page.getByRole("link", { name: /Upgrade|View Plans/i });
    if (await upgradeLink.isVisible()) {
      await upgradeLink.click();
      await expect(page).toHaveURL("/pricing");
    }
  });
});
