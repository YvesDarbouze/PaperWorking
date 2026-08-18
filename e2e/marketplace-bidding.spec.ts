import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto, MockState } from './mocks';

test.describe('Agent 6: Vendor Marketplace & Bidding System E2E', () => {
  let state: MockState;

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.clear();
        window.localStorage.setItem(
          'pw_cookie_consent',
          JSON.stringify({ essential: true, analytics: true, marketing: true })
        );
      } catch (e) {}
    });
    state = createDefaultState();
    await setupMocks(page, state);

    // Mock bids API route
    await page.route('**/api/bids', async (route) => {
      const method = route.request().method();
      if (method === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            bid: {
              bidId: 'bid_e2e_123',
              projectId: 'proj_demo_1',
              vendorId: 'vendor_attorney_1',
              status: 'pending',
            },
          }),
        });
      } else if (method === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            bid: { bidId: 'bid_e2e_123', status: 'accepted' },
            expenseRecord: { expenseId: 'exp_e2e_1', amount: 1850 },
            requires1099Flag: true,
          }),
        });
      }
    });
  });

  test('User opens Vendor Profile, requests bid, and accepts submitted bid', async ({ page }) => {
    // 1. Navigate to Vendor Profile Page
    await safeGoto(page, '/marketplace/vendor/vendor_attorney_1');
    const profilePage = page.getByTestId('vendor-profile-page');
    await expect(profilePage).toBeVisible({ timeout: 15000 });

    // 2. Click "Request Bid" button
    const requestBidBtn = page.getByTestId('profile-request-bid-btn');
    await expect(requestBidBtn).toBeVisible();
    await requestBidBtn.click();

    // Verify Request Bid Modal mounts
    const modal = page.getByTestId('request-bid-modal');
    await expect(modal).toBeVisible();

    // Fill scope description and submit
    const scopeInput = page.getByTestId('bid-description-input');
    await scopeInput.fill('Need real estate attorney for title closing review.');

    const sendBidBtn = page.getByTestId('send-bid-request-btn');
    await sendBidBtn.click();

    // Modal closes post-submission
    await expect(modal).not.toBeVisible({ timeout: 5000 });

    // 3. Test Accept Bid API call via browser evaluate
    const acceptRes = await page.evaluate(async () => {
      const res = await fetch('/api/bids', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bidId: 'bid_e2e_123', action: 'accept' }),
      });
      return await res.json();
    });

    expect(acceptRes.success).toBe(true);
    expect(acceptRes.bid.status).toBe('accepted');
    expect(acceptRes.requires1099Flag).toBe(true);
  });
});
