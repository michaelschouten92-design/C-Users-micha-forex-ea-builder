import { test, expect } from "@playwright/test";

test.describe("Public Pages", () => {
  test("landing page loads correctly", async ({ page }) => {
    await page.goto("/");

    // Check main heading
    await expect(
      page.getByRole("heading", { name: /Build Trading Bots/i })
    ).toBeVisible();

    // Check CTA buttons (use first() for duplicates)
    await expect(page.getByRole("link", { name: /Start Building Free/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /View Pricing/i }).first()).toBeVisible();

    // Check features section exists
    await expect(page.getByText(/Visual Strategy Builder/i).first()).toBeVisible();
  });

  test("pricing page loads correctly", async ({ page }) => {
    await page.goto("/pricing");

    // Check heading
    await expect(
      page.getByRole("heading", { name: /Simple, transparent pricing/i })
    ).toBeVisible();

    // Check all three plan headings are visible
    await expect(page.getByRole("heading", { name: "Free" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Starter" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pro" })).toBeVisible();

    // Check interval toggle
    await expect(page.getByRole("button", { name: /Monthly/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Yearly/i })).toBeVisible();
  });

  test("login page loads correctly", async ({ page }) => {
    await page.goto("/login");

    // Check heading
    await expect(page.getByText(/Sign in to your account/i)).toBeVisible();

    // Check form elements (actual placeholders from the form)
    await expect(page.getByPlaceholder("you@email.com")).toBeVisible();
    await expect(page.getByPlaceholder("Minimum 8 characters")).toBeVisible();
    // Use the submit button inside the form
    await expect(page.locator("form").getByRole("button", { name: /Sign In/i })).toBeVisible();
  });

  test("navigation from landing to pricing works", async ({ page }) => {
    await page.goto("/");

    // Click pricing link (use first() to avoid multiple matches)
    await page.getByRole("link", { name: /View Pricing/i }).first().click();

    // Should be on pricing page
    await expect(page).toHaveURL("/pricing");
    await expect(
      page.getByRole("heading", { name: /Simple, transparent pricing/i })
    ).toBeVisible();
  });

  test("navigation from landing to login works", async ({ page }) => {
    await page.goto("/");

    // Click login/sign in link in nav
    await page.getByRole("navigation").getByRole("link", { name: /Sign in/i }).click();

    // Should be on login page
    await expect(page).toHaveURL("/login");
  });

  test("unauthenticated user is redirected from /app to /login", async ({ page }) => {
    await page.goto("/app");

    // Should redirect to login
    await expect(page).toHaveURL("/login");
  });
});
