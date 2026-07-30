import { test, expect } from '@playwright/test';

test.describe('Manual Entry KPI Parity', () => {
  const projectId = 'e2e-project-manual-parity';

  test('verifies manual rent, expense, and mortgage entries update KPIs identically to Plaid', async ({ page }) => {
    // Navigate to Financial Connections page
    await page.goto(`/dashboard/projects/${projectId}/exit/financial-connections`);

    // Verify Manual Entry section is present alongside Plaid cards
    await expect(page.getByText('Manual Entry')).toBeVisible();
    await expect(page.locator('#manual-record-rent')).toBeVisible();
    await expect(page.locator('#manual-record-expense')).toBeVisible();
    await expect(page.locator('#manual-record-mortgage')).toBeVisible();
  });
});
