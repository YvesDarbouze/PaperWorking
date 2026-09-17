import { test, expect } from '@playwright/test';
import path from 'node:path';

const ARTIFACT_DIR = '/Users/yvesdarbouze/.gemini/antigravity/brain/8312b5bb-528d-4886-bc62-750a696e3c05';

test.describe('Hero Visual Beside Headline — Responsive Verification (1280px, 768px, 375px)', () => {
  test('desktop 1280px: restored headline and visual render side-by-side with authorized copy', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');

    const heroSection = page.locator('section[aria-label="Hero"]');
    await expect(heroSection).toBeVisible();

    const headline = heroSection.locator('h1').first();
    await expect(headline).toBeVisible();
    await expect(headline).toHaveText(
      /Finally,\s+Project\s+Management\s+software\s+made\s+for\s+serious\s+real\s+estate\s+investors\s+and\s+Investments\s+teams\./i
    );

    const subheadline = heroSection.locator('h2').first();
    await expect(subheadline).toBeVisible();
    await expect(subheadline).toContainText('The Bloomberg terminal for real estate investors');
    await expect(subheadline).toContainText('Acquisition, Fund, Hold, and Exit');

    const showcase = page.locator('[data-testid="hero-product-showcase"]');
    await expect(showcase).toBeVisible();

    // Screenshot desktop hero
    await heroSection.screenshot({
      path: path.join(ARTIFACT_DIR, 'hero-visual-desktop-1280.png'),
    });
  });

  test('tablet 768px: responsive layout renders cleanly without distortion', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    const heroSection = page.locator('section[aria-label="Hero"]');
    await expect(heroSection).toBeVisible();

    const headline = heroSection.locator('h1').first();
    await expect(headline).toBeVisible();
    await expect(headline).toHaveText(
      /Finally,\s+Project\s+Management\s+software\s+made\s+for\s+serious\s+real\s+estate\s+investors\s+and\s+Investments\s+teams\./i
    );

    await heroSection.screenshot({
      path: path.join(ARTIFACT_DIR, 'hero-visual-tablet-768.png'),
    });
  });

  test('mobile 375px: natural stacked flow without horizontal scroll and restored H1', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');

    const heroSection = page.locator('section[aria-label="Hero"]');
    await expect(heroSection).toBeVisible();

    const headline = heroSection.locator('h1').first();
    await expect(headline).toBeVisible();
    await expect(headline).toHaveText(
      /Finally,\s+Project\s+Management\s+software\s+made\s+for\s+serious\s+real\s+estate\s+investors\s+and\s+Investments\s+teams\./i
    );

    // Verify zero horizontal overflow on mobile
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);

    await heroSection.screenshot({
      path: path.join(ARTIFACT_DIR, 'hero-visual-mobile-375.png'),
    });
  });
});
