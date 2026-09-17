import { test, expect } from '@playwright/test';

test.describe('Pricing & Network & Permissions E2E tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to pricing page
    await page.goto('/pricing');
  });

  test('should display three plans with correct prices and MOST POPULAR badge', async ({ page }) => {
    // Scoped to pricing section to prevent conflicts with Permissions section
    const pricingSection = page.locator('#pricing');

    // Assert three plans visible via headings inside #pricing
    const investorCard = pricingSection.getByRole('heading', { name: 'Investor', exact: true });
    const teamCard = pricingSection.getByRole('heading', { name: 'Investment Team', exact: true });
    const vendorCard = pricingSection.getByRole('heading', { name: 'Vendor', exact: true });

    await expect(investorCard).toBeVisible();
    await expect(teamCard).toBeVisible();
    await expect(vendorCard).toBeVisible();

    // Assert prices
    // We assert that the monthly prices $59, $99, and $39 are visible
    await expect(pricingSection.locator('text=$59')).toBeVisible();
    await expect(pricingSection.locator('text=$99')).toBeVisible();
    await expect(pricingSection.locator('text=$39')).toBeVisible();

    // Assert MOST POPULAR badge is visible on Team plan card
    // We filter card by the unique Investment Team tagline
    const cards = pricingSection.locator('div.grid-cols-1 > div');
    const teamCardContainer = cards.filter({ hasText: 'Role-based access and clean separation' }).first();
    const badge = teamCardContainer.locator('text=MOST POPULAR');
    await expect(badge).toBeVisible();
  });

  test('should display legal disclaimer in footer', async ({ page }) => {
    const legalText = 'PaperWorking is a project management software platform, not an investment advisor or registered broker-dealer. Marketplace listings are for operational deal organization and tracking soft interest only; they do not constitute offers to sell securities.';
    await expect(page.locator(`text=${legalText}`)).toBeVisible();
  });

  test('should render Come for the Execution Tools section', async ({ page }) => {
    const heading = page.locator('h2', { hasText: 'Come for the Execution Tools. Stay for the Network.' });
    await expect(heading).toBeVisible();
    
    // Assert presence of Deal Marketplace and Vendor Marketplace content
    await expect(page.locator('h3', { hasText: 'The Deal Marketplace' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'The Vendor Marketplace' })).toBeVisible();
    
    // Assert CTAs
    await expect(page.locator('text=Browse Deal Marketplace')).toBeVisible();
    await expect(page.getByRole('link', { name: /List Services as a Vendor/i })).toBeVisible();

    // Assert note
    await expect(page.locator('text=Automatic access included for all Investor and Investment Team accounts.')).toBeVisible();
  });

  test('should show 4 roles in permissions section', async ({ page }) => {
    await expect(page.locator('text=PERMISSIONS & GOVERNANCE')).toBeVisible();
    await expect(page.locator('h2', { hasText: 'Role-Based Security for Every Stakeholder' })).toBeVisible();

    // Assert 4 roles
    await expect(page.locator('h3', { hasText: 'Lead Investor' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'Partners & Teammates' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'CPAs & Advisors' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'Vendors & Contractors' })).toBeVisible();
  });

  test('should stack pricing cards vertically on mobile screen', async ({ page }) => {
    // Set viewport to a typical mobile device (375x812)
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/pricing');

    const pricingSection = page.locator('#pricing');
    const cards = pricingSection.locator('div.grid-cols-1 > div');

    // Retrieve the container/card elements using unique taglines to ensure we get the right div
    const investorCard = cards.filter({ hasText: 'Full pipeline visibility without a team subscription.' }).first();
    const teamCard = cards.filter({ hasText: 'Role-based access and clean separation' }).first();
    const vendorCard = cards.filter({ hasText: 'Qualified leads from active investor projects' }).first();

    // Get bounding boxes
    const investorBox = await investorCard.boundingBox();
    const teamBox = await teamCard.boundingBox();
    const vendorBox = await vendorCard.boundingBox();

    expect(investorBox).not.toBeNull();
    expect(teamBox).not.toBeNull();
    expect(vendorBox).not.toBeNull();

    // Verify vertical stacking:
    // teamCard should be below investorCard
    expect(teamBox!.y).toBeGreaterThan(investorBox!.y + investorBox!.height - 15);
    // vendorCard should be below teamCard
    expect(vendorBox!.y).toBeGreaterThan(teamBox!.y + teamBox!.height - 15);
  });
});
