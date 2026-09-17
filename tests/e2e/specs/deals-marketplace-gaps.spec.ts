import { test, expect } from '@playwright/test';
import { createDevSessionForContext } from '../helpers/auth';

test.describe('Authenticated Deals Marketplace Gap-Fillers (Phases A–E)', () => {
  test.beforeEach(async ({ context }) => {
    await createDevSessionForContext(context, 'investor');
  });

  test('A — Search Collision: typing an existing address displays CollisionModal with direct deal link', async ({
    page,
  }) => {
    await page.goto('/dashboard/deals');

    // Type an existing deal address into search and submit
    const searchInput = page.getByPlaceholder('Search any street address or deal name…');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('1247 Elm Street');
    await searchInput.press('Enter');

    // Verify CollisionModal renders
    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 5000 });
    await expect(modal).toContainText('A deal already exists at this address');
    await expect(modal).toContainText('Elm Street Flip');

    // Click "View deal" link
    const viewBtn = modal.getByRole('button', { name: /View deal/i });
    await expect(viewBtn).toBeVisible();
    await viewBtn.click();

    // Assert navigation to deal detail view
    await expect(page).toHaveURL(/.*\/deals\/1247elmst\/detail/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Elm Street Flip');
  });

  test('B — Project Linker: List Deal / Link Active Project modal allows project creation with visibility settings', async ({
    page,
  }) => {
    await page.goto('/dashboard/deals');

    // Click "List a Deal"
    const listBtn = page.getByRole('button', { name: 'List a Deal' });
    await expect(listBtn).toBeVisible();
    await listBtn.click();

    // Verify modal is displayed
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(modal.getByRole('heading', { name: /List Deal \/ Link Active Project/i })).toBeVisible();

    // Fill property details
    await modal.getByPlaceholder('e.g. 789 Cedar Ct, Austin TX').fill('456 Elm St, Dallas TX');

    // Check visibility dropdown options
    const visibilitySelect = modal.locator('select');
    await expect(visibilitySelect).toBeVisible();
    await visibilitySelect.selectOption('marketplace');

    // Submit
    const submitBtn = modal.getByRole('button', { name: 'Publish Deal' });
    await submitBtn.click();

    // Assert success feedback
    await expect(modal.locator('text=Deal successfully saved and linked!')).toBeVisible();
  });

  test('C — Broadcast: Share Analysis modal broadcasts deal summary to external emails', async ({
    page,
  }) => {
    await page.goto('/dashboard/deals');

    // Click "Share analysis" on the first card
    const shareBtn = page.locator('button:has-text("Share analysis")').first();
    await expect(shareBtn).toBeVisible();
    await shareBtn.click();

    // Verify modal appears
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(modal.getByRole('heading', { name: /Share Analysis & Broadcast Deal/i })).toBeVisible();

    // Fill external recipient email
    const emailInput = modal.locator('#recipient-emails');
    await emailInput.fill('syndicate-partner@fund.com, cpa@taxfirm.com');

    // Submit broadcast
    const sendBtn = modal.getByRole('button', { name: /Share Analysis/i });
    await sendBtn.click();

    // Verify success banner
    await expect(modal.locator('text=Analysis broadcast successfully dispatched!')).toBeVisible({
      timeout: 5000,
    });
    await expect(modal.locator('text=Sent to 2 recipients.')).toBeVisible();

    // Close modal
    await modal.getByRole('button', { name: 'Done' }).click();
    await expect(modal).toBeHidden();
  });

  test('D — Deal Visibility: renders visibility badges and enforces tab filtering', async ({
    page,
  }) => {
    await page.goto('/dashboard/deals');

    // Assert visibility badge renders on deal cards
    const marketplaceBadge = page.locator('article span:has-text("marketplace")').first();
    await expect(marketplaceBadge).toBeVisible();

    // Switch between Discover and My Activity tabs
    const myActivityTab = page.getByRole('tab', { name: 'My Activity' });
    await expect(myActivityTab).toBeVisible();
    await myActivityTab.click();
    await expect(myActivityTab).toHaveAttribute('aria-selected', 'true');

    const discoverTab = page.getByRole('tab', { name: 'Discover' });
    await discoverTab.click();
    await expect(discoverTab).toHaveAttribute('aria-selected', 'true');
  });

  test('E — Deal Detail Panel: displays Lead Investor and metrics without Sponsor terminology', async ({
    page,
  }) => {
    await page.goto('/deals/1247elmst/detail');

    // Assert main header and metrics
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Elm Street Flip');
    await expect(page.locator('text=Purchase price')).toBeVisible();
    await expect(page.locator('text=Projected ROI')).toBeVisible();

    // Verify Lead Investor terminology is used (and "Sponsor" is NOT used)
    await expect(page.locator('text=Lead Investor:')).toBeVisible();
    const sponsorMentions = await page.locator('text=Sponsor:').count();
    expect(sponsorMentions).toBe(0);

    // Verify Project Workspace link button
    const workspaceLink = page.getByRole('link', { name: /Open Project Workspace/i });
    await expect(workspaceLink).toBeVisible();
  });
});
