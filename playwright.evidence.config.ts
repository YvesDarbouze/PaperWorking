import { defineConfig, devices } from '@playwright/test';

/**
 * Evidence-capture config — UX/UI Hardening Sprint, August 2026.
 *
 * Identical to `playwright.config.ts` except it omits the `webServer` block.
 * The shared config's webServer probes `/dashboard/command-center`, which is
 * auth-guarded by `src/middleware.ts` and answers 307 to an unauthenticated
 * probe; when a dev server is already listening on :3000 the plugin setup
 * stalls instead of reusing it. The e2e specs mock auth per-page via
 * `setupMocks`, so no server-side session is needed — point at an
 * already-running dev server instead.
 *
 * Usage:
 *   npm run dev                       # in another shell
 *   npx playwright test --config=playwright.evidence.config.ts
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  expect: { timeout: 15000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.PW_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
