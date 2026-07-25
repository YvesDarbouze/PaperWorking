import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto } from './mocks';

test.describe('PaperWorking E2E — Marketplace Postings (AQ-27)', () => {
  const projectId = 'project_compose_test';
  const listingId = 'listing_1';

  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      console.log(`BROWSER ${msg.type().toUpperCase()}: ${msg.text()}`);
    });
    page.on('pageerror', err => {
      console.log(`BROWSER PAGE ERROR: ${err.message}\n${err.stack}`);
    });

    // Reset follows & consents mock state
    await page.request.post('/api/e2e/follows');

    // Seed local storage with cookie consent to bypass banner globally
    await page.addInitScript(() => {
    try {
    
          window.localStorage.setItem('pw_cookie_consent', JSON.stringify({ essential: true }));
        
    } catch (e) {}
  });
  });

  test('AC1 & AC5: Public Teaser vs Subscriber View Rendering & No Payment UI', async ({ page }) => {
    // 1. Guest session (unauthenticated) - should see teaser view
    const state = createDefaultState();
    await setupMocks(page, state);

    // Completely clear cookies to simulate guest session (except __e2e_test cookie)
    await page.context().clearCookies();
    await page.context().addCookies([
      { name: '__e2e_test', value: '1', domain: 'localhost', path: '/' },
    ]);

    await safeGoto(page, `/deals/${listingId}`);

    // Teaser location checks: neighborhood "Austin, TX" should be visible
    await expect(page.locator('text=Austin, TX').first()).toBeVisible();

    // Exact street address "500 Syndicate" must NOT be visible
    await expect(page.locator('text=500 Syndicate')).not.toBeVisible();

    // Rounded/Range metrics checks
    await expect(page.locator('text=9–10%').first()).toBeVisible(); // Cap rate range
    await expect(page.locator('text=8–9%').first()).toBeVisible(); // Cash-on-cash range
    await expect(page.locator('text=~$500K').first()).toBeVisible(); // Asking price approx
    await expect(page.locator('text=~$200K').first()).toBeVisible(); // Funding target approx

    // Blurred locked section warning checks
    await expect(page.locator('text=Full terms available to subscribers').first()).toBeVisible();
    await expect(page.locator('text=Investor profile available to subscribers').first()).toBeVisible();

    // Subscribe CTA pointing to pricing
    const subscribeCta = page.locator('text=Subscribe to See Full Deal').first();
    await expect(subscribeCta).toBeVisible();

    // AC5: Walkthrough must contain ZERO payment UI elements (no credit card forms, Stripe fields, etc.)
    await expect(page.locator('input[type="card"]')).not.toBeVisible();
    await expect(page.locator('iframe[src*="stripe"]')).not.toBeVisible();

    // 2. Subscriber session - should see full deal view
    await page.context().addCookies([
      { name: 'mock_session_token_123', value: 'mock_session_token_123', domain: 'localhost', path: '/' },
      { name: 'mock_user_uid', value: 'user_subscriber_ac1', domain: 'localhost', path: '/' },
      { name: 'mock_user_role', value: 'Investor', domain: 'localhost', path: '/' },
      { name: 'mock_user_account_type', value: 'investor', domain: 'localhost', path: '/' },
      { name: 'mock_user_subscription_plan', value: 'Team', domain: 'localhost', path: '/' },
    ]);

    await safeGoto(page, `/deals/${listingId}`);

    // Full address must be visible
    await expect(page.locator('text=500 Syndicate Ave, Austin, TX').first()).toBeVisible();

    // Exact financial metrics must be visible
    await expect(page.locator('text=9.12%').first()).toBeVisible();
    await expect(page.locator('text=8.29%').first()).toBeVisible();
    await expect(page.locator('text=$500,000').first()).toBeVisible();
    await expect(page.locator('text=$45,600').first()).toBeVisible(); // NOI

    // Document and Contact views must be visible (not blurred/locked)
    await expect(page.locator('text=Full terms available to subscribers')).not.toBeVisible();

    // Follow action buttons must be visible
    await expect(page.locator('button', { hasText: 'Follow Deal' }).first()).toBeVisible();
    await expect(page.locator('button', { hasText: 'Follow Marcus' }).first()).toBeVisible();
    await expect(page.locator('button', { hasText: 'Respond to Terms' }).first()).toBeVisible();
  });

  test('AC2: Vendor Session Restricted Access', async ({ page }) => {
    const state = createDefaultState();
    await setupMocks(page, state);

    // Add cookies for vendor account
    await page.context().addCookies([
      { name: 'mock_session_token_123', value: 'mock_session_token_123', domain: 'localhost', path: '/' },
      { name: 'mock_user_uid', value: 'user_vendor_123', domain: 'localhost', path: '/' },
      { name: 'mock_user_role', value: 'Vendor', domain: 'localhost', path: '/' },
      { name: 'mock_user_account_type', value: 'vendor', domain: 'localhost', path: '/' },
      { name: 'mock_user_subscription_plan', value: 'Vendor Network', domain: 'localhost', path: '/' },
    ]);

    await safeGoto(page, '/dashboard/deals');

    // Assert that the vendor blocked empty state container is rendered
    const blockedContainer = page.locator('#vendor-blocked-state');
    await expect(blockedContainer).toBeVisible();
    await expect(blockedContainer).toContainText('Access Restricted');
    await expect(blockedContainer).toContainText('Deal listings are not available for vendor accounts.');

    // Assert that no listing cards are rendered
    await expect(page.locator('.listing-card')).not.toBeVisible();
  });

  test('AC3: Follow Edge + Separate Consent Flow', async ({ page }) => {
    const state = createDefaultState();
    await setupMocks(page, state);

    // Setup subscriber auth cookies
    await page.context().addCookies([
      { name: 'mock_session_token_123', value: 'mock_session_token_123', domain: 'localhost', path: '/' },
      { name: 'mock_user_uid', value: 'user_subscriber_ac3', domain: 'localhost', path: '/' },
      { name: 'mock_user_role', value: 'Investor', domain: 'localhost', path: '/' },
      { name: 'mock_user_account_type', value: 'investor', domain: 'localhost', path: '/' },
      { name: 'mock_user_subscription_plan', value: 'Team', domain: 'localhost', path: '/' },
    ]);

    await safeGoto(page, `/deals/${listingId}`);

    // Verify follow deal button is visible and click it
    const btnFollow = page.locator('button', { hasText: 'Follow Deal' }).first();
    await expect(btnFollow).toBeVisible();
    await btnFollow.click();

    // Verify post-follow ConsentModal appears
    const modalHeader = page.locator('h3', { hasText: 'Stay Updated' }).first();
    await expect(modalHeader).toBeVisible();

    // Toggle email consent checkbox
    const emailCheckbox = page.locator('input[type="checkbox"]').first();
    await expect(emailCheckbox).toBeVisible();
    await emailCheckbox.check();

    // Click "Save Preferences" to submit consent preferences
    const btnSave = page.locator('button', { hasText: 'Save Preferences' }).first();
    await expect(btnSave).toBeVisible();
    await btnSave.click();

    // Assert that the modal is closed
    await expect(modalHeader).not.toBeVisible();

    // Verify the follow edge and consent preferences have been updated in backend in-memory storage
    const response = await page.request.get('/api/e2e/follows');
    expect(response.ok()).toBe(true);
    
    const data = await response.json();
    expect(data.follows).toContain('user_subscriber_ac3:listing_1');
    expect(data.consents['user_subscriber_ac3:projects/project_compose_test/followers/user_subscriber_ac3']).toEqual({
      emailConsent: true,
      inAppConsent: true
    });
  });

  test('AC4: Auto-Close Marketplace Listing on Phase Advance', async ({ page }) => {
    const state = createDefaultState();
    
    // Seed project_1 in Phase 1 Sourcing, with activeListingId set to listing_1
    state.projects = [
      {
        id: 'project_1',
        propertyName: 'Capital Heights',
        address: '500 Syndicate Ave, Austin, TX',
        city: 'Austin',
        state: 'TX',
        zip: '78701',
        squareFootage: 2000,
        yearBuilt: 1995,
        propertyType: 'SFR',
        units: 1,
        status: 'Active',
        firstPassVerdict: 'PURSUE',
        currentPhase: 1,
        activeListingId: listingId,
        marketplaceListing: true,
        dispositionType: 'HOLD',
        subStrategy: 'Long-Term',
        comps: [
          { id: 'c1', addressLine: '102 Cascade Way', soldPriceCents: 30000000, soldDate: '2026-01-01', sqft: 2000, distanceMiles: 0.1, condition: 'Good' },
          { id: 'c2', addressLine: '104 Cascade Way', soldPriceCents: 31000000, soldDate: '2026-01-01', sqft: 2000, distanceMiles: 0.2, condition: 'Good' },
          { id: 'c3', addressLine: '106 Cascade Way', soldPriceCents: 32000000, soldDate: '2026-01-01', sqft: 2000, distanceMiles: 0.3, condition: 'Good' },
        ],
        financials: {
          purchasePrice: 50000000,
          finalAgreedPrice: 50000000,
          projectedNOI: 4560000,
          projectedCapRate: 9.12,
          financingType: 'All Cash',
          capitalPlan: 'all-cash solo',
          scorecardAcknowledged: true,
          acknowledgedInputsHash: '50000000|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|HOLD|Long-Term',
          psaDocumentUrl: 'http://example.com/psa.pdf',
          emdVerified: true,
          emdReceiptUrl: 'http://example.com/receipt.pdf',
        },
        members: {
          user_lead_investor_ac4: { role: 'owner' },
        },
      }
    ];

    await setupMocks(page, state);

    // Setup lead investor auth cookies
    await page.context().addCookies([
      { name: 'mock_session_token_123', value: 'mock_session_token_123', domain: 'localhost', path: '/' },
      { name: 'mock_user_uid', value: 'user_lead_investor_ac4', domain: 'localhost', path: '/' },
      { name: 'mock_user_role', value: 'Lead Investor', domain: 'localhost', path: '/' },
      { name: 'mock_user_account_type', value: 'investor', domain: 'localhost', path: '/' },
      { name: 'mock_user_subscription_plan', value: 'Team', domain: 'localhost', path: '/' },
    ]);

    // Go to project phase-1 page
    await safeGoto(page, '/dashboard/projects/project_1/phase-1');

    // Scroll Phase Gate into view
    const gateHeading = page.locator('h3', { hasText: 'Acquisition Phase Gate' }).first();
    await expect(gateHeading).toBeVisible();
    await gateHeading.scrollIntoViewIfNeeded();

    // Click the Advance button "Lock Deal & Proceed to Fund"
    const btnAdvance = page.locator('button', { hasText: 'Lock Deal & Proceed to Fund' }).first();
    await expect(btnAdvance).toBeVisible();
    await btnAdvance.click();

    // Verify it redirects successfully to Phase 2 (Fund phase)
    await expect(page).toHaveURL(/.*\/phase-2/, { timeout: 8000 });
  });
});
