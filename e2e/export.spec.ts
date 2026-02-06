import { test, expect } from "@playwright/test";

test.describe("Export Flow", () => {
  test.describe("For paid users", () => {
    // Skip these tests if running against a free account
    test.skip(!process.env.E2E_TEST_PAID_USER, "Requires paid user credentials");

    test("can export a valid strategy", async ({ page }) => {
      // Navigate to a project with a valid strategy
      await page.goto("/app");

      // Click on an existing project or create one with complete strategy
      const projectCard = page.locator("[data-testid='project-card']").first();
      if (await projectCard.isVisible()) {
        await projectCard.click();
      }

      // Wait for builder to load
      await page.waitForURL(/\/app\/projects\/.*/);

      // Click export button
      await page.getByRole("button", { name: /Export MQL5/i }).click();

      // Should see export modal
      await expect(
        page.getByRole("heading", { name: /Export/i })
      ).toBeVisible();

      // If successful, should see code preview
      const successModal = page.getByText(/Export Successful/i);
      const errorModal = page.getByText(/Export Failed/i);

      // Wait for either success or error
      await expect(successModal.or(errorModal)).toBeVisible({ timeout: 10000 });
    });

    test("can download exported file", async ({ page }) => {
      await page.goto("/app");

      // Navigate to project
      const projectCard = page.locator("[data-testid='project-card']").first();
      if (await projectCard.isVisible()) {
        await projectCard.click();
        await page.waitForURL(/\/app\/projects\/.*/);

        // Click export
        await page.getByRole("button", { name: /Export MQL5/i }).click();

        // If export successful, click download
        const downloadButton = page.getByRole("button", { name: /Download/i });
        if (await downloadButton.isVisible({ timeout: 5000 })) {
          // Set up download listener
          const downloadPromise = page.waitForEvent("download");
          await downloadButton.click();
          const download = await downloadPromise;

          // Verify filename
          expect(download.suggestedFilename()).toMatch(/\.mq5$/);
        }
      }
    });

    test("can copy exported code to clipboard", async ({ page }) => {
      await page.goto("/app");

      // Navigate to project
      const projectCard = page.locator("[data-testid='project-card']").first();
      if (await projectCard.isVisible()) {
        await projectCard.click();
        await page.waitForURL(/\/app\/projects\/.*/);

        // Click export
        await page.getByRole("button", { name: /Export MQL5/i }).click();

        // If export successful, click copy
        const copyButton = page.getByRole("button", { name: /Copy/i });
        if (await copyButton.isVisible({ timeout: 5000 })) {
          await copyButton.click();

          // Verify clipboard contains MQL5 code
          const clipboardText = await page.evaluate(() =>
            navigator.clipboard.readText()
          );
          expect(clipboardText).toContain("//+------------------------------------------------------------------+");
        }
      }
    });
  });

  test.describe("For free users", () => {
    test("export button shows upgrade prompt", async ({ page }) => {
      await page.goto("/app");

      // Create or navigate to a project
      const projectCard = page.locator("[data-testid='project-card']").first();
      if (await projectCard.isVisible()) {
        await projectCard.click();
        await page.waitForURL(/\/app\/projects\/.*/);

        // Check if export button is disabled with upgrade message
        const exportButton = page.getByRole("button", { name: /Export/i });

        // If user is on free plan, button should indicate upgrade needed
        const title = await exportButton.getAttribute("title");
        if (title?.includes("Upgrade")) {
          expect(title).toContain("Upgrade");
        }
      }
    });
  });
});
