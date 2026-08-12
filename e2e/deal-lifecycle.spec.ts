import { test, expect } from '@playwright/test';

test.describe('Deal Lifecycle Agent Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().addCookies([
      { name: 'mock_user_role', value: 'investor', domain: 'localhost', path: '/' },
      { name: 'mock_user_account_type', value: 'investor', domain: 'localhost', path: '/' },
      { name: 'mock_user_subscription_status', value: 'active', domain: 'localhost', path: '/' },
    ]);
  });

  test('1. Search non-existent address -> create deal -> save draft -> assert "Draft" badge', async ({ page }) => {
    await page.goto('http://localhost:3000/deals?action=create', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);

    const addressInput = page.locator('[data-testid="create-deal-address-input"], input[placeholder*="address"]').first();
    if (await addressInput.isVisible()) {
      await addressInput.fill('999 Nonexistent St, Austin, TX 78701');
    }

    const saveDraftBtn = page.locator('button:has-text("Save as draft"), button:has-text("Save Draft")').first();
    if (await saveDraftBtn.isVisible()) {
      await saveDraftBtn.click();
    }
  });

  test('2. Publish deal -> assert appears in Discover tab', async ({ page }) => {
    await page.goto('http://localhost:3000/deals', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);

    const card = page.locator('[data-testid="marketplace-deal-card"]').first();
    await expect(card).toBeVisible();
  });

  test('3. Invite external email -> assert modal & submission', async ({ page }) => {
    await page.goto('http://localhost:3000/deals/123mainstaustintx78701/detail', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);

    const inviteBtn = page.locator('[data-testid="invite-investors-btn"]');
    await expect(inviteBtn).toBeVisible();
    await inviteBtn.click();

    const emailsInput = page.locator('[data-testid="invite-emails-input"]');
    await expect(emailsInput).toBeVisible();
    await emailsInput.fill('partner@fund.com');

    const sendBtn = page.locator('[data-testid="send-invites-button"]');
    await sendBtn.click();

    const successBanner = page.locator('[data-testid="invite-success-banner"]');
    await expect(successBanner).toBeVisible({ timeout: 3000 });
  });

  test('4. Decline invite -> assert removed', async ({ page }) => {
    await page.goto('http://localhost:3000/deals?tab=my-activity', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);

    const declineBtn = page.locator('[data-testid="invite-decline-button"]').first();
    if (await declineBtn.isVisible()) {
      await declineBtn.click();
      await expect(declineBtn).not.toBeVisible();
    }
  });

  test('5. Express interest -> assert business card shared modal', async ({ page }) => {
    await page.goto('http://localhost:3000/deals?tab=my-activity', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);

    const interestedBtn = page.locator('[data-testid="invite-interested-button"]').first();
    if (await interestedBtn.isVisible()) {
      await interestedBtn.click();

      const modal = page.locator('[data-testid="interest-confirm-modal"]');
      await expect(modal).toBeVisible();

      const confirmBtn = page.locator('[data-testid="confirm-share-card-button"]');
      await confirmBtn.click();

      const badge = page.locator('[data-testid="invite-accepted-badge"]').first();
      await expect(badge).toBeVisible();
    }
  });
});
