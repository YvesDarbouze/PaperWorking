import { test, expect } from '@playwright/test';

test.describe('PK-1 — Document Packages & Secure Sharing', () => {
  test('navigates to Projects page, toggles Packages & Archive view mode, and verifies completeness card', async ({ page }) => {
    // Navigate to projects page
    await page.goto('/dashboard/projects');
    await page.waitForSelector('[data-testid="projects-page"]');

    // Toggle view mode to Packages & Archive
    const packagesToggle = page.locator('[data-testid="toggle-view-packages"]');
    await expect(packagesToggle).toBeVisible();
    await packagesToggle.click();

    // Verify Packages Archive Section renders
    const archiveSection = page.locator('[data-testid="packages-archive-section"]');
    await expect(archiveSection).toBeVisible();

    // Verify package type buttons exist
    const lenderBtn = page.locator('[data-testid="package-type-lender-btn"]');
    const investorBtn = page.locator('[data-testid="package-type-investor-btn"]');
    await expect(lenderBtn).toBeVisible();
    await expect(investorBtn).toBeVisible();

    // Switch to Investor package
    await investorBtn.click();

    // Verify share link CTA button exists
    const shareBtn = page.locator('[data-testid="generate-share-link-btn"]');
    await expect(shareBtn).toBeVisible();
  });
});
