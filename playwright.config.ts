import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',
  /* Maximum time one test can run for. */
  timeout: 60000,
  expect: {
    /**
     * Maximum time expect() should wait for the condition to be met.
     */
    timeout: 15000
  },
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Cap workers so the Next.js dev server isn't overwhelmed.
   * Under heavy parallelism (8+ workers) React hydration is delayed past
   * click-timeout windows because the dev server queues JS bundle requests.
   * 3 local workers keeps the server responsive while still running in parallel.
   * CI uses 1 worker for determinism. */
  workers: process.env.CI ? 1 : 3,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',
    /* Collect trace on every failure — viewable in the HTML report via trace viewer. */
    trace: 'retain-on-failure',
    /* Screenshot on failure for rapid triage without needing the full trace. */
    screenshot: 'only-on-failure',
    /* Run headless */
    headless: true,
  },

  /* Run local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000/pricing',
    reuseExistingServer: true,
    timeout: 120000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
