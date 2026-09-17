import { test, expect } from '@playwright/test';
import path from 'node:path';

const ARTIFACT_DIR = '/Users/yvesdarbouze/.gemini/antigravity/brain/8312b5bb-528d-4886-bc62-750a696e3c05';
const EXPECTED_HEADLINE = 'BLOOMBERG TERMINAL FOR REAL ESTATE INVESTORS';
const LEGACY_STRING = ['REAL', 'ESTATE', 'BLOOMBERG', 'TERMINAL'].join(' ');

test.describe('Pricing Page Copy Standardization & Responsive Verification', () => {
  test('Pricing Page (/pricing) - Desktop (1280px) & Mobile (375px)', async ({ page }) => {
    // 1. Desktop 1280px
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/pricing');

    const bodyContent = await page.textContent('body');
    expect(bodyContent).toContain(EXPECTED_HEADLINE);
    expect(bodyContent).not.toContain(LEGACY_STRING);

    const headline = page.getByRole('heading', { level: 1, name: EXPECTED_HEADLINE });
    await expect(headline).toBeVisible();

    await expect(page.getByRole('heading', { level: 3, name: 'Investor', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: 'Investment Team', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: 'Vendor', exact: true })).toBeVisible();

    // Verify zero horizontal overflow on desktop
    const desktopOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(desktopOverflow).toBe(false);

    const pricingSection = page.locator('#pricing');
    await pricingSection.screenshot({
      path: path.join(ARTIFACT_DIR, 'pricing-page-desktop-1280.png'),
    });

    // 2. Mobile 375px
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/pricing');

    const mobileContent = await page.textContent('body');
    expect(mobileContent).toContain(EXPECTED_HEADLINE);
    expect(mobileContent).not.toContain(LEGACY_STRING);

    const mobileHeadline = page.getByRole('heading', { level: 1, name: EXPECTED_HEADLINE });
    await expect(mobileHeadline).toBeVisible();

    // Verify zero horizontal overflow on mobile
    const mobileOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(mobileOverflow).toBe(false);

    const mobileSection = page.locator('#pricing');
    await mobileSection.screenshot({
      path: path.join(ARTIFACT_DIR, 'pricing-page-mobile-375.png'),
    });
  });
});
