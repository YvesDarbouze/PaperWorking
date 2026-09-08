import { defineConfig, devices } from '@playwright/test';

const PORT = process.env.PORT ?? '3005';
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e/specs',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 3,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'tests/e2e/playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    headless: true,
  },
  globalSetup: './tests/e2e/global-setup.ts',
  webServer: process.env.E2E_SKIP_WEBSERVER
    ? undefined
    : {
        command: `npx next dev -p ${PORT}`,
        cwd: './apps/web',
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 120_000,
        env: {
          PORT,
          NODE_ENV: 'development',
        },
      },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
