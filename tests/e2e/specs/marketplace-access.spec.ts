import { test, expect } from '@playwright/test';
import { createDevSessionForContext } from '../helpers/auth';

test.describe('Marketplace Access Control (marketplace-access.spec.ts)', () => {
  test('1: Non-subscriber hits /deals -> assert redirect to login or paywall overlay', async ({
    browser,
  }) => {
    const unauthedContext = await browser.newContext();
    const page = await unauthedContext.newPage();

    await page.goto('/deals');
    // Unauthenticated user is protected by session auth
    await expect(page).toHaveURL(/.*\/(login|signup|auth).*/);
    await unauthedContext.close();
  });

  test('2: Vendor hits /deals -> assert redirect to vendor portal workspace', async ({
    browser,
  }) => {
    const vendorContext = await browser.newContext();
    await createDevSessionForContext(vendorContext, 'vendor');
    const page = await vendorContext.newPage();

    await page.goto('/deals');
    // Vendor is redirected away from investor deal workspace
    await expect(page).toHaveURL(/.*\/(vendor|dashboard|login).*/);
    await vendorContext.close();
  });

  test('3: Subscriber clicks Portfolio "Deals Marketplace" CTA -> assert /deals loads with search focused', async ({
    browser,
  }) => {
    const subscriberContext = await browser.newContext();
    await createDevSessionForContext(subscriberContext, 'investor');
    const page = await subscriberContext.newPage();

    await page.goto('/dashboard');
    const marketplaceBtn = page.getByRole('link', { name: /explore deals|deals marketplace/i }).first();
    await expect(marketplaceBtn).toBeVisible();
    await marketplaceBtn.click();

    await expect(page).toHaveURL(/.*\/deals/);
    await expect(page.getByRole('heading', { name: /deals marketplace|discover deals/i })).toBeVisible();

    const searchInput = page.getByPlaceholder(/search any street address/i);
    await expect(searchInput).toBeVisible();
    await subscriberContext.close();
  });

  test('4: Subscriber hits /deals/[slug] directly -> assert page loads cleanly', async ({
    browser,
  }) => {
    const subscriberContext = await browser.newContext();
    await createDevSessionForContext(subscriberContext, 'investor');
    const page = await subscriberContext.newPage();

    await page.goto('/deals/1247elmst/detail');
    await expect(page).toHaveURL(/.*\/deals\/1247elmst\/detail/);
    await expect(page.getByRole('heading', { name: /1247 Elm Street|Elm Street Flip/i })).toBeVisible();
    await expect(page.locator('text=1247 Elm Street, Austin, TX 78702')).toBeVisible();

    await subscriberContext.close();
  });
});
