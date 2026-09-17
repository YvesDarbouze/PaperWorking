import { test, expect } from '@playwright/test';
import path from 'node:path';

const ARTIFACT_DIR = '/Users/yvesdarbouze/.gemini/antigravity/brain/15d24af0-a506-4a7d-89c4-4a6d3cd90504';

test.describe('Abuse Surfaces Visual Verification (Review C2.4, C2.5, C2.6)', () => {
  test('capture desktop and mobile evidence for deal calculator and support center', async ({ page }) => {
    // 1. Desktop Deal Calculator (1280x800)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/deal-calculator');
    await page.waitForLoadState('networkidle');

    // Screenshot Desktop Deal Calculator
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'deal-calculator-desktop.png'),
    });

    // Test typing an address to activate autocomplete
    const addressInput = page.locator('#address-input');
    if (await addressInput.isVisible()) {
      await addressInput.fill('1204 E 7th St, Austin, TX');
      await page.waitForTimeout(500);
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, 'deal-calculator-autocomplete-desktop.png'),
      });
    }

    // 2. Desktop Support Center
    await page.goto('/support');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'support-desktop.png'),
    });

    // 3. Mobile Deal Calculator (390x844)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/deal-calculator');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'deal-calculator-mobile.png'),
    });

    // 4. Mobile Support Center
    await page.goto('/support');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'support-mobile.png'),
    });
  });
});
