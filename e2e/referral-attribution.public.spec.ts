import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

/**
 * E2E verification of P0-1 fix: /register must read the referral cookie
 * server-side via cookies(), not via document.cookie (which can never see
 * httpOnly cookies and was silently dropping ALL credentials-signup
 * attributions).
 *
 * Flow:
 *   1. Visit `/?ref=<partnerCode>` so middleware writes the referral cookie.
 *   2. Navigate to `/register`.
 *   3. Inspect the rendered HTML for the partner code being passed through
 *      to the form (hidden input or visible state).
 *
 * Requires: Next dev server running at PLAYWRIGHT_BASE_URL, TEST_DATABASE_URL
 * pointing at the same DB, partner row seeded.
 */

const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? "" },
  },
});

let partnerCode: string;
let cleanupUserId: string;

test.beforeAll(async () => {
  const ref = `E2E${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const email = `e2e-partner-${ref.toLowerCase()}@test.local`;
  const user = await prisma.user.create({
    data: {
      email,
      authProviderId: `e2e_${email}`,
      referralCode: ref,
      subscription: { create: { tier: "PRO" } },
    },
  });
  await prisma.referralPartner.create({
    data: { userId: user.id, status: "ACTIVE", commissionBps: 2000 },
  });
  partnerCode = ref;
  cleanupUserId = user.id;
});

test.afterAll(async () => {
  await prisma.referralPartner.deleteMany({ where: { userId: cleanupUserId } });
  await prisma.user.delete({ where: { id: cleanupUserId } }).catch(() => undefined);
  await prisma.$disconnect();
});

test("?ref=CODE → middleware writes httpOnly cookie", async ({ page, context }) => {
  await page.goto(`/?ref=${partnerCode}`);

  const cookies = await context.cookies();
  const refCookie = cookies.find((c) => c.name === "referral_code");
  expect(refCookie, "middleware must set referral_code cookie").toBeTruthy();
  expect(refCookie?.value).toBe(partnerCode);
  expect(refCookie?.httpOnly).toBe(true);
});

test("/register reads cookie SERVER-side and embeds partner code in payload (P0-1)", async ({
  page,
  context,
}) => {
  // Seed the httpOnly cookie via the middleware
  await page.goto(`/?ref=${partnerCode}`);

  // Confirm the cookie is invisible to client JS — this is exactly why the
  // pre-fix `document.cookie.match(...)` regex returned ""
  const visibleToJs = await page.evaluate(() => document.cookie);
  expect(visibleToJs, "httpOnly cookie must NOT leak into document.cookie").not.toContain(
    partnerCode
  );

  // Navigate to /register and capture the rendered HTML. The server
  // component reads the cookie via cookies() and passes referralCode as a
  // prop into RegisterPageClient → RegisterFormInner. React's hydration
  // payload (Flight RSC chunks or window.__NEXT_DATA__) embeds prop values
  // somewhere in the HTML, so we can grep for the partner code there.
  const response = await page.goto("/register");
  expect(response?.status(), "/register must return 200").toBe(200);
  const body = await response!.text();

  // The partner code must appear in the served HTML — that's the proof
  // the server-side cookies() read worked. Pre-fix it would never appear
  // because the client read returned an empty string.
  expect(
    body.includes(partnerCode),
    `partnerCode "${partnerCode}" must appear in /register HTML payload`
  ).toBe(true);
});
