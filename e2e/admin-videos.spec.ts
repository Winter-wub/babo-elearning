import { test, expect } from "@playwright/test";
import { loginAsAdmin, VIDEO_TITLES } from "./helpers";

// ---------------------------------------------------------------------------
// Admin video management
// ---------------------------------------------------------------------------

test.describe("Admin — Video Management", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/videos");
    await page.waitForSelector('[data-testid="videos-table"]', { timeout: 10_000 });
  });

  // -------------------------------------------------------------------------
  // Listing
  // -------------------------------------------------------------------------

  test("video management page renders heading and table", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Video Management" })).toBeVisible();
    await expect(page.getByTestId("videos-table")).toBeVisible();
  });

  test("seeded videos are visible in the table", async ({ page }) => {
    await expect(page.getByText(VIDEO_TITLES.intro)).toBeVisible();
    await expect(page.getByText(VIDEO_TITLES.advanced)).toBeVisible();
  });

  test("table shows Active status badges for seeded videos", async ({ page }) => {
    const activeBadges = page.getByRole("cell", {}).filter({ hasText: /^Active$/ });
    await expect(activeBadges.first()).toBeVisible();
  });

  test("table shows formatted durations", async ({ page }) => {
    // "Introduction to Web Development" is 1800s = 30:00
    await expect(page.getByText("30:00")).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Search
  // -------------------------------------------------------------------------

  test("search filters videos by title", async ({ page }) => {
    await page.getByPlaceholder("Search by title…").fill("React");
    await page.waitForURL(/search=React/);
    await expect(page.getByText(VIDEO_TITLES.advanced)).toBeVisible();
    await expect(page.getByText(VIDEO_TITLES.intro)).not.toBeVisible();
  });

  test("search with no match shows empty state", async ({ page }) => {
    await page.getByPlaceholder("Search by title…").fill("zzznomatch999");
    await page.waitForURL(/search=zzznomatch999/);
    await expect(page.getByText(/no videos found/i)).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Upload navigation
  // -------------------------------------------------------------------------

  test("Upload Video button navigates to upload page", async ({ page }) => {
    await page.getByRole("link", { name: "Upload Video" }).click();
    await expect(page).toHaveURL("/admin/videos/upload");
    await expect(page.getByRole("heading", { name: "Upload Video" })).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Upload page structure
  // -------------------------------------------------------------------------

  test("upload page has the drag-and-drop zone", async ({ page }) => {
    await page.goto("/admin/videos/upload");
    await expect(
      page.getByRole("button", { name: /drop video file here/i })
    ).toBeVisible();
    await expect(page.getByText(/drag and drop a video file/i)).toBeVisible();
  });

  test("upload page back button returns to /admin/videos", async ({ page }) => {
    await page.goto("/admin/videos/upload");
    await page.getByRole("link", { name: /back to videos/i }).click();
    await expect(page).toHaveURL("/admin/videos");
  });

  // -------------------------------------------------------------------------
  // Row actions — navigate to detail
  // -------------------------------------------------------------------------

  test("clicking video title link navigates to video detail page", async ({ page }) => {
    await page.getByRole("link", { name: VIDEO_TITLES.intro }).click();
    await page.waitForURL(/\/admin\/videos\/.+/);
    await expect(page).toHaveURL(/\/admin\/videos\/.+/);
  });

  test("row actions menu contains Edit and Deactivate options", async ({ page }) => {
    const firstActionBtn = page
      .getByRole("button", { name: new RegExp(`Actions for ${VIDEO_TITLES.intro}`, "i") });
    await firstActionBtn.click();

    await expect(page.getByRole("menuitem", { name: "Edit" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Deactivate" })).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Deactivate / reactivate
  // -------------------------------------------------------------------------

  test("admin can deactivate and reactivate a video", async ({ page }) => {
    // Deactivate "Advanced React Patterns" (won't affect Alice's test videos in other specs)
    const advancedActionBtn = page
      .getByRole("button", { name: new RegExp(`Actions for ${VIDEO_TITLES.advanced}`, "i") });

    await advancedActionBtn.click();
    await page.getByRole("menuitem", { name: "Deactivate" }).click();
    await expect(page.getByText(/video deactivated/i)).toBeVisible({ timeout: 8_000 });

    // Re-activate to keep DB state clean
    await advancedActionBtn.click();
    await page.getByRole("menuitem", { name: "Activate" }).click();
    await expect(page.getByText(/video activated/i)).toBeVisible({ timeout: 8_000 });
  });

  // -------------------------------------------------------------------------
  // Status filter
  // -------------------------------------------------------------------------

  test("status filter shows only active videos", async ({ page }) => {
    await page.getByRole("combobox").filter({ hasText: /all status/i }).click();
    await page.getByRole("option", { name: "Active" }).click();
    await page.waitForURL(/isActive=true/);
    // Both seeded videos are active so both should still appear
    await expect(page.getByText(VIDEO_TITLES.intro)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Video detail / edit page
// ---------------------------------------------------------------------------

test.describe("Admin — Video Detail Page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/videos");
    await page.waitForSelector('[data-testid="videos-table"]', { timeout: 10_000 });
    // Navigate to the first video's detail page
    await page.getByRole("link", { name: VIDEO_TITLES.intro }).click();
    await page.waitForURL(/\/admin\/videos\/.+/);
  });

  test("video detail page renders title and edit form", async ({ page }) => {
    await expect(page.getByTestId("video-edit-form")).toBeVisible();
    // The title field should be pre-populated with the video's current title
    await expect(page.getByLabel("Title")).toHaveValue(VIDEO_TITLES.intro);
  });

  test("admin can edit video title and save", async ({ page }) => {
    const titleInput = page.getByLabel("Title");
    const originalTitle = await titleInput.inputValue();

    await titleInput.fill("Updated Intro Title");
    await page.getByRole("button", { name: /save/i }).click();
    await expect(page.getByText(/saved|updated/i)).toBeVisible({ timeout: 8_000 });

    // Revert
    await titleInput.fill(originalTitle);
    await page.getByRole("button", { name: /save/i }).click();
  });

  test("back button returns to /admin/videos", async ({ page }) => {
    await page.getByRole("link", { name: /back to videos/i }).click();
    await expect(page).toHaveURL("/admin/videos");
  });
});
