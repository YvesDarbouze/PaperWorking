import { test, expect } from '@playwright/test';

const PRE_SIGN_IN_PAGES = ['/home', '/pricing', '/how-it-works', '/support', '/login'];

test.describe('Marketing Brand Tokens & Design Rules', () => {
  for (const route of PRE_SIGN_IN_PAGES) {
    test(`route ${route} respects color, background, and logo constraints`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(route);

      // 1. Assert computed primary color is #00DD94 (rgb(0, 221, 148))
      const primaryColor = await page.evaluate(() => {
        const rootStyle = getComputedStyle(document.documentElement);
        const bodyStyle = getComputedStyle(document.body);
        return rootStyle.getPropertyValue('--color-primary').trim() ||
               bodyStyle.getPropertyValue('--color-primary').trim();
      });
      const primaryLower = primaryColor.toLowerCase();
      expect(
        primaryLower === '#00dd94' ||
        primaryLower === 'rgb(0, 221, 148)' ||
        primaryLower.includes('00dd94')
      ).toBeTruthy();

      // 2. Assert body background-color is not rgb(255, 255, 255)
      const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      expect(bodyBg).not.toBe('rgb(255, 255, 255)');
      expect(bodyBg).not.toBe('#ffffff');

      // 3. Assert logo width <= 50% container
      const logoLink = page.locator('a[aria-label*="homepage"], a[aria-label*="PaperWorking"]').first();
      if (await logoLink.count() > 0) {
        const logoBox = await logoLink.boundingBox();
        const parent = logoLink.locator('xpath=..');
        const parentBox = await parent.boundingBox();
        if (logoBox && parentBox) {
          expect(logoBox.width).toBeLessThanOrEqual(parentBox.width * 0.5 + 1); // 1px rounding buffer
        }
      }
    });
  }
});
