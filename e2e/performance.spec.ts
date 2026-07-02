import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, MockState } from './mocks';

test.describe('PaperWorking Performance Budget Gates', () => {
  let state: MockState;

  test.beforeEach(async ({ page }) => {
    state = createDefaultState();
    await setupMocks(page, state);
  });

  const paths = [
    { name: 'Dashboard Portfolio', url: '/dashboard/command-center' },
    { name: 'Insights', url: '/dashboard/insights' },
    { name: 'Project Workspace', url: '/dashboard/projects/project_1' },
  ];

  for (const path of paths) {
    test(`Performance Budget — ${path.name} satisfies LCP <= 2.5s and INP <= 200ms`, async ({ page }) => {
      await page.goto(path.url);
      await page.waitForLoadState('load');

      // 1. Assert Largest Contentful Paint (LCP) budget
      const lcpValue = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          let lcp = 0;
          new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            if (entries.length > 0) {
              const lastEntry = entries[entries.length - 1];
              lcp = lastEntry.startTime;
            }
          }).observe({ type: 'largest-contentful-paint', buffered: true });
          
          // Resolve after 1.5 seconds
          setTimeout(() => resolve(lcp), 1500);
        });
      });

      // LCP budget is 2.5 seconds (2500ms)
      expect(lcpValue).toBeLessThanOrEqual(2500);

      // 2. Assert Interaction to Next Paint (INP) / First Input Delay (FID) budget
      // Simulate user click to trigger interaction
      await page.click('header, h1, body');

      const inpValue = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          let maxDuration = 0;
          new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            for (const entry of entries) {
              // Cast entry to any to read standard performance properties
              const duration = (entry as any).duration || 0;
              if (duration > maxDuration) {
                maxDuration = duration;
              }
            }
          }).observe({ type: 'first-input', buffered: true });

          setTimeout(() => resolve(maxDuration), 1000);
        });
      });

      // INP budget is 200ms
      expect(inpValue).toBeLessThanOrEqual(200);
    });
  }
});
