import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for E2E testing
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./tests/e2e",
  /* Run tests serially to avoid conflicts with test users */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Run tests serially (one at a time) */
  workers: 1,
  /* Reporter to use */
  reporter: [
    ["html"],
    ["list"],
    ["json", { outputFile: "test-results/results.json" }],
  ],
  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: "http://localhost:5173",
    /* Collect trace when retrying the failed test */
    trace: "on-first-retry",
    /* Screenshot only on failure */
    screenshot: "only-on-failure",
    /* Video on retain failures */
    video: "retain-on-failure",
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
  },
});
