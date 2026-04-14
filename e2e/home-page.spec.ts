/**
 * E2E tests for the home page rebuild (Phase 5).
 *
 * These tests run against the live dev server (baseURL: http://localhost:3000)
 * and cover the public home page — no authentication is required.
 *
 * Conventions followed from existing E2E files:
 * - import { test, expect } from "@playwright/test"
 * - test.describe() / test() blocks
 * - page.goto() in beforeEach when all tests in a describe share the same page
 * - Prefer role/label selectors; fall back to data-testid / CSS selectors
 * - test.skip() for tests that require seed data that is not guaranteed
 */

import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Shared setup — navigate to the home page before every describe block
// ---------------------------------------------------------------------------

test.describe("Home page — Navbar", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("logo link is visible and points to /", async ({ page }) => {
    // The logo is a link inside the header; its accessible name comes from the
    // visible text "E-Learning" alongside the GraduationCap icon
    const logo = page
      .getByRole("banner")
      .getByRole("link", { name: /e-learning/i })
      .first();
    await expect(logo).toBeVisible();
    const href = await logo.getAttribute("href");
    // Next.js may render href as "/" or "/"
    expect(href).toBe("/");
  });

  test('"Login" link is visible when unauthenticated', async ({ page }) => {
    // The desktop nav contains the Login button
    await expect(
      page.getByRole("link", { name: "Login" }).first()
    ).toBeVisible();
  });

  test('"Register" link is visible when unauthenticated', async ({ page }) => {
    await expect(
      page.getByRole("link", { name: "Register" }).first()
    ).toBeVisible();
  });

  test('"Courses" nav element is visible in the desktop header', async ({
    page,
  }) => {
    // NavCoursesDropdown renders a button or link labelled "Courses" in the
    // desktop center nav — visible at default (1280 px) viewport
    const coursesEl = page.getByRole("banner").getByText(/courses/i).first();
    await expect(coursesEl).toBeVisible();
  });

  test("at mobile viewport (375 px): hamburger button is visible", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    const hamburger = page.getByRole("button", {
      name: /open navigation menu/i,
    });
    await expect(hamburger).toBeVisible();
  });

  test("at mobile viewport (375 px): desktop nav links are hidden", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    // The desktop nav has aria-label="Main navigation" and class "hidden … md:flex"
    // At 375 px the md breakpoint is not reached so it should not be visible
    const desktopNav = page.getByRole("navigation", {
      name: "Main navigation",
    });
    await expect(desktopNav).toBeHidden();
  });

  test("at mobile viewport: clicking hamburger opens a drawer containing nav links", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");

    const hamburger = page.getByRole("button", {
      name: /open navigation menu/i,
    });
    await hamburger.click();

    // The sheet/drawer includes a mobile navigation landmark
    const mobileNav = page.getByRole("navigation", {
      name: "Mobile navigation",
    });
    await expect(mobileNav).toBeVisible();

    // At least the "Home" link should be present inside the drawer
    await expect(mobileNav.getByRole("link", { name: "Home" })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Carousel
// ---------------------------------------------------------------------------

test.describe("Home page — Hero section", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test('data-testid="hero-section" is visible', async ({ page }) => {
    await expect(page.getByTestId("hero-section")).toBeVisible();
  });

  test("h1 heading is visible and non-empty", async ({ page }) => {
    const hero = page.getByTestId("hero-section");
    const h1 = hero.locator("h1");
    await expect(h1).toBeVisible();
    const text = await h1.innerText();
    expect(text.trim().length).toBeGreaterThan(0);
  });

  test("primary CTA link is visible", async ({ page }) => {
    const hero = page.getByTestId("hero-section");
    const ctaLink = hero.locator("a").first();
    await expect(ctaLink).toBeVisible();
  });

  test("stats strip shows at least one stat item", async ({ page }) => {
    const hero = page.getByTestId("hero-section");
    // Stats are rendered as bold text inside the hero section
    const statNumbers = hero.locator("span.font-bold");
    await expect(statNumbers.first()).toBeVisible();
  });

  test("no carousel navigation buttons are present", async ({ page }) => {
    const hero = page.getByTestId("hero-section");
    // Carousel prev/next buttons should not exist
    await expect(hero.getByRole("button", { name: "สไลด์ก่อนหน้า" })).toHaveCount(0);
    await expect(hero.getByRole("button", { name: "สไลด์ถัดไป" })).toHaveCount(0);
    // No dot indicators
    await expect(hero.getByRole("tab")).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// Trending section
// ---------------------------------------------------------------------------

test.describe("Home page — Trending section", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test('data-testid="trending-section" is present on the page', async ({
    page,
  }) => {
    await expect(page.getByTestId("trending-section")).toBeAttached();
  });

  test('"Top 10 Trending" heading is visible', async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /top 10 trending/i })
    ).toBeVisible();
  });

  // Requires seed data — skipped when the DB is not guaranteed to be seeded
  // with video records.  The test is still written so CI with a full seed
  // can run it by removing test.skip.
  test.skip("at least one ranked item is visible when seed data exists", async ({
    page,
  }) => {
    // The trending list uses an ordered list with aria-label="Trending videos"
    const list = page.getByRole("list", { name: "Trending videos" });
    const items = list.getByRole("listitem");
    await expect(items.first()).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

test.describe("Home page — Footer", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("footer element is present on the page", async ({ page }) => {
    await expect(page.locator("footer")).toBeAttached();
  });

  test("copyright text contains 'E-Learning'", async ({ page }) => {
    await expect(page.locator("footer")).toContainText(/e-learning/i);
  });

  test("copyright text contains the current year", async ({ page }) => {
    const currentYear = new Date().getFullYear().toString();
    await expect(page.locator("footer")).toContainText(currentYear);
  });

  test("YouTube social icon link has aria-label", async ({ page }) => {
    await expect(
      page.locator("footer").getByRole("link", { name: "YouTube" })
    ).toBeAttached();
  });

  test("Twitter / X social icon link has aria-label", async ({ page }) => {
    await expect(
      page.locator("footer").getByRole("link", { name: /twitter/i })
    ).toBeAttached();
  });

  test("LinkedIn social icon link has aria-label", async ({ page }) => {
    await expect(
      page.locator("footer").getByRole("link", { name: "LinkedIn" })
    ).toBeAttached();
  });

  test("Facebook social icon link has aria-label", async ({ page }) => {
    await expect(
      page.locator("footer").getByRole("link", { name: "Facebook" })
    ).toBeAttached();
  });

  test("all social icon links have non-empty aria-label attributes", async ({
    page,
  }) => {
    // Select all <a> inside the social icons row (the flex div after the grid)
    const socialLinks = await page
      .locator("footer a[aria-label]")
      .all();

    expect(socialLinks.length).toBeGreaterThanOrEqual(4);

    for (const link of socialLinks) {
      const label = await link.getAttribute("aria-label");
      expect(label).toBeTruthy();
      expect(label!.trim().length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// General page checks
// ---------------------------------------------------------------------------

test.describe("Home page — General", () => {
  test("page title / h1 is present", async ({ page }) => {
    await page.goto("/");
    // The carousel renders an h1 for the active slide headline
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("no console errors are emitted on initial page load", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/");
    // Allow the page to fully hydrate before checking
    await page.waitForLoadState("networkidle");

    // Filter out known browser-generated noise that is not application errors
    const appErrors = consoleErrors.filter(
      (text) =>
        // Ignore favicon 404s (common in dev)
        !text.includes("favicon") &&
        // Ignore hydration warnings that are acceptable in dev mode
        !text.includes("hydrat") &&
        // Ignore ResizeObserver loop limit exceeded (browser quirk)
        !text.includes("ResizeObserver")
    );

    expect(appErrors).toHaveLength(0);
  });

  test("page responds with a 200 status", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
  });
});
