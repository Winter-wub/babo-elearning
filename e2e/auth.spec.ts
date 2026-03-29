import { test, expect } from "@playwright/test";
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  STUDENTS,
  loginAsAdmin,
  loginAsStudent,
  logout,
} from "./helpers";

// ---------------------------------------------------------------------------
// Authentication flows
// ---------------------------------------------------------------------------

test.describe("Login", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("page renders sign-in form", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });

  test("admin login lands on /admin/dashboard", async ({ page }) => {
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("/admin/dashboard");
    await expect(page).toHaveURL("/admin/dashboard");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });

  test("student login lands on /dashboard", async ({ page }) => {
    await page.getByLabel("Email").fill(STUDENTS.alice.email);
    await page.getByLabel("Password").fill(STUDENTS.alice.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("/dashboard");
    await expect(page).toHaveURL("/dashboard");
    await expect(page.getByRole("heading", { name: "My Videos" })).toBeVisible();
  });

  test("wrong password shows error alert", async ({ page }) => {
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByRole("alert")).toContainText(/invalid email or password/i);
    await expect(page).toHaveURL("/login");
  });

  test("non-existent email shows error alert", async ({ page }) => {
    await page.getByLabel("Email").fill("nobody@nowhere.com");
    await page.getByLabel("Password").fill("SomePass1!");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByRole("alert")).toContainText(/invalid email or password/i);
    await expect(page).toHaveURL("/login");
  });

  test("client-side validation fires for empty email", async ({ page }) => {
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText(/email is required/i)).toBeVisible();
  });

  test("client-side validation fires for short password", async ({ page }) => {
    await page.getByLabel("Email").fill("test@example.com");
    await page.getByLabel("Password").fill("abc");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText(/at least 6 characters/i)).toBeVisible();
  });

  test("register link navigates to /register", async ({ page }) => {
    await page.getByRole("link", { name: "Register" }).click();
    await expect(page).toHaveURL("/register");
  });
});

// ---------------------------------------------------------------------------
// Registration flows
// ---------------------------------------------------------------------------

test.describe("Register", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/register");
  });

  test("page renders registration form", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Create an account" })).toBeVisible();
    await expect(page.getByLabel("Full name")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByLabel("Confirm password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Create account" })).toBeVisible();
  });

  test("register new student -> auto-login -> /dashboard", async ({ page }) => {
    // Use a unique email so re-runs don't clash (seed uses upsert but register does not)
    const uniqueEmail = `e2e-new-${Date.now()}@example.com`;

    await page.getByLabel("Full name").fill("E2E Test User");
    await page.getByLabel("Email").fill(uniqueEmail);
    await page.getByLabel("Password").fill("TestPass1!");
    await page.getByLabel("Confirm password").fill("TestPass1!");
    await page.getByRole("button", { name: "Create account" }).click();

    await page.waitForURL("/dashboard", { timeout: 15_000 });
    await expect(page).toHaveURL("/dashboard");
  });

  test("register with existing email shows error", async ({ page }) => {
    await page.getByLabel("Full name").fill("Duplicate User");
    await page.getByLabel("Email").fill(STUDENTS.alice.email); // already seeded
    await page.getByLabel("Password").fill("TestPass1!");
    await page.getByLabel("Confirm password").fill("TestPass1!");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page).toHaveURL("/register");
  });

  test("password mismatch shows validation error", async ({ page }) => {
    await page.getByLabel("Full name").fill("Mismatch User");
    await page.getByLabel("Email").fill("mismatch@example.com");
    await page.getByLabel("Password").fill("TestPass1!");
    await page.getByLabel("Confirm password").fill("DifferentPass1!");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.getByText(/passwords do not match/i)).toBeVisible();
    await expect(page).toHaveURL("/register");
  });

  test("short name shows validation error", async ({ page }) => {
    await page.getByLabel("Full name").fill("A"); // too short
    await page.getByLabel("Email").fill("short@example.com");
    await page.getByLabel("Password").fill("TestPass1!");
    await page.getByLabel("Confirm password").fill("TestPass1!");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.getByText(/at least 2 characters/i)).toBeVisible();
  });

  test("sign-in link navigates to /login", async ({ page }) => {
    await page.getByRole("link", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/login");
  });
});

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

test.describe("Logout", () => {
  test("logout from student session redirects to /login", async ({ page }) => {
    await loginAsStudent(page);
    await logout(page);
    await expect(page).toHaveURL("/login");
  });

  test("logout from admin session redirects to /login", async ({ page }) => {
    await loginAsAdmin(page);
    await logout(page);
    await expect(page).toHaveURL("/login");
  });
});

// ---------------------------------------------------------------------------
// Unauthenticated access
// ---------------------------------------------------------------------------

test.describe("Unauthenticated access", () => {
  test("accessing /dashboard redirects unauthenticated user to /login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("accessing /admin/dashboard redirects unauthenticated user to /login", async ({ page }) => {
    await page.goto("/admin/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("accessing /admin/users redirects unauthenticated user to /login", async ({ page }) => {
    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/login/);
  });
});

// ---------------------------------------------------------------------------
// Already-authenticated redirect away from auth pages
// ---------------------------------------------------------------------------

test.describe("Authenticated redirect", () => {
  test("authenticated admin visiting /login is redirected away", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/login");
    // Should not stay on /login — middleware redirects authenticated users
    await expect(page).not.toHaveURL("/login");
  });

  test("authenticated student visiting /login is redirected away", async ({ page }) => {
    await loginAsStudent(page);
    await page.goto("/login");
    await expect(page).not.toHaveURL("/login");
  });

  test("authenticated admin visiting /register is redirected away", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/register");
    await expect(page).not.toHaveURL("/register");
  });
});
