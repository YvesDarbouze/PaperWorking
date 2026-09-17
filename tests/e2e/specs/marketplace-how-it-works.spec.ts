import { test, expect } from '@playwright/test';

test.describe('E2E — Marketplace & How It Works (Phase 7d)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the marketing homepage
    await page.goto('/');
  });

  test('Marketplace section renders with content and two glass cards', async ({ page }) => {
    // 1. Eyebrow "MARKETPLACE" check
    const marketplaceEyebrow = page.locator('text=MARKETPLACE').first();
    await expect(marketplaceEyebrow).toBeVisible();

    // 2. Headline copy check
    const bodyCopy = page.locator(
      'text=PaperWorking is not only the most comprehensive real estate investment data visualization'
    ).first();
    await expect(bodyCopy).toBeVisible();

    // 3. Two glass cards check: Deal Marketplace & Vendor Marketplace
    const dealCard = page.locator('h3:has-text("Deal Marketplace")').first();
    const vendorCard = page.locator('h3:has-text("Vendor Marketplace")').first();
    await expect(dealCard).toBeVisible();
    await expect(vendorCard).toBeVisible();

    // 4. CTA Buttons check
    const browseButton = page.locator('a:has-text("Browse deals")').first();
    const listServicesButton = page.locator('a:has-text("List services")').first();
    await expect(browseButton).toBeVisible();
    await expect(listServicesButton).toBeVisible();
  });

  test('How It Works Header renders with title, REIL narrative, phase modules, and no mocked browser graphic', async ({ page }) => {
    // 1. How It Works Header checks
    const kicker = page.locator('text=Project Management software made specifically for real estate investor.').first();
    await expect(kicker).toBeVisible();

    const headline = page.locator('text=How the Real Estate Investment Lifecycle Works.').first();
    await expect(headline).toBeVisible();

    // 2. REIL Narrative check
    const narrativeLead = page.locator("text=The Real Estate Investment Lifecycle (REIL) is a system created to properly manage your real estate investments in 4 compartmentalized steps.").first();
    await expect(narrativeLead).toBeVisible();

    // 3. REIL Phase Modules check
    const phaseModules = page.locator('[data-testid="reil-phase-modules"]');
    await expect(phaseModules).toBeVisible();
    await expect(page.locator('[data-testid="reil-phase-acquisition"] h3')).toHaveText('Acquisition');
    await expect(page.locator('[data-testid="reil-phase-fund"] h3')).toHaveText('Fund');
    await expect(page.locator('[data-testid="reil-phase-hold"] h3')).toHaveText('Hold');
    await expect(page.locator('[data-testid="reil-phase-exit"] h3')).toHaveText('Exit');

    // 4. Verify mocked browser graphic is removed completely
    await expect(page.locator('text=paperworking.com/dashboard/portfolio')).toHaveCount(0);
    await expect(page.locator('text=Global Portfolio Dashboard')).toHaveCount(0);
    await expect(page.locator('text=Oakridge Duplex')).toHaveCount(0);
  });

  test('4-Phase Operational Engine renders properly in table layout on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    // Table Headers
    await expect(page.locator('text=Phase').first()).toBeVisible();
    await expect(page.locator('text=Operational Focus').first()).toBeVisible();
    await expect(page.locator('text=Financial & Risk Outputs').first()).toBeVisible();

    // Phases check
    await expect(page.locator('text=01.').first()).toBeVisible();
    await expect(page.locator('text=Acquisition').nth(1)).toBeVisible();
    await expect(page.locator('text=02.').first()).toBeVisible();
    await expect(page.locator('text=Fund').nth(1)).toBeVisible();
    await expect(page.locator('text=03.').first()).toBeVisible();
    await expect(page.locator('text=Hold').nth(1)).toBeVisible();
    await expect(page.locator('text=04.').first()).toBeVisible();
    await expect(page.locator('text=Exit').nth(1)).toBeVisible();

    // Outputs copy check
    await expect(page.locator('text=Baseline KPIs').first()).toBeVisible();
    await expect(page.locator('text=Projected Cap Rate, Cash-on-Cash, Pro Forma Baseline.').first()).toBeVisible();
  });

  test('4-Phase Operational Engine supports mobile accordion behavior', async ({ page }) => {
    // 1. Set mobile viewport size
    await page.setViewportSize({ width: 375, height: 667 });

    // Scope locators to the mobile-only section to avoid matching hidden desktop elements
    const mobileContainer = page.locator('.md\\:hidden');
    
    // 2. Open accordion check (01. Acquisition should be open by default, 02. Fund should be closed)
    const acquisitionFocus = mobileContainer.locator('text=Underwrite deals with live property data, model IRR, and gauge investor interest via the Deal Marketplace.');
    const fundFocus = mobileContainer.locator('text=Lock down earnest money dates, track inspection contingency windows, and store contracts in a secure vault.');
    
    await expect(acquisitionFocus).toBeVisible();
    await expect(fundFocus).not.toBeVisible();

    // 3. Click Fund header to toggle/open it
    const fundHeader = mobileContainer.locator('button:has-text("Fund")');
    await fundHeader.click();

    // 4. Verify Fund content is now visible
    await expect(fundFocus).toBeVisible();
  });

  test('All 4 lifecycle walkthrough sections render with mockups and values', async ({ page }) => {
    // Phase 1 section checks
    await expect(page.locator('text=Phase 01 · Acquisition').first()).toBeVisible();
    await expect(page.locator('text=Analyze Potential Deals with Live Data & Modeler').first()).toBeVisible();
    await expect(page.locator('text=1042 Oakridge Ln').first()).toBeVisible();
    await expect(page.locator('text=14.8%').first()).toBeVisible(); // IRR Output

    // Phase 2 section checks
    await expect(page.locator('text=Phase 02 · Fund').first()).toBeVisible();
    await expect(page.locator('text=Lock Down Financing & Contingency Deadlines').first()).toBeVisible();
    await expect(page.locator('text=Inspection Contingency').first()).toBeVisible();
    await expect(page.locator('text=Purchase_Agreement_Signed.pdf').first()).toBeVisible();

    // Phase 3 section checks
    await expect(page.locator('text=Phase 03 · Hold').first()).toBeVisible();
    await expect(page.locator('text=Manage Renovations, Cashflow, and Draw Invoices').first()).toBeVisible();
    await expect(page.locator('text=Roof Replacement').first()).toBeVisible();
    await expect(page.locator('text=HVAC Upgrade').first()).toBeVisible();

    // Phase 4 section checks
    await expect(page.locator('text=Phase 04 · Exit').first()).toBeVisible();
    await expect(page.locator('text=Compile CPA Exports & Lender-Grade Performance Packages').first()).toBeVisible();
    await expect(page.locator('text=Equity Multiple').first()).toBeVisible();
    await expect(page.locator('text=Lender-Grade Package (PDF)').first()).toBeVisible();
  });
});
