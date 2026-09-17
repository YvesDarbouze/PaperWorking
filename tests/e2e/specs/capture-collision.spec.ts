import { test } from '@playwright/test';
import { createDevSessionForContext } from '../helpers/auth';
import * as path from 'path';

const ARTIFACT_DIR = '/Users/yvesdarbouze/.gemini/antigravity/brain/1a994a01-ffd4-4b38-8621-1011ac1a3de7';

test.describe('Capture Collision Modal & Banner Screenshots', () => {
  test.beforeEach(async ({ context }) => {
    await createDevSessionForContext(context, 'investor');
  });

  test('Capture Desktop Collision Modal', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/dashboard/deals');

    const searchInput = page.getByPlaceholder('Search any street address or deal name…');
    await searchInput.fill('1247 Elm Street');
    await searchInput.press('Enter');

    const modal = page.locator('div[role="dialog"]');
    await modal.waitFor({ state: 'visible' });

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'collision-modal-1440.png'),
      fullPage: false,
    });
  });

  test('Capture Desktop Creation Form with Amber Warning Banner', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(
      '/deals/1247elmst?collisionWarning=true&creatorName=PaperWorking%20Capital',
    );

    const banner = page.locator('[data-testid="collision-warning-banner"]');
    await banner.waitFor({ state: 'visible' });

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'collision-warning-banner-1440.png'),
      fullPage: false,
    });
  });

  test('Capture Mobile Collision Modal', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/dashboard/deals');

    const searchInput = page.getByPlaceholder('Search any street address or deal name…');
    await searchInput.fill('1247 Elm Street');
    await searchInput.press('Enter');

    const modal = page.locator('div[role="dialog"]');
    await modal.waitFor({ state: 'visible' });

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'collision-modal-375.png'),
      fullPage: false,
    });
  });
});
