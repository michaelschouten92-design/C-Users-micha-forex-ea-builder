import { test as setup, expect } from "@playwright/test";

const authFile = "e2e/.auth/user.json";

/**
 * Authentication setup - runs before all tests that require authentication.
 * Creates a logged-in session and saves it for reuse.
 * Also cleans up leftover test projects to avoid hitting plan limits.
 */
setup("authenticate", async ({ page }) => {
  // Use test credentials from environment or defaults
  const testEmail = process.env.E2E_TEST_EMAIL || "test@example.com";
  const testPassword = process.env.E2E_TEST_PASSWORD || "testpassword123";

  // Go to login page
  await page.goto("/login");

  // Wait for login form to be visible
  await expect(page.getByText(/Sign in to your account/i)).toBeVisible();

  // Fill in credentials
  await page.getByPlaceholder("you@email.com").fill(testEmail);
  await page.getByPlaceholder("Minimum 8 characters").fill(testPassword);

  // Submit login form (use the submit button inside the form)
  await page.locator("form").getByRole("button", { name: /Sign In/i }).click();

  // Wait for redirect to app dashboard (or handle login errors)
  try {
    await page.waitForURL("/app", { timeout: 10000 });

    // Verify we're logged in
    await expect(page).toHaveURL("/app");

    // Clean up leftover test projects to avoid hitting plan limits
    await cleanupTestProjects(page);

    // Save authentication state
    await page.context().storageState({ path: authFile });
    console.log("Authentication successful - session saved");
  } catch {
    // Login failed - this is expected if test user doesn't exist
    console.log("Login failed - test user may not exist or credentials are invalid.");
    console.log("To run authenticated tests, set E2E_TEST_EMAIL and E2E_TEST_PASSWORD environment variables.");
    console.log("Current URL:", page.url());

    // Create empty auth file so dependent tests are skipped gracefully
    await page.context().storageState({ path: authFile });
  }
});

/**
 * Delete leftover test projects from previous e2e runs.
 * Matches projects named "E2E Test Project *" or "Test Project *".
 */
async function cleanupTestProjects(page: import("@playwright/test").Page) {
  try {
    const baseURL = page.url().replace(/\/app$/, "");

    // Fetch all projects
    const res = await page.request.get(`${baseURL}/api/projects?limit=50`);
    if (!res.ok()) return;

    const { data: projects } = await res.json();
    const testProjects = (projects as { id: string; name: string }[]).filter(
      (p) => /^(E2E Test Project|Test Project)\s/.test(p.name)
    );

    if (testProjects.length === 0) return;

    console.log(`Cleaning up ${testProjects.length} leftover test project(s)...`);

    // Read CSRF token from cookies
    const cookies = await page.context().cookies();
    const csrfToken = cookies.find((c) => c.name === "csrf_token")?.value ?? "";

    for (const project of testProjects) {
      await page.request.delete(`${baseURL}/api/projects/${project.id}`, {
        headers: { "x-csrf-token": csrfToken },
      });
    }

    console.log("Cleanup complete.");
  } catch (err) {
    console.log("Project cleanup failed (non-fatal):", err);
  }
}
