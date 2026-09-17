import { test, expect } from '@playwright/test';
import { createDevSessionForContext } from '../helpers/auth';

test.describe('Project Creation Flow & Deal Backlinks (Project Flow Correction)', () => {
  test.beforeEach(async ({ context }) => {
    await createDevSessionForContext(context, 'investor');
  });

  test('1: Click "Create new Project" from dashboard navigates to /projects/new', async ({ page }) => {
    await page.goto('/dashboard');

    const createProjectCard = page.getByRole('link', { name: /create new project|create project/i }).first();
    await expect(createProjectCard).toBeVisible();
    await createProjectCard.click();

    await expect(page).toHaveURL(/.*\/projects\/new/);
    await expect(page.getByRole('heading', { name: 'Project Basics' })).toBeVisible();
    await expect(page.getByText('STEP 1 OF 3')).toBeVisible();
  });

  test('2: Fill basics and click Next advances to Step 2 with AddressSearch', async ({ page }) => {
    await page.goto('/projects/new?step=1');

    // Fill project name
    const nameInput = page.getByPlaceholder(/Elm Street Flip/i);
    await nameInput.fill('Austin Eastside Development');

    const nextBtn = page.getByRole('button', { name: /Next: Identify property/i });
    await nextBtn.click();

    // Assert Step 2
    await expect(page).toHaveURL(/.*\/projects\/new\?.*step=2/);
    await expect(page.getByRole('heading', { name: 'Link this project to a property deal.' })).toBeVisible();
    await expect(page.getByPlaceholder(/Search any street address/i)).toBeVisible();
  });

  test('3 & 4: Search existing deal address shows collision modal with "Link to this deal" and advances to Step 3', async ({
    page,
  }) => {
    await page.goto('/projects/new?step=1');

    const nameInput = page.getByPlaceholder(/Elm Street Flip/i);
    await nameInput.fill('Elm Street Project Link');

    const nextBtn = page.getByRole('button', { name: /Next: Identify property/i });
    await nextBtn.click();

    // Step 2: Search existing deal address
    const searchInput = page.getByPlaceholder(/Search any street address/i);
    await searchInput.fill('1247 Elm Street');
    await searchInput.press('Enter');

    // Assert Collision Modal with project-link variant
    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 10000 });
    await expect(modal.getByRole('button', { name: 'Link to this deal' })).toBeVisible();
    await expect(modal.getByRole('button', { name: 'Create new deal for this project' })).toBeVisible();

    // Click "Link to this deal"
    await modal.getByRole('button', { name: 'Link to this deal' }).click();

    // Assert Step 3 summary
    await expect(page).toHaveURL(/.*\/projects\/new\?.*step=3/);
    await expect(page.getByRole('heading', { name: 'Confirm & Launch' })).toBeVisible();
    await expect(page.locator('text=1247 Elm Street, Austin, TX 78702')).toBeVisible();
  });

  test('5: Click "Launch project" creates project and redirects to dashboard with linked deal address', async ({
    page,
  }) => {
    await page.goto('/projects/new?step=3');

    const launchBtn = page.getByRole('button', { name: /Launch project/i });
    await expect(launchBtn).toBeVisible();
    await launchBtn.click();

    // Assert redirect to dashboard
    await expect(page).toHaveURL(/.*\/dashboard/);

    // Assert project card shows linked deal address
    const linkedAddress = page.locator('text=1247 Elm Street, Austin, TX 78702').first();
    await expect(linkedAddress).toBeVisible();
  });

  test('6 & 7: Click linked deal address navigates to deal detail and shows "Linked to Project" badge', async ({
    page,
  }) => {
    await page.goto('/dashboard');

    // Click linked deal address
    const dealLink = page.locator('a[href*="/deals/1247elmst/detail"]').first();
    await expect(dealLink).toBeVisible();
    await dealLink.click();

    // Assert navigates to deal detail
    await expect(page).toHaveURL(/.*\/deals\/1247elmst\/detail/);

    // Assert "Linked to Project" glass badge is visible
    const projectBadge = page.locator('text=Linked to Project:');
    await expect(projectBadge).toBeVisible();
  });

  test('8: Click "Linked to Project" badge on deal detail navigates to project workspace', async ({
    page,
  }) => {
    await page.goto('/deals/1247elmst/detail');

    const projectBadge = page.getByRole('link', { name: /Linked to Project:/i });
    await expect(projectBadge).toBeVisible();
    await projectBadge.click();

    // Assert navigates to project workspace
    await expect(page).toHaveURL(/.*\/(project|projects)\/deal-1/);
  });

  test('9: Search new address in Step 2 auto-creates draft deal and navigates to deal intake', async ({
    page,
  }) => {
    await page.goto('/projects/new?step=1');

    const nameInput = page.getByPlaceholder(/Elm Street Flip/i);
    await nameInput.fill('Highland Park Acquisition');

    const nextBtn = page.getByRole('button', { name: /Next: Identify property/i });
    await nextBtn.click();

    // Search new address
    const searchInput = page.getByPlaceholder(/Search any street address/i);
    await searchInput.fill('789 Pine Street');
    await searchInput.press('Enter');

    // Assert draft deal feedback card
    await expect(page.getByRole('heading', { name: 'New Deal Draft Initialized' })).toBeVisible({ timeout: 10000 });

    const createDealDetailsBtn = page.getByRole('link', { name: /Create deal details/i });
    await expect(createDealDetailsBtn).toBeVisible();
    await createDealDetailsBtn.click();

    // Assert navigates to /deals/[slug]?fromProject=[id]
    await expect(page).toHaveURL(/.*\/deals\/789pinestreet\?fromProject=.*/);
  });
});
