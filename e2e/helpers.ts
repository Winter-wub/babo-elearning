import { type Page, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Seed credentials — must match prisma/seed.ts exactly
// ---------------------------------------------------------------------------

export const ADMIN_EMAIL = "admin@elearning.com";
export const ADMIN_PASSWORD = "Admin123!";
export const ADMIN_NAME = "Admin";

export const STUDENTS = {
  alice: { email: "alice@student.com", password: "Student123!", name: "Alice Johnson" },
  bob: { email: "bob@student.com", password: "Student123!", name: "Bob Smith" },
  carol: { email: "carol@student.com", password: "Student123!", name: "Carol White" },
} as const;

/** Alice has 2 video permissions (intro + advanced react). */
export const STUDENT_WITH_VIDEOS = STUDENTS.alice;
/** Bob has 1 video permission (intro only). */
export const STUDENT_WITH_ONE_VIDEO = STUDENTS.bob;
/** Carol has no video permissions. */
export const STUDENT_WITH_NO_VIDEOS = STUDENTS.carol;

export const VIDEO_TITLES = {
  intro: "Introduction to Web Development",
  advanced: "Advanced React Patterns",
} as const;

// ---------------------------------------------------------------------------
// Login helpers
// ---------------------------------------------------------------------------

/**
 * Logs in as the seeded admin user and waits for the admin dashboard URL.
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/admin/dashboard", { timeout: 15_000 });
}

/**
 * Logs in as a student and waits for the student dashboard URL.
 *
 * Defaults to Alice (who has video permissions).
 */
export async function loginAsStudent(
  page: Page,
  email: string = STUDENT_WITH_VIDEOS.email,
  password: string = STUDENT_WITH_VIDEOS.password
): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/dashboard", { timeout: 15_000 });
}

/**
 * Clicks the user-menu avatar, then clicks "Log out", and waits for /login.
 */
export async function logout(page: Page): Promise<void> {
  await page.getByRole("button", { name: "User menu" }).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await page.waitForURL("/login", { timeout: 10_000 });
}

// ---------------------------------------------------------------------------
// Assertion helpers
// ---------------------------------------------------------------------------

/**
 * Asserts that the current URL matches the given path (ignoring query string).
 */
export async function expectPath(page: Page, path: string): Promise<void> {
  await expect(page).toHaveURL(new RegExp(`${path.replace(/\//g, "\\/")}(\\?.*)?$`));
}
