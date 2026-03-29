import { test, expect } from "@playwright/test";
import { loginAsAdmin, loginAsStudent } from "./helpers";

// ---------------------------------------------------------------------------
// Admin layout and navigation
// ---------------------------------------------------------------------------

test.describe("Admin navigation", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("admin sidebar shows Dashboard, Users, Videos links", async ({ page }) => {
    const sidebar = page.getByRole("navigation", { name: "Admin navigation" });
    await expect(sidebar.getByRole("link", { name: "Dashboard" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Users" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Videos" })).toBeVisible();
  });

  test("Dashboard link is marked as current on /admin/dashboard", async ({ page }) => {
    await page.goto("/admin/dashboard");
    const sidebar = page.getByRole("navigation", { name: "Admin navigation" });
    const dashboardLink = sidebar.getByRole("link", { name: "Dashboard" });
    await expect(dashboardLink).toHaveAttribute("aria-current", "page");
  });

  test("Users link is marked as current on /admin/users", async ({ page }) => {
    await page.goto("/admin/users");
    const sidebar = page.getByRole("navigation", { name: "Admin navigation" });
    await expect(
      sidebar.getByRole("link", { name: "Users" })
    ).toHaveAttribute("aria-current", "page");
  });

  test("Videos link is marked as current on /admin/videos", async ({ page }) => {
    await page.goto("/admin/videos");
    const sidebar = page.getByRole("navigation", { name: "Admin navigation" });
    await expect(
      sidebar.getByRole("link", { name: "Videos" })
    ).toHaveAttribute("aria-current", "page");
  });

  test("clicking Users sidebar link navigates to /admin/users", async ({ page }) => {
    const sidebar = page.getByRole("navigation", { name: "Admin navigation" });
    await sidebar.getByRole("link", { name: "Users" }).click();
    await expect(page).toHaveURL("/admin/users");
    await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();
  });

  test("clicking Videos sidebar link navigates to /admin/videos", async ({ page }) => {
    const sidebar = page.getByRole("navigation", { name: "Admin navigation" });
    await sidebar.getByRole("link", { name: "Videos" }).click();
    await expect(page).toHaveURL("/admin/videos");
    await expect(page.getByRole("heading", { name: "Video Management" })).toBeVisible();
  });

  test("clicking Dashboard sidebar link navigates to /admin/dashboard", async ({ page }) => {
    // Start somewhere else first
    await page.goto("/admin/users");
    const sidebar = page.getByRole("navigation", { name: "Admin navigation" });
    await sidebar.getByRole("link", { name: "Dashboard" }).click();
    await expect(page).toHaveURL("/admin/dashboard");
  });

  test("admin sidebar brand link navigates to /admin/dashboard", async ({ page }) => {
    await page.goto("/admin/users");
    // The brand logo link says "E-Learning Admin"
    const sidebar = page.getByRole("navigation", { name: "Admin navigation" });
    await sidebar.getByRole("link", { name: /e-learning admin/i }).click();
    await expect(page).toHaveURL("/admin/dashboard");
  });

  test("admin dashboard shows stat cards", async ({ page }) => {
    await expect(page.getByText("Total Users")).toBeVisible();
    await expect(page.getByText("Active Videos")).toBeVisible();
    await expect(page.getByText("Active Permissions")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Student layout and navigation
// ---------------------------------------------------------------------------

test.describe("Student navigation", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStudent(page);
  });

  test("student sidebar shows Dashboard and My Videos links", async ({ page }) => {
    const sidebar = page.getByRole("navigation", { name: "Student navigation" });
    await expect(sidebar.getByRole("link", { name: "Dashboard" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "My Videos" })).toBeVisible();
  });

  test("Dashboard link is marked as current on /dashboard", async ({ page }) => {
    const sidebar = page.getByRole("navigation", { name: "Student navigation" });
    await expect(
      sidebar.getByRole("link", { name: "Dashboard" })
    ).toHaveAttribute("aria-current", "page");
  });

  test("clicking My Videos sidebar link navigates to /videos", async ({ page }) => {
    const sidebar = page.getByRole("navigation", { name: "Student navigation" });
    await sidebar.getByRole("link", { name: "My Videos" }).click();
    await page.waitForURL("/videos");
    await expect(page).toHaveURL("/videos");
  });

  test("student sidebar brand link navigates to /dashboard", async ({ page }) => {
    await page.goto("/videos");
    const sidebar = page.getByRole("navigation", { name: "Student navigation" });
    await sidebar.getByRole("link", { name: /e-learning/i }).click();
    await expect(page).toHaveURL("/dashboard");
  });
});

// ---------------------------------------------------------------------------
// Header — user info and logout dropdown
// ---------------------------------------------------------------------------

test.describe("Header", () => {
  test("header shows user name and role for admin", async ({ page }) => {
    await loginAsAdmin(page);
    const header = page.getByRole("banner");
    // The user-menu button shows the name and role
    await expect(header.getByRole("button", { name: /user menu/i })).toBeVisible();
    await header.getByRole("button", { name: /user menu/i }).click();
    // Dropdown should show full name and email
    await expect(page.getByText("admin@elearning.com")).toBeVisible();
  });

  test("header shows user name and role for student", async ({ page }) => {
    await loginAsStudent(page);
    const header = page.getByRole("banner");
    await expect(header.getByRole("button", { name: /user menu/i })).toBeVisible();
    await header.getByRole("button", { name: /user menu/i }).click();
    await expect(page.getByText("alice@student.com")).toBeVisible();
  });

  test("dropdown shows Log out menu item", async ({ page }) => {
    await loginAsStudent(page);
    await page.getByRole("button", { name: /user menu/i }).click();
    await expect(page.getByRole("menuitem", { name: "Log out" })).toBeVisible();
  });

  test("clicking Log out in dropdown signs out and redirects to /login", async ({ page }) => {
    await loginAsStudent(page);
    await page.getByRole("button", { name: /user menu/i }).click();
    await page.getByRole("menuitem", { name: "Log out" }).click();
    await page.waitForURL("/login");
    await expect(page).toHaveURL("/login");
  });
});
