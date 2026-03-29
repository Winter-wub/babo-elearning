import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for the e-learning platform E2E test suite.
 *
 * - Targets Chromium only for speed in this MVP phase.
 * - Spins up `pnpm dev` automatically unless the server is already running.
 * - Screenshots are captured on failure; HTML report is generated after each run.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: {
    timeout: 8_000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }], ["list"]],

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },

  globalSetup: "./e2e/global-setup.ts",
});
