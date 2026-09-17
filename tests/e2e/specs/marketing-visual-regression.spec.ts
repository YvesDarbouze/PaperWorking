import { test, expect } from '@playwright/test';

test.describe('Marketing Visual Regression & Responsive Breakpoints Tests', () => {
  test('verify desktop layout and styling rules at 1440px', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    // 1. Assert hamburger menu is NOT visible on 1440px desktop
    const hamburgerBtn = page.getByRole('button', { name: /open menu|close menu/i });
    await expect(hamburgerBtn).toBeHidden();

    // 2. Assert desktop navigation links and CTAs are visible
    await expect(page.locator('header nav a:has-text("How it works")')).toBeVisible();
    await expect(page.locator('header nav a:has-text("Pricing")')).toBeVisible();
    await expect(page.locator('header nav a:has-text("Marketplace")')).toBeVisible();
    await expect(page.locator('header nav a:has-text("Log in")')).toBeVisible();
    await expect(page.locator('header nav a:has-text("Get started")')).toBeVisible();

    // 3. Assert max-width containers center content
    const container = page.locator('header nav, main > section > div.max-w-\\[1280px\\], div.max-w-\\[1200px\\]').first();
    const containerBox = await container.boundingBox();
    if (containerBox) {
      expect(containerBox.x).toBeGreaterThanOrEqual(0);
      expect(containerBox.x + containerBox.width).toBeLessThanOrEqual(1440);
    }

    // 4. Assert no white background in main layout elements
    const whiteBgCount = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('body, main, section, header, footer, .glass-card'));
      return elements.filter(el => {
        const bg = window.getComputedStyle(el).backgroundColor;
        return bg === 'rgb(255, 255, 255)' || bg === '#ffffff' || bg === '#fff';
      }).length;
    });
    expect(whiteBgCount).toBe(0);

    // 5. Assert primary accent color is #00DD94 (rgb(0, 221, 148)) on the CTA button
    const getStartedCta = page.locator('header nav a:has-text("Get started")').first();
    await expect(getStartedCta).toBeVisible();
    const ctaBgColor = await getStartedCta.evaluate(el => window.getComputedStyle(el).backgroundColor);
    expect(ctaBgColor).toBe('rgb(0, 221, 148)');

    // 6. Assert logo width <= 50% of container
    const logo = page.locator('header a').first();
    const logoBox = await logo.boundingBox();
    const headerBox = await page.locator('header nav').boundingBox();
    if (logoBox && headerBox) {
      expect(logoBox.width).toBeLessThanOrEqual(headerBox.width * 0.5);
    }

    // 7. Capture screenshots
    await page.screenshot({ path: '/Users/yvesdarbouze/.gemini/antigravity/brain/1a994a01-ffd4-4b38-8621-1011ac1a3de7/visual-regression-home-1440.png' });

    // Visit pricing and capture
    await page.goto('/pricing');
    await page.screenshot({ path: '/Users/yvesdarbouze/.gemini/antigravity/brain/1a994a01-ffd4-4b38-8621-1011ac1a3de7/visual-regression-pricing-1440.png' });
  });

  test('verify tablet layout at 768px and 1024px', async ({ page }) => {
    // Check 1024px
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/');
    const hamburger1024 = page.getByRole('button', { name: /open menu|close menu/i });
    await expect(hamburger1024).toBeHidden();
    await expect(page.locator('header nav a:has-text("How it works")')).toBeVisible();

    // Check 768px
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    const hamburger768 = page.getByRole('button', { name: /open menu|close menu/i });
    await expect(hamburger768).toBeHidden();
    await expect(page.locator('header nav a:has-text("How it works")')).toBeVisible();

    // Assert grids collapse gracefully without horizontal overflow
    const overflow768 = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth + 2;
    });
    expect(overflow768).toBe(false);
  });

  test('verify mobile layout, touch targets, and hamburger behavior at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');

    // 1. Assert NO horizontal overflow on 375px mobile
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth + 2;
    });
    expect(hasHorizontalOverflow).toBe(false);

    // 2. Assert desktop center links and right actions are hidden
    await expect(page.locator('header nav div.md\\:flex')).toBeHidden();

    // 3. Assert hamburger button IS VISIBLE on mobile and meets touch target sizing
    const hamburgerBtn = page.getByRole('button', { name: /open menu|close menu/i });
    await expect(hamburgerBtn).toBeVisible();
    const btnBox = await hamburgerBtn.boundingBox();
    if (btnBox) {
      expect(btnBox.height).toBeGreaterThanOrEqual(40);
      expect(btnBox.width).toBeGreaterThanOrEqual(40);
    }

    // 4. Click hamburger menu and verify drawer opens
    await hamburgerBtn.click();
    const drawer = page.locator('nav.backdrop-blur-\\[20px\\]');
    await expect(drawer).toBeVisible();

    // Verify drawer contents
    await expect(drawer.getByRole('link', { name: 'How it works' })).toBeVisible();
    await expect(drawer.getByRole('link', { name: 'Pricing' })).toBeVisible();
    await expect(drawer.getByRole('link', { name: 'Marketplace' })).toBeVisible();
    await expect(drawer.getByRole('link', { name: 'Log in' })).toBeVisible();
    await expect(drawer.getByRole('link', { name: 'Get started' })).toBeVisible();

    // 5. Capture mobile screenshot
    await page.screenshot({ path: '/Users/yvesdarbouze/.gemini/antigravity/brain/1a994a01-ffd4-4b38-8621-1011ac1a3de7/visual-regression-home-375.png' });
  });
});
