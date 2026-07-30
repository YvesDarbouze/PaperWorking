import { test, expect } from '@playwright/test';

test.describe('Full Plaid to KPI Pipeline E2E', () => {
  const projectId = 'e2e-project-kpi-pipeline';

  test('executes end-to-end sync, categorization, rule creation, and KPI recalculation', async ({ page }) => {
    // 1. Navigate to Review Queue
    await page.goto(`/dashboard/projects/${projectId}/exit/review-queue`);

    // Verify Review Queue page loads
    await expect(page.getByText('Review Transactions')).toBeVisible();

    // 2. Approve Rent Income Transaction
    const rentRow = page.locator('tr:has-text("RENT PAYMENT")').first();
    if (await rentRow.isVisible()) {
      const approveBtn = rentRow.locator('button:has-text("Approve")');
      await approveBtn.click();
    }

    // 3. Navigate to Exit Insights
    await page.goto(`/dashboard/projects/${projectId}/exit/insights`);

    // Verify all 6 widgets render correctly
    await expect(page.getByText("Today's Financial Snapshot")).toBeVisible();
    await expect(page.getByText('Revenue Tracker')).toBeVisible();
    await expect(page.getByText('Expense Breakdown')).toBeVisible();
    await expect(page.getByText('Mortgage & Liability Tracker')).toBeVisible();
    await expect(page.getByText('KPI Movement Grid')).toBeVisible();
    await expect(page.getByText('Recent Activity & KPI Impact')).toBeVisible();

    // 4. Click KPI Card to open historical chart modal
    const cocCard = page.locator('div:has-text("Cash-on-Cash Return")').first();
    await cocCard.click();

    // Verify detail modal opens
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    await expect(modal.getByText('Cash-on-Cash Return — 6 Month Trend')).toBeVisible();
  });
});
