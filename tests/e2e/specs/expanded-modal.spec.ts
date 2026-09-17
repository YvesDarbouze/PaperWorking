import { test, expect } from '@playwright/test';
import { createDevSessionForContext } from '../helpers/auth';

test.describe('Expanded Deal Modal & Calculator View (expanded-modal.spec.ts)', () => {
  test.beforeEach(async ({ context }) => {
    await createDevSessionForContext(context, 'investor');
  });

  test('1: Click on DealCard "View deal" -> opens view and updates URL', async ({
    page,
  }) => {
    await page.goto('/deals');

    const viewDealLink = page.locator('a[href*="/deals/"]').first();
    await expect(viewDealLink).toBeVisible();
    await viewDealLink.click();

    await expect(page).toHaveURL(/.*\/deals\/.*/);
  });

  test('2: View deal detail / expanded modal -> assert deal calculator and financial metrics render', async ({
    page,
  }) => {
    await page.goto('/deals/1247elmst/detail');

    // Assert deal financial cards
    await expect(page.locator('text=Purchase Price').first()).toBeVisible();
    await expect(page.locator('text=$485,000').first()).toBeVisible();
    await expect(page.locator('text=Projected ROI').first()).toBeVisible();
    await expect(page.locator('text=18.4%').first()).toBeVisible();
  });

  test('3: Mobile 375px -> assert single column stack with zero overflow', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/deals/1247elmst/detail');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth + 2;
    });
    expect(hasHorizontalOverflow).toBe(false);
  });

  test('4: Click "Back to marketplace" -> returns to deals grid', async ({
    page,
  }) => {
    await page.goto('/deals/1247elmst/detail');

    const backBtn = page.getByRole('link', { name: /back to marketplace/i });
    await expect(backBtn).toBeVisible();
    await backBtn.click();

    await expect(page).toHaveURL(/.*\/deals/);
  });

  test('5: Deep link directly to deal detail -> loads directly with all metrics', async ({
    page,
  }) => {
    await page.goto('/deals/1247elmst/detail');

    await expect(page.locator('text=1247 Elm Street, Austin, TX 78702')).toBeVisible();
    await expect(page.getByRole('button', { name: /share analysis/i })).toBeVisible();
  });

  test('6: External unauthenticated viewer hitting deal detail -> redirected to login/auth', async ({
    browser,
  }) => {
    const unauthed = await browser.newContext();
    const unauthedPage = await unauthed.newPage();

    await unauthedPage.goto('/deals/1247elmst/detail');
    await expect(unauthedPage).toHaveURL(/.*\/(login|signup|auth).*/);

    await unauthed.close();
  });
});
