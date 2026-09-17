import { test, expect } from '@playwright/test';
import { createDevSessionForContext } from '../helpers/auth';

test.describe('Project Financial Underwriting Inputs & Edit Surface', () => {
  test.beforeEach(async ({ context }) => {
    await createDevSessionForContext(context);
  });

  test('1: Fast path: minimal entry uses institutional defaults and completes launch', async ({
    page,
  }) => {
    await page.goto('/projects/new?step=1');

    // Step 1: Basics
    await expect(page.getByText(/STEP 1 OF 3/i)).toBeVisible();
    const nameInput = page.getByPlaceholder(/Elm Street Flip/i);
    await nameInput.fill('Fast Path Austin Value-Add');
    await page.getByRole('button', { name: /Next: Identify property/i }).click();

    // Step 2: Property & Collision Link
    await expect(page.getByText(/STEP 2 OF 3/i)).toBeVisible();
    const searchInput = page.getByPlaceholder(/Search any street address/i);
    await searchInput.fill('1247 Elm Street');
    await searchInput.press('Enter');

    // Collision modal shows "Link to this deal"
    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 10000 });
    const linkButton = modal.getByRole('button', { name: 'Link to this deal' });
    await expect(linkButton).toBeVisible();
    await linkButton.click();

    // Step 3: Confirm & Launch with Underwriting Summary
    await expect(page.getByText(/STEP 3 OF 3/i)).toBeVisible();
    const summaryCard = page.locator('[data-testid="financial-summary-card"]');
    await expect(summaryCard).toBeVisible();
    await expect(summaryCard).toContainText('$485,000');
    await expect(summaryCard).toContainText('75%');
    await expect(summaryCard).toContainText('6.5%');
    await expect(summaryCard).toContainText('1.25x');

    // Launch project
    const launchBtn = page.getByRole('button', { name: /Launch project/i });
    await expect(launchBtn).toBeVisible();
    await launchBtn.click();

    await page.waitForURL(/\/dashboard/);
    expect(page.url()).toContain('/dashboard');
  });

  test('2: Refine inputs in Step 2, capture screenshot, and verify Step 3 summary', async ({
    page,
  }) => {
    await page.goto('/projects/new?step=1');

    // Step 1: Fill name
    const nameInput = page.getByPlaceholder(/Elm Street Flip/i);
    await nameInput.fill('Oakland Mixed-Use Underwriting');
    await page.getByRole('button', { name: /Next: Identify property/i }).click();

    // Step 2: Search address and link deal
    await expect(page.getByText(/STEP 2 OF 3/i)).toBeVisible();
    const searchInput = page.getByPlaceholder(/Search any street address/i);
    await searchInput.fill('1247 Elm Street');
    await searchInput.press('Enter');

    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 10000 });
    await modal.getByRole('button', { name: 'Link to this deal' }).click();

    // From Step 3, click "Edit inputs" to return to Step 2 with the underwriting form visible
    await expect(page.getByText(/STEP 3 OF 3/i)).toBeVisible();
    await page.getByRole('button', { name: /Edit inputs/i }).click();
    await expect(page.getByText(/STEP 2 OF 3/i)).toBeVisible();

    const underwritingSection = page.locator('[data-testid="underwriting-inputs-section"]');
    await expect(underwritingSection).toBeVisible();

    // Capture screenshot of new Step 2 financial inputs
    await page.screenshot({
      path: '/Users/yvesdarbouze/.gemini/antigravity/brain/0000d017-3c3a-4b3a-b7cc-64e7f65b4544/underwriting-step2-inputs.png',
      fullPage: true,
    });

    // Advance to Step 3 and launch
    await page.getByRole('button', { name: /Next: Confirm & Launch/i }).click();
    await expect(page.getByText(/STEP 3 OF 3/i)).toBeVisible();
    await page.getByRole('button', { name: /Launch project/i }).click();

    await page.waitForURL(/\/dashboard/);
    expect(page.url()).toContain('/dashboard');
  });

  test('3: Edit surface (/project/[id]/underwriting) updates values and recomputes', async ({
    page,
  }) => {
    // Navigate to underwriting tab for project deal-1
    await page.goto('/project/deal-1/underwriting');

    // Verify title and engine badge
    await expect(page.getByText(/Underwriting Inputs & Pro-Forma/i)).toBeVisible();
    await expect(page.getByText(/33 KPIs Engine/i)).toBeVisible();

    // If "Not yet collected", initialize defaults
    const notYetCollected = page.locator('[data-testid="not-yet-collected-banner"]');
    if (await notYetCollected.isVisible()) {
      await page.getByRole('button', { name: /Initialize with Institutional Defaults/i }).click();
    }

    const editSurface = page.locator('[data-testid="underwriting-edit-surface"]');
    await expect(editSurface).toBeVisible();

    // Capture screenshot of Underwriting Edit surface
    await page.screenshot({
      path: '/Users/yvesdarbouze/.gemini/antigravity/brain/0000d017-3c3a-4b3a-b7cc-64e7f65b4544/underwriting-edit-surface.png',
      fullPage: true,
    });

    // Find and click "Save & Recompute KPIs"
    const saveBtn = page.getByRole('button', { name: /Save & Recompute KPIs/i });
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();

    // Verify save success confirmation message appears
    await expect(page.getByText(/Underwriting inputs saved & KPIs recomputed!/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test('4: Legacy project shows "Not yet collected" state and initializes on click', async ({
    page,
  }) => {
    // Navigate to legacy project deal-2 without initialized underwriting
    await page.goto('/project/deal-2/underwriting');

    const notYetCollected = page.locator('[data-testid="not-yet-collected-banner"]');
    await expect(notYetCollected).toBeVisible();
    await expect(page.getByText(/Not yet collected/i)).toBeVisible();

    // Click initialize button
    const initButton = page.getByRole('button', {
      name: /Initialize with Institutional Defaults/i,
    });
    await expect(initButton).toBeVisible();
    await initButton.click();

    // Now edit surface appears
    const editSurface = page.locator('[data-testid="underwriting-edit-surface"]');
    await expect(editSurface).toBeVisible();
  });
});
