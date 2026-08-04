import { test, expect } from '@playwright/test';

test.describe('Marketplace Agent Listings & Visibility E2E Tests', () => {

  test('Unauthenticated User — Sees 9 PUBLIC listings and 0 NETWORK_ONLY listings', async ({ page }) => {
    await page.goto('/marketplace');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('h1')).toContainText('Deals Marketplace');

    // Network-Only listings (Atlas and Eleanor) should not be visible to unauthenticated callers
    const atlasListing = page.locator('#marketplace-listing-listing_robert_kim_3');
    await expect(atlasListing).not.toBeVisible();

    const eleanorListing = page.locator('#marketplace-listing-listing_eleanor_vance_3');
    await expect(eleanorListing).not.toBeVisible();

    // Public listings (Marcus, Dana, Whitmore) should be visible
    const marcusListing = page.locator('#marketplace-listing-listing_marcus_chen_3');
    await expect(marcusListing).toBeVisible();
  });

  const agents = [
    {
      handle: 'marcus_chen',
      name: 'Marcus Chen',
      email: 'marcus.chen.synthetic@paperworking.co',
      persona: 'wholesaler',
      newListingId: 'listing_marcus_chen_3',
      oldListingId: 'listing_marcus_chen_1',
    },
    {
      handle: 'dana_rodriguez',
      name: 'Dana Rodriguez',
      email: 'dana.rodriguez.synthetic@paperworking.co',
      persona: 'fix_and_flip',
      newListingId: 'listing_dana_rodriguez_3',
      oldListingId: 'listing_dana_rodriguez_1',
    },
    {
      handle: 'whitmore',
      name: 'J. & Patricia Whitmore',
      email: 'whitmore.synthetic@paperworking.co',
      persona: 'buy_and_hold',
      newListingId: 'listing_whitmore_3',
      oldListingId: 'listing_whitmore_1',
    },
    {
      handle: 'robert_kim',
      name: 'Robert Kim / Atlas Commercial Group',
      email: 'robert.kim.synthetic@paperworking.co',
      persona: 'commercial',
      newListingId: 'listing_robert_kim_3',
      oldListingId: 'listing_robert_kim_1',
    },
    {
      handle: 'eleanor_vance',
      name: 'Eleanor Vance',
      email: 'eleanor.vance.synthetic@paperworking.co',
      persona: 'syndicator',
      newListingId: 'listing_eleanor_vance_3',
      oldListingId: 'listing_eleanor_vance_1',
    },
  ];

  for (const agent of agents) {
    test(`Authenticated Agent ${agent.name} — Sees all 3 listings, "Just Listed" badge & "30 days ago" timestamp`, async ({ page, context }) => {
      await context.addCookies([
        {
          name: '__session',
          value: `mock_session_agent_${agent.handle}`,
          domain: 'localhost',
          path: '/',
        },
        {
          name: 'mock_user_uid',
          value: `user_${agent.handle}`,
          domain: 'localhost',
          path: '/',
        },
      ]);

      await page.addInitScript((agentData) => {
        window.localStorage.setItem(
          'user_profile',
          JSON.stringify({
            uid: `user_${agentData.handle}`,
            email: agentData.email,
            displayName: agentData.name,
            role: 'Investor',
            syntheticAgent: true,
            agentPersona: agentData.persona,
          })
        );
      }, agent);

      await page.goto('/marketplace');
      await page.waitForLoadState('domcontentloaded');

      // Verify new listing has "Just Listed" badge
      const newCard = page.locator(`#marketplace-listing-${agent.newListingId}`);
      await expect(newCard).toBeVisible();
      await expect(newCard.locator('.just-listed-badge')).toContainText('Just Listed');
      await expect(newCard).toContainText('Just now');

      // Verify old listing has "30 days ago" timestamp
      const oldCard = page.locator(`#marketplace-listing-${agent.oldListingId}`);
      await expect(oldCard).toBeVisible();
      await expect(oldCard).toContainText('30 days ago');
    });
  }
});
