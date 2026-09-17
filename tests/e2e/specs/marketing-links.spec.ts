import { test, expect } from '@playwright/test';

test.describe('Marketing Navigation & Links Tests', () => {
  test('verify navbar links navigation targets', async ({ page }) => {
    await page.goto('/');

    // 1. Click "How it works" nav link
    const howItWorksLink = page.locator('header nav a:has-text("How it works")').first();
    await expect(howItWorksLink).toBeVisible();
    await howItWorksLink.click();
    await expect(page).toHaveURL(/.*#how-it-works/);

    // 2. Click "Pricing" nav link
    const pricingLink = page.locator('header nav a:has-text("Pricing")').first();
    await expect(pricingLink).toBeVisible();
    await pricingLink.click();
    await expect(page).toHaveURL(/.*\/pricing/);

    // 3. Click "Get started" CTA button
    await page.goto('/');
    const getStartedLink = page.locator('header nav a:has-text("Get started")').first();
    await expect(getStartedLink).toBeVisible();
    await getStartedLink.click();
    await expect(page).toHaveURL(/.*\/signup/);

    // 4. Click "Log in" nav link
    await page.goto('/');
    const logInLink = page.locator('header nav a:has-text("Log in")').first();
    await expect(logInLink).toBeVisible();
    await logInLink.click();
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('verify all footer links resolve without 404s', async ({ page }) => {
    await page.goto('/');

    const footerLinks = page.locator('footer a');
    const count = await footerLinks.count();
    const urls: string[] = [];

    for (let i = 0; i < count; i++) {
      const href = await footerLinks.nth(i).getAttribute('href');
      if (href && !href.startsWith('mailto:') && !href.startsWith('tel:') && !href.includes('/changelog')) {
        urls.push(new URL(href, page.url()).toString());
      }
    }

    const uniqueUrls = Array.from(new Set(urls));

    for (const url of uniqueUrls) {
      const response = await page.goto(url);
      expect(response).not.toBeNull();
      expect(response!.status()).toBeLessThan(400); // 200, 301, 302 are fine
    }
  });
});
