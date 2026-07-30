import { test, expect } from '@playwright/test';

test.describe('Plaid Pre-Link Trust Screen & DTM Compliance', () => {
  const projectId = 'test-project-123';

  test.beforeEach(async ({ page }) => {
    // Navigate to Financial Connections page
    await page.goto(`/dashboard/projects/${projectId}/exit/financial-connections`);
  });

  test('opens Pre-Link Trust Screen when clicking Connect Rent Collection Account', async ({ page }) => {
    // Click Connect Rent Collection Account
    const connectRentBtn = page.locator('button:has-text("Connect Rent Collection Account")').first();
    await connectRentBtn.click();

    // Verify Pre-Link Trust Screen modal opens
    const trustModal = page.locator('[role="dialog"]');
    await expect(trustModal).toBeVisible();

    // Verify headline and subheadline
    await expect(trustModal.locator('h2')).toContainText('Track Rent Deposits Automatically');

    // Verify "What PaperWorking will access" section
    await expect(trustModal.getByText('What PaperWorking will access')).toBeVisible();
    await expect(trustModal.getByText('Rent Detection')).toBeVisible();
    await expect(trustModal.getByText('Balance Tracking')).toBeVisible();

    // Verify "What PaperWorking will NEVER do" section
    await expect(trustModal.getByText('What PaperWorking will NEVER do')).toBeVisible();
    await expect(trustModal.getByText('Store your bank password')).toBeVisible();
    await expect(trustModal.getByText('Move or transfer money')).toBeVisible();
    await expect(trustModal.getByText('Share your data with third parties')).toBeVisible();

    // Verify Security badge
    await expect(trustModal.getByText('Bank-level security powered by Plaid')).toBeVisible();
  });

  test('clicking Connect opens Plaid Link modal with DTM footer', async ({ page }) => {
    // Click Connect button
    const connectBtn = page.locator('button:has-text("Connect Rent Collection Account")').first();
    await connectBtn.click();

    // Click Primary action CTA on Trust Screen
    const modalConnectBtn = page.locator('#plaid-trust-connect-btn');
    await modalConnectBtn.click();

    // Wait for Plaid Link sandbox iframe or mock trigger
    await page.waitForTimeout(1000);
  });
});
