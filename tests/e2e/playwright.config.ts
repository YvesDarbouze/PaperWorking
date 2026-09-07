import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 3,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3002',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    headless: true,
  },
  globalSetup: './global-setup.ts',
  webServer: process.env.E2E_SKIP_WEBSERVER
    ? undefined
    : {
        command: 'PORT=3002 ENABLE_MOCK_AUTH=true USE_MOCK_DATA=false NEXT_PUBLIC_USE_MOCK_DATA=false npm run dev',
        cwd: '../../apps/web',
        url: 'http://127.0.0.1:3002',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          ENABLE_MOCK_AUTH: 'true',
          USE_MOCK_DATA: 'false',
          NEXT_PUBLIC_USE_MOCK_DATA: 'false',
          NODE_ENV: 'development',
        },
      },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
