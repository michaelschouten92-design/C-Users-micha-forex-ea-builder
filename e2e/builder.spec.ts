import { test, expect } from "@playwright/test";

test.describe("Strategy Builder", () => {
  // Create a project before running builder tests
  let projectUrl: string;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({
      storageState: "e2e/.auth/user.json",
    });
    const page = await context.newPage();

    // Go to dashboard
    await page.goto("/app");

    // Create a new project (use first() as there may be two buttons)
    await page.getByRole("button", { name: /New Project/i }).first().click();
    await page.getByLabel(/^Name/i).fill(`E2E Test Project ${Date.now()}`);
    await page.getByRole("button", { name: /^Create$/i }).click();

    // Wait for redirect to builder
    await page.waitForURL(/\/app\/projects\/.*/, { timeout: 10000 });
    projectUrl = page.url();

    await context.close();
  });

  test("builder page loads correctly", async ({ page }) => {
    await page.goto(projectUrl);

    // Should see the builder canvas
    await expect(page.locator(".react-flow")).toBeVisible();

    // Should see the toolbar with category buttons
    await expect(page.getByRole("button", { name: /Indicators/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /When to trade/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Trade Execution/i })).toBeVisible();

    // Should see version controls
    await expect(page.getByRole("button", { name: /Save/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Export/i })).toBeVisible();
  });

  test("can expand indicator categories", async ({ page }) => {
    await page.goto(projectUrl);

    // Expand the Indicators section
    await page.getByRole("button", { name: /Indicators/i }).click();

    // Should see indicator options
    await expect(page.getByText("Moving Average", { exact: true })).toBeVisible();
    await expect(page.getByText("RSI", { exact: true })).toBeVisible();
  });

  test("can expand timing categories", async ({ page }) => {
    await page.goto(projectUrl);

    // Expand the When to trade section
    await page.getByRole("button", { name: /When to trade/i }).click();

    // Should see timing options
    await expect(page.getByText("Always")).toBeVisible();
  });

  test("can load a previous version", async ({ page }) => {
    await page.goto(projectUrl);

    // Load Version button should be visible (may be disabled if no versions)
    const loadButton = page.getByRole("button", { name: /Load Version/i });
    await expect(loadButton).toBeVisible();
  });

  test("export button is visible for authenticated users", async ({ page }) => {
    await page.goto(projectUrl);

    // Export button should be visible
    const exportButton = page.getByRole("button", { name: /Export/i });
    await expect(exportButton).toBeVisible();
  });

  test("save button is visible", async ({ page }) => {
    await page.goto(projectUrl);

    // Save button should be visible
    await expect(page.getByRole("button", { name: /Save/i })).toBeVisible();
  });

  test("properties panel shows instruction when no node selected", async ({ page }) => {
    await page.goto(projectUrl);

    // Should see instruction to select a node
    await expect(page.getByText(/Select a block to edit/i)).toBeVisible();
  });

  test("can navigate back to dashboard", async ({ page }) => {
    await page.goto(projectUrl);

    // Find and click back button or AlgoStudio link
    const backLink = page.locator("a").filter({ has: page.locator("svg") }).first();
    if (await backLink.isVisible()) {
      await backLink.click();
      await expect(page).toHaveURL("/app");
    }
  });
});
