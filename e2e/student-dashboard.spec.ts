import { test, expect } from "@playwright/test";
import {
  loginAsStudent,
  STUDENT_WITH_VIDEOS,
  STUDENT_WITH_ONE_VIDEO,
  STUDENT_WITH_NO_VIDEOS,
  VIDEO_TITLES,
} from "./helpers";

// ---------------------------------------------------------------------------
// Student dashboard
// ---------------------------------------------------------------------------

test.describe("Student Dashboard — with permitted videos", () => {
  test.beforeEach(async ({ page }) => {
    // Log in as Alice (has 2 video permissions)
    await loginAsStudent(page, STUDENT_WITH_VIDEOS.email, STUDENT_WITH_VIDEOS.password);
  });

  test("page heading says My Videos", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "My Videos" })).toBeVisible();
  });

  test("subtitle shows correct video count", async ({ page }) => {
    // Alice has 2 permitted videos
    await expect(page.getByText(/2 videos available/i)).toBeVisible();
  });

  test("permitted videos are displayed as cards", async ({ page }) => {
    const videoList = page.getByRole("list", { name: "Video library" });
    await expect(videoList).toBeVisible();
    await expect(videoList.getByRole("link", { name: /watch Introduction to Web Development/i })).toBeVisible();
    await expect(videoList.getByRole("link", { name: /watch Advanced React Patterns/i })).toBeVisible();
  });

  test("search input is visible", async ({ page }) => {
    await expect(page.getByRole("searchbox", { name: "Search videos" })).toBeVisible();
  });

  test("search filters displayed videos", async ({ page }) => {
    const searchBox = page.getByRole("searchbox", { name: "Search videos" });
    await searchBox.fill("React");
    await expect(page.getByRole("link", { name: /watch Advanced React Patterns/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /watch Introduction to Web Development/i })).not.toBeVisible();
  });

  test("search with no match shows no-results state with clear button", async ({ page }) => {
    await page.getByRole("searchbox", { name: "Search videos" }).fill("zzznomatch999");
    await expect(page.getByText(/no results for/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /clear search/i })).toBeVisible();
  });

  test("clearing search restores the video list", async ({ page }) => {
    const searchBox = page.getByRole("searchbox", { name: "Search videos" });
    await searchBox.fill("zzznomatch999");
    await page.getByRole("button", { name: /clear search/i }).click();
    await expect(page.getByRole("list", { name: "Video library" })).toBeVisible();
  });

  test("video card links to the video player page", async ({ page }) => {
    await page.getByRole("link", { name: /watch Introduction to Web Development/i }).click();
    await page.waitForURL(/\/videos\/.+/);
    await expect(page).toHaveURL(/\/videos\/.+/);
  });
});

// ---------------------------------------------------------------------------
// Student with only one video
// ---------------------------------------------------------------------------

test.describe("Student Dashboard — Bob (one permitted video)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStudent(page, STUDENT_WITH_ONE_VIDEO.email, STUDENT_WITH_ONE_VIDEO.password);
  });

  test("subtitle shows 1 video available", async ({ page }) => {
    await expect(page.getByText(/1 video available/i)).toBeVisible();
  });

  test("only intro video is visible, not advanced react", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: /watch Introduction to Web Development/i })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /watch Advanced React Patterns/i })
    ).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Student with no videos (empty state)
// ---------------------------------------------------------------------------

test.describe("Student Dashboard — Carol (no permitted videos)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStudent(page, STUDENT_WITH_NO_VIDEOS.email, STUDENT_WITH_NO_VIDEOS.password);
  });

  test("empty state message is shown", async ({ page }) => {
    await expect(page.getByText(/no videos available/i)).toBeVisible();
  });

  test("video library list is not rendered when there are no videos", async ({ page }) => {
    await expect(page.getByRole("list", { name: "Video library" })).not.toBeVisible();
  });

  test("subtitle explains videos will appear when granted", async ({ page }) => {
    await expect(page.getByText(/your assigned videos will appear here/i)).toBeVisible();
  });
});
