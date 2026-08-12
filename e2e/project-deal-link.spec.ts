import { test, expect } from '@playwright/test';

test.describe('Project Deal Linker & Property Identification Wizard', () => {
  test('Portfolio dashboard secondary glass CTA opens New Project wizard', async ({ page }) => {
    await page.goto('/dashboard/command-center');
    await page.waitForLoadState('domcontentloaded');

    const createProjectCta = page.getByTestId('create-project-cta');
    await expect(createProjectCta).toBeVisible();
    await createProjectCta.click();

    await page.waitForURL(/\/projects\/new\?source=dashboard/);
    const nameInput = page.getByTestId('project-name-input');
    await expect(nameInput).toBeVisible();
  });

  test('Step 2 property search links existing deal to project', async ({ page }) => {
    await page.goto('/projects/new');
    await page.waitForLoadState('networkidle').catch(() => {});

    // Step 1: Fill Basics
    const nameInput = page.getByTestId('project-name-input');
    await expect(nameInput).toBeVisible();
    await nameInput.fill('Austin Multifamily Venture');

    const step1NextBtn = page.getByTestId('step-1-next-btn');
    await step1NextBtn.click();

    // Step 2: Search Address of existing deal
    const step2 = page.getByTestId('project-step-2');
    await expect(step2).toBeVisible();

    const searchInput = page.getByTestId('deals-address-search-input');
    await searchInput.fill('123 Main St');

    const dropdown = page.getByTestId('address-prediction-dropdown');
    await expect(dropdown).toBeVisible();

    const predictionItem = page.getByTestId('prediction-item-0');
    await predictionItem.click();

    // Existing deal preview card renders
    const previewCard = page.getByTestId('existing-deal-preview-card');
    await expect(previewCard).toBeVisible();

    const linkDealBtn = page.getByTestId('link-this-deal-btn');
    await linkDealBtn.click();

    // Step 3: Confirm & Launch
    const step3 = page.getByTestId('project-step-3');
    await expect(step3).toBeVisible();

    const confirmLaunchBtn = page.getByTestId('confirm-launch-project-btn');
    await confirmLaunchBtn.click();

    await expect(page).toHaveURL(/\/dashboard\/projects/);
  });

  test('Step 2 property search auto-creates new deal for project when no deal exists', async ({ page }) => {
    await page.goto('/projects/new');
    await page.waitForLoadState('networkidle').catch(() => {});

    const step1NextBtn = page.getByTestId('step-1-next-btn');
    await step1NextBtn.click();

    const searchInput = page.getByTestId('deals-address-search-input');
    await searchInput.fill('999 Custom St');

    const dropdown = page.getByTestId('address-prediction-dropdown');
    await expect(dropdown).toBeVisible();

    const predictionItem = page.getByTestId('prediction-item-0');
    await predictionItem.click();

    const createDealBtn = page.getByTestId('create-deal-for-project-btn');
    await expect(createDealBtn).toBeVisible();
    await createDealBtn.click();

    const step3 = page.getByTestId('project-step-3');
    await expect(step3).toBeVisible();
  });
});
