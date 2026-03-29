import { test, expect } from "@playwright/test";
import { loginAsAdmin, STUDENTS } from "./helpers";

// ---------------------------------------------------------------------------
// Admin user management
// All tests in this describe block are pre-authenticated as admin.
// ---------------------------------------------------------------------------

test.describe("Admin — User Management", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/users");
    // Wait for the table to be populated (Suspense boundary resolves)
    await page.waitForSelector('[data-testid="users-table"]', { timeout: 10_000 });
  });

  // -------------------------------------------------------------------------
  // Listing
  // -------------------------------------------------------------------------

  test("users list page renders heading and table", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();
    await expect(page.getByTestId("users-table")).toBeVisible();
  });

  test("seeded users are visible in the table", async ({ page }) => {
    await expect(page.getByText(STUDENTS.alice.name)).toBeVisible();
    await expect(page.getByText(STUDENTS.bob.name)).toBeVisible();
    await expect(page.getByText(STUDENTS.carol.name)).toBeVisible();
  });

  test("table displays role badges for students and admin", async ({ page }) => {
    const studentBadges = page.getByRole("cell", {}).filter({ hasText: /^Student$/ });
    await expect(studentBadges.first()).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Search
  // -------------------------------------------------------------------------

  test("search filters users by name", async ({ page }) => {
    await page.getByPlaceholder("Search name or email…").fill("Alice");
    // Debounce: wait for URL to update
    await page.waitForURL(/search=Alice/);
    await expect(page.getByText(STUDENTS.alice.name)).toBeVisible();
    await expect(page.getByText(STUDENTS.bob.name)).not.toBeVisible();
  });

  test("search with no match shows empty state", async ({ page }) => {
    await page.getByPlaceholder("Search name or email…").fill("zzznomatch999");
    await page.waitForURL(/search=zzznomatch999/);
    await expect(page.getByText("No users found.")).toBeVisible();
  });

  test("search by email filters correctly", async ({ page }) => {
    await page.getByPlaceholder("Search name or email…").fill("bob@student");
    await page.waitForURL(/search=bob/);
    await expect(page.getByText(STUDENTS.bob.name)).toBeVisible();
    await expect(page.getByText(STUDENTS.alice.name)).not.toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Add user dialog
  // -------------------------------------------------------------------------

  test("clicking Add User opens dialog", async ({ page }) => {
    await page.getByRole("button", { name: "Add User" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Create New User" })).toBeVisible();
  });

  test("admin can add a new user via dialog", async ({ page }) => {
    const uniqueEmail = `e2e-admin-created-${Date.now()}@example.com`;

    await page.getByRole("button", { name: "Add User" }).click();
    await page.getByLabel("Full name").fill("E2E Created User");
    await page.getByLabel("Email").fill(uniqueEmail);
    await page.getByLabel("Password").fill("TestPass1!");

    // Role select defaults to Student — leave as-is
    await page.getByRole("button", { name: "Create User" }).click();

    // Dialog should close and success toast should appear
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/user created/i)).toBeVisible({ timeout: 8_000 });
  });

  test("create user dialog shows error for duplicate email", async ({ page }) => {
    await page.getByRole("button", { name: "Add User" }).click();
    await page.getByLabel("Full name").fill("Dup User");
    await page.getByLabel("Email").fill(STUDENTS.alice.email); // already exists
    await page.getByLabel("Password").fill("TestPass1!");
    await page.getByRole("button", { name: "Create User" }).click();

    // Dialog stays open with an error message
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog").getByText(/email/i)).toBeVisible();
  });

  test("cancel button closes the create dialog", async ({ page }) => {
    await page.getByRole("button", { name: "Add User" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Row actions — edit
  // -------------------------------------------------------------------------

  test("admin can open edit dialog from row actions", async ({ page }) => {
    // Open the row actions for Alice
    await page
      .getByRole("button", { name: "Row actions" })
      .first()
      .click();
    await page.getByRole("menuitem", { name: "Edit" }).click();

    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Edit User" })).toBeVisible();
  });

  test("admin can save changes in edit dialog", async ({ page }) => {
    // Edit the first user in the list
    await page
      .getByRole("button", { name: "Row actions" })
      .first()
      .click();
    await page.getByRole("menuitem", { name: "Edit" }).click();

    const nameInput = page.getByLabel("Full name");
    const currentName = await nameInput.inputValue();

    // Change name briefly and revert to original to keep data clean
    await nameInput.fill(currentName + " Edited");
    await page.getByRole("button", { name: "Save Changes" }).click();

    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/user updated/i)).toBeVisible({ timeout: 8_000 });
  });

  // -------------------------------------------------------------------------
  // Row actions — deactivate
  // -------------------------------------------------------------------------

  test("admin can deactivate a user", async ({ page }) => {
    // Open actions for the first active user that is NOT admin (use Carol)
    const carolRow = page.getByRole("row").filter({ hasText: STUDENTS.carol.name });
    await carolRow.getByRole("button", { name: "Row actions" }).click();
    await page.getByRole("menuitem", { name: "Deactivate" }).click();

    await expect(page.getByText(/user deactivated/i)).toBeVisible({ timeout: 8_000 });
    // Re-activate to keep DB clean for subsequent tests
    await carolRow.getByRole("button", { name: "Row actions" }).click();
    await page.getByRole("menuitem", { name: "Activate" }).click();
  });

  // -------------------------------------------------------------------------
  // Navigation to user detail
  // -------------------------------------------------------------------------

  test("clicking View Permissions navigates to user detail page", async ({ page }) => {
    const aliceRow = page.getByRole("row").filter({ hasText: STUDENTS.alice.name });
    await aliceRow.getByRole("button", { name: "Row actions" }).click();
    await page.getByRole("menuitem", { name: "View Permissions" }).click();

    await page.waitForURL(/\/admin\/users\/.+/);
    await expect(page).toHaveURL(/\/admin\/users\/.+/);
    await expect(page.getByText(STUDENTS.alice.name)).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // User detail — video permissions
  // -------------------------------------------------------------------------

  test("user detail page shows video permissions panel", async ({ page }) => {
    const aliceRow = page.getByRole("row").filter({ hasText: STUDENTS.alice.name });
    await aliceRow.getByRole("button", { name: "Row actions" }).click();
    await page.getByRole("menuitem", { name: "View Permissions" }).click();

    await page.waitForURL(/\/admin\/users\/.+/);
    await expect(page.getByRole("heading", { name: "Video Permissions" })).toBeVisible();
    // Alice should have 2 permissions (both seeded videos)
    await expect(page.getByText(/2 \/ 2 granted/i)).toBeVisible();
  });

  test("admin can toggle a video permission off and on for a user", async ({ page }) => {
    // Navigate directly to Alice's detail page via the table
    const aliceRow = page.getByRole("row").filter({ hasText: STUDENTS.alice.name });
    await aliceRow.getByRole("button", { name: "Row actions" }).click();
    await page.getByRole("menuitem", { name: "View Permissions" }).click();
    await page.waitForURL(/\/admin\/users\/.+/);

    // Find the switch for "Introduction to Web Development"
    const introSwitch = page.getByRole("switch", {
      name: /revoke access to Introduction to Web Development/i,
    });
    await expect(introSwitch).toBeVisible();
    await expect(introSwitch).toBeChecked();

    // Revoke
    await introSwitch.click();
    await expect(page.getByText(/1 \/ 2 granted/i)).toBeVisible({ timeout: 8_000 });

    // Re-grant to keep DB clean
    const grantSwitch = page.getByRole("switch", {
      name: /grant access to Introduction to Web Development/i,
    });
    await grantSwitch.click();
    await expect(page.getByText(/2 \/ 2 granted/i)).toBeVisible({ timeout: 8_000 });
  });

  // -------------------------------------------------------------------------
  // Pagination / filtering
  // -------------------------------------------------------------------------

  test("role filter shows only students", async ({ page }) => {
    // Use the role select to filter by Student
    await page.getByRole("combobox").filter({ hasText: /all roles/i }).click();
    await page.getByRole("option", { name: "Student" }).click();
    await page.waitForURL(/role=STUDENT/);

    // Admin user should no longer appear
    await expect(page.getByText("Admin")).not.toBeVisible();
  });
});
