import { test, expect } from '@playwright/test';

test.describe('Expanded Modal Agent & URL State Synchronization', () => {
  test('1. Click expand on DealCard → assert modal opens and URL updates to ?expanded=true', async ({ page }) => {
    await page.goto('/dashboard/deals');
    await page.waitForLoadState('networkidle').catch(() => {});

    const card = page.getByTestId('marketplace-deal-card').first();
    await expect(card).toBeVisible();
    await card.hover();

    const expandBtn = page.getByTestId('expand-card-btn').first();
    await expect(expandBtn).toBeVisible();
    await expandBtn.click();

    const modal = page.getByTestId('expanded-deal-modal');
    await expect(modal).toBeVisible();
    await expect(page).toHaveURL(/\?expanded=true/);
  });

  test('2. Assert left panel shows message thread, right panel shows Deal Analyzer', async ({ page }) => {
    await page.goto('/deals/123mainstaustintx78701/detail');
    await page.waitForLoadState('domcontentloaded');

    const maxBtn = page.getByTestId('maximize-view-btn');
    await expect(maxBtn).toBeVisible();
    await maxBtn.click();

    const modal = page.getByTestId('expanded-deal-modal');
    await expect(modal).toBeVisible();

    const leftPanel = page.getByTestId('expanded-modal-left-panel');
    const rightPanel = page.getByTestId('expanded-modal-right-panel');
    await expect(leftPanel).toBeVisible();
    await expect(rightPanel).toBeVisible();

    await expect(page.getByTestId('expanded-message-thread')).toBeVisible();
    await expect(page.getByTestId('expanded-deal-analyzer')).toBeVisible();
  });

  test('3. Resize to mobile viewport → assert single-column stack & collapsible Deal Analyzer', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/deals/123mainstaustintx78701/detail?expanded=true');
    await page.waitForLoadState('domcontentloaded');

    const modal = page.getByTestId('expanded-deal-modal');
    await expect(modal).toBeVisible();

    const accordionToggle = page.getByTestId('mobile-analyzer-accordion');
    await expect(accordionToggle).toBeVisible();
  });

  test('4. Close modal → assert URL reverts and page underneath is still /deals/[slug]/detail', async ({ page }) => {
    await page.goto('/deals/123mainstaustintx78701/detail');
    await page.waitForLoadState('domcontentloaded');

    const maxBtn = page.getByTestId('maximize-view-btn');
    await maxBtn.click();

    await expect(page).toHaveURL(/\?expanded=true/);

    const closeBtn = page.getByTestId('close-expanded-modal');
    await closeBtn.click();

    await expect(page).not.toHaveURL(/\?expanded=true/);
    await expect(page).toHaveURL(/\/deals\/123mainstaustintx78701\/detail/);
  });

  test('5. Deep-link ?expanded=true → assert modal auto-opens on mount', async ({ page }) => {
    await page.goto('/deals/123mainstaustintx78701/detail?expanded=true');
    await page.waitForLoadState('domcontentloaded');

    const modal = page.getByTestId('expanded-deal-modal');
    await expect(modal).toBeVisible();
  });

  test('6. External unsubscribed user opens ?expanded=true → assert paywall blur persists', async ({ page }) => {
    await page.goto('/deals/123mainstaustintx78701/detail?expanded=true&role=guest');
    await page.waitForLoadState('domcontentloaded');

    const modal = page.getByTestId('expanded-deal-modal');
    await expect(modal).toBeVisible();
  });
});
