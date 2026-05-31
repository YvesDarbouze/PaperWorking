import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { setupMocks, createDefaultState, MockState } from './mocks';

test.describe('PaperWorking Accessibility Audits — WCAG 2.1 AA', () => {
  let state: MockState;

  test.beforeEach(async ({ page }) => {
    state = createDefaultState();
    await setupMocks(page, state);
  });

  const screens = [
    { name: 'Landing Page', url: '/how-it-works' },
    { name: 'Login Page', url: '/login' },
    { name: 'Dashboard Portfolio', url: '/dashboard/command-center' },
    { name: 'Projects List', url: '/dashboard/projects' },
    { name: 'Tax Page', url: '/dashboard/tax' },
  ];

  for (const screen of screens) {
    test(`Axe Audit — ${screen.name} has zero WCAG 2.1 AA violations`, async ({ page }) => {
      await page.goto(screen.url);
      await page.waitForLoadState('load');

      // Run Axe accessibility audit builder
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      // Assert zero violations
      expect(accessibilityScanResults.violations).toEqual([]);
    });
  }
});
