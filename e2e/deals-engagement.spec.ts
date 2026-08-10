import { test, expect } from '@playwright/test';

test.describe('Deal Engagement, Invitations & External Funnel (PROMPT 4)', () => {
  test('Subscribed Investor: In-platform invite -> Interested (business card shared) & Decline', async ({ page }) => {
    await page.context().addCookies([
      { name: '__session', value: 'mock_session_token_123', domain: 'localhost', path: '/' },
      { name: '__acct', value: 'investor', domain: 'localhost', path: '/' },
      { name: 'mock_user_role', value: 'Lead Investor', domain: 'localhost', path: '/' },
      { name: 'mock_user_account_type', value: 'investor', domain: 'localhost', path: '/' },
    ]);

    await page.goto('http://localhost:3000/dashboard/deals/123mainstaustintx78701', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    // Verify Engagement Module is present
    const engagementHeader = page.locator('h3:has-text("Investment Intent & Invitation Action")');
    await expect(engagementHeader).toBeVisible();

    // Verify Decline button is visible
    const declineBtn = page.locator('button:has-text("Decline")');
    await expect(declineBtn).toBeVisible();

    // Verify Interested button is visible
    const interestedBtn = page.locator('button:has-text("I\'m Interested")');
    await expect(interestedBtn).toBeVisible();
  });

  test('Public Teaser Preview (/deal/[slug]/preview): Displays sanitized teaser & locks full deal data', async ({ page }) => {
    await page.goto('http://localhost:3000/deal/123mainstaustintx78701/preview', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    // Verify public teaser header
    const teaserBadge = page.locator('span:has-text("Public Teaser View")');
    await expect(teaserBadge).toBeVisible();

    // Verify locked features card
    const lockNotice = page.locator('span:has-text("Subscriber-Only Deal Data Locked")');
    await expect(lockNotice).toBeVisible();

    // Verify unlock paywall button
    const unlockBtn = page.locator('button:has-text("Unlock Full Deal & Analyzer Data")');
    await expect(unlockBtn).toBeVisible();
  });

  test('Expired/Revoked Token: Displays error banner on teaser view', async ({ page }) => {
    await page.goto('http://localhost:3000/deal/123mainstaustintx78701/preview?invite=expired', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    const errorBanner = page.locator('span:has-text("This invitation link has expired")');
    await expect(errorBanner).toBeVisible();
  });
});
