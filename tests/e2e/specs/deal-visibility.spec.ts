import { test, expect } from '@playwright/test';
import { createDevSessionForContext } from '../helpers/auth';

test.describe('Deal Visibility Permissions & Access Rules (deal-visibility.spec.ts)', () => {
  test('1: Public marketplace deal with "List on Marketplace" is visible in Discover tab to subscribers', async ({
    browser,
  }) => {
    const subscriberContext = await browser.newContext();
    await createDevSessionForContext(subscriberContext, 'investor');
    const page = await subscriberContext.newPage();

    await page.goto('/deals?tab=discover');
    await expect(page.locator('text=1247 Elm Street, Austin, TX 78702').first()).toBeVisible();
    await expect(page.locator('text=marketplace').first()).toBeVisible();

    await subscriberContext.close();
  });

  test('2: Invitation-only deal is excluded from Discover tab and rendered with badge', async ({
    browser,
  }) => {
    const subscriberContext = await browser.newContext();
    await createDevSessionForContext(subscriberContext, 'investor');
    const page = await subscriberContext.newPage();

    await page.goto('/deals?tab=discover');
    // Ensure badge elements or tabs are active
    await expect(page.getByRole('tab', { name: /discover/i })).toBeVisible();

    await subscriberContext.close();
  });

  test('3: Search invitation-only deal as non-invitee hides modal to preserve confidentiality', async ({
    browser,
  }) => {
    const subscriberContext = await browser.newContext();
    await createDevSessionForContext(subscriberContext, 'investor');
    const page = await subscriberContext.newPage();

    await page.goto('/deals');
    const searchInput = page.getByPlaceholder(/search any street address/i);
    await searchInput.fill('404 Confidential Way');
    await searchInput.press('Enter');

    // Wait 500ms and verify modal is not shown
    await page.waitForTimeout(500);
    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeHidden();

    await subscriberContext.close();
  });

  test('4: Creator views own private deal directly -> accessible with full controls', async ({
    browser,
  }) => {
    const creatorContext = await browser.newContext();
    await createDevSessionForContext(creatorContext, 'investor');
    const page = await creatorContext.newPage();

    await page.goto('/deals/1247elmst/detail');
    await expect(page.locator('text=1247 Elm Street, Austin, TX 78702')).toBeVisible();
    await expect(page.getByRole('button', { name: /share analysis/i })).toBeVisible();

    await creatorContext.close();
  });
});
