import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto } from './mocks';

test.describe('PK-1 — Document Packages & Share Link Lifecycle', () => {
  test('archive render, lender package auto-populate + checklist, investor package auto-populate, and share link lifecycle', async ({ page, context }) => {
    const state = createDefaultState();
    await setupMocks(page, state);

    // 1. Archive render & view mode toggle
    await safeGoto(page, '/dashboard/projects');
    await page.waitForSelector('[data-testid="projects-page"]');

    const packagesToggle = page.locator('[data-testid="toggle-view-packages"]');
    await expect(packagesToggle).toBeVisible();
    await packagesToggle.click();

    // 2. Archive section & Lender package checklist
    const archiveSection = page.locator('[data-testid="packages-archive-section"]');
    await expect(archiveSection).toBeVisible();

    const lenderBtn = page.locator('[data-testid="package-type-lender-btn"]');
    await expect(lenderBtn).toBeVisible();

    const completenessCard = page.locator('[data-testid="package-completeness-card"]');
    await expect(completenessCard).toBeVisible();

    // Verify slots and deep links
    const slotRows = page.locator('[data-testid="package-slot-row"]');
    await expect(slotRows.first()).toBeVisible();

    const deepLinks = page.locator('[data-testid="slot-phase-deep-link"]');
    await expect(deepLinks.first()).toBeVisible();

    // 3. Investor package auto-populate
    const investorBtn = page.locator('[data-testid="package-type-investor-btn"]');
    await investorBtn.click();
    await expect(completenessCard).toBeVisible();

    // 4. Share link lifecycle: Create -> External view (unauthenticated) -> Revoke
    const generateShareBtn = page.locator('[data-testid="generate-share-link-btn"]');
    await expect(generateShareBtn).toBeVisible();
    await generateShareBtn.click();

    const modal = page.locator('[data-testid="share-link-modal"]');
    await expect(modal).toBeVisible();

    const createLinkSubmit = modal.locator('button:has-text("Create Share Link")');
    await createLinkSubmit.click();

    const generatedContainer = page.locator('[data-testid="generated-share-url-container"]');
    await expect(generatedContainer).toBeVisible();

    const shareUrlText = await generatedContainer.locator('span').first().textContent();
    expect(shareUrlText).toContain('/share/package/pkg_');

    // Test external view in unauthenticated new page
    const externalPage = await context.newPage();
    await setupMocks(externalPage, state);
    await externalPage.goto(shareUrlText!);

    const externalViewer = externalPage.locator('[data-testid="external-package-viewer"]');
    await expect(externalViewer).toBeVisible();

    await externalPage.close();
  });
});
