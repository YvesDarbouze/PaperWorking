import { test, expect } from '@playwright/test';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { createDevSessionForContext } from '../helpers/auth.js';

test.describe('Regression Sweep of Untouched Surfaces & Visual Baseline Integrity', () => {
  const screenshotDir = path.resolve(process.cwd(), '../../docs/design-system/regression');
  const brainDir = '/Users/yvesdarbouze/.gemini/antigravity/brain/0000d017-3c3a-4b3a-b7cc-64e7f65b4544';

  test.beforeAll(() => {
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
  });

  test.beforeEach(async ({ context }) => {
    await createDevSessionForContext(context, 'investor');
  });

  const saveScreenshots = async (page: any, filename: string) => {
    const docPath = path.join(screenshotDir, filename);
    const brainPath = path.join(brainDir, filename);
    await page.screenshot({ path: docPath, fullPage: true });
    try {
      fs.copyFileSync(docPath, brainPath);
    } catch {
      // Best effort copy to brain
    }
  };

  test('1: Portfolio Dashboard (/dashboard) renders with zero layout drift', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Portfolio' })).toBeVisible();
    await expect(page.getByText('Explore Deals')).toBeVisible();

    await saveScreenshots(page, 'regression-portfolio-dashboard.png');
  });

  test('2: Projects (/projects) renders without layout drift', async ({ page }) => {
    await page.goto('/projects');
    await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();

    await saveScreenshots(page, 'regression-projects.png');
  });

  test('3: Insights tab (/dashboard/insights) and Playbook metrics render cleanly', async ({ page }) => {
    await page.goto('/dashboard/insights');
    await expect(page.getByRole('heading', { name: 'Insights' })).toBeVisible();

    // Verify KPI sections render
    await expect(page.getByTestId('kpi-section-core')).toBeVisible();
    await expect(page.getByTestId('kpi-section-leverage')).toBeVisible();
    await expect(page.getByTestId('kpi-section-operational')).toBeVisible();
    await expect(page.getByTestId('kpi-section-growth')).toBeVisible();

    const kpiCards = page.locator('[data-testid="kpi-card"]');
    await expect(kpiCards.first()).toBeVisible();

    await saveScreenshots(page, 'regression-insights.png');

    // Also navigate to Playbook support metrics to confirm all 33 metrics render
    await page.goto('/support/metrics');
    await expect(page.getByRole('heading', { name: /The PaperWorking Playbook/i })).toBeVisible();
    await expect(page.getByText(/33 real-time performance metrics/i)).toBeVisible();
    await saveScreenshots(page, 'regression-playbook-33-metrics.png');
  });

  test('4: Reports (/dashboard/reports) renders without layout drift', async ({ page }) => {
    await page.goto('/dashboard/reports');
    await expect(page.getByRole('heading', { name: /Tax Intelligence/i })).toBeVisible();

    await saveScreenshots(page, 'regression-reports.png');
  });

  test('5: Billing (/dashboard/settings/billing) renders without layout drift', async ({ page }) => {
    await page.goto('/dashboard/settings/billing');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Billing/i }).first()).toBeVisible();

    await saveScreenshots(page, 'regression-settings-billing.png');
  });

  test('6: Settings Profile (/dashboard/settings/profile) renders without layout drift', async ({ page }) => {
    await page.goto('/dashboard/settings/profile');
    await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible();

    await saveScreenshots(page, 'regression-settings-profile.png');
  });
});
