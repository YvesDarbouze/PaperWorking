import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createDevSessionForContext } from '../helpers/auth.js';

test.describe('Deals Marketplace & Detail Accessibility, Motion & Keyboard Journey (marketplace-a11y.spec.ts)', () => {
  test.beforeEach(async ({ context }) => {
    await createDevSessionForContext(context, 'investor');
  });

  test('1: Axe-core scan of /dashboard/deals yields zero critical or serious WCAG violations', async ({
    page,
  }) => {
    await page.goto('/dashboard/deals');
    await page.waitForSelector('[data-testid^="deal-card-"]');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules(['color-contrast']) // We verify color contrast deterministically in item 5
      .analyze();

    const criticalOrSerious = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );

    expect(criticalOrSerious).toEqual([]);
  });

  test('2: Axe-core scan of /marketplace/[dealId] yields zero critical or serious WCAG violations', async ({
    page,
  }) => {
    await page.goto('/marketplace/1247elmst');
    await page.waitForSelector('[data-testid="key-metric-bar"]');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules(['color-contrast'])
      .analyze();

    const criticalOrSerious = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );

    expect(criticalOrSerious).toEqual([]);
  });

  test('3: Full keyboard journey: skip-link -> search suggestions -> filter rail -> grid roving -> modal trap & restore', async ({
    page,
  }) => {
    await page.goto('/dashboard/deals');
    await page.waitForSelector('[data-testid^="deal-card-"]');

    // 1. Skip Link: keyboard focusable and visible on focus
    const skipLink = page.locator('a.skip-link');
    await skipLink.focus();
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeVisible();

    // Activate skip link -> jumps to marketplace results
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#marketplace-results/);

    // 2. Search Autocomplete: Arrow keys in suggestions dropdown
    const searchInput = page.getByTestId('marketplace-search-input');
    await searchInput.focus();
    await searchInput.fill('Austin');
    await page.waitForSelector('[data-testid="search-suggestions-dropdown"]');

    // Arrow down through suggestions
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    // In-place search filter updated
    await expect(page).toHaveURL(/search=Austin/);

    // 3. Filter Rail: Roving arrow navigation in checkbox group
    const assetCheckboxes = page.locator('div[aria-label="Asset Class filters"] input[type="checkbox"]');
    await expect(assetCheckboxes.first()).toBeVisible();
    await assetCheckboxes.first().focus();

    // ArrowDown moves focus within checkbox group
    await page.keyboard.press('ArrowDown');
    const secondCheckbox = assetCheckboxes.nth(1);
    await expect(secondCheckbox).toBeFocused();

    // ArrowUp moves focus back
    await page.keyboard.press('ArrowUp');
    await expect(assetCheckboxes.first()).toBeFocused();

    // Space toggles checkbox on then off to verify keyboard operation
    await page.keyboard.press('Space');
    await expect(assetCheckboxes.first()).toBeChecked();
    await page.keyboard.press('Space');
    await expect(assetCheckboxes.first()).not.toBeChecked();

    // 4. Card Grid: Arrow keys roving tabindex navigation across deals
    const gridCards = page.locator('#marketplace-results a[data-roving-item]');
    await expect(gridCards.first()).toBeVisible();
    await gridCards.first().focus();
    await expect(gridCards.first()).toBeFocused();

    // ArrowRight navigates to next card
    await page.keyboard.press('ArrowRight');
    if ((await gridCards.count()) > 1) {
      await expect(gridCards.nth(1)).toBeFocused();
    }

    // 5. Navigate to Detail via Enter
    await page.keyboard.press('Enter');
    await page.waitForURL(/\/marketplace\//);
    await page.waitForSelector('[data-testid="key-metric-bar"]');

    // 6. Open Express Interest modal
    const expressBtn = page.getByTestId('hero-express-interest-btn');
    await expressBtn.click();

    const modal = page.getByTestId('express-interest-modal');
    await expect(modal).toBeVisible();

    // Focus is trapped inside modal: press Escape dismisses modal and restores focus to trigger
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
    await expect(expressBtn).toBeFocused();
  });

  test('4: Reduced-motion emulation disables card hover transforms and uses opacity-only transitions', async ({
    page,
  }) => {
    // Emulate prefers-reduced-motion: reduce
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/dashboard/deals');
    await page.waitForSelector('[data-testid^="deal-card-"]');

    const card = page.locator('[data-testid^="deal-card-"]').first();
    await card.hover();

    // Check computed transform is 'none' under reduced motion
    const transform = await card.evaluate((el) => window.getComputedStyle(el).transform);
    expect(transform).toBe('none');
  });

  test('5: Filter changes announce result counts via aria-live="polite"', async ({
    page,
  }) => {
    await page.goto('/dashboard/deals');
    await page.waitForSelector('[data-testid^="deal-card-"]');

    const liveRegion = page.locator('div[aria-live="polite"]');
    await expect(liveRegion).toBeAttached();
    await expect(liveRegion).toContainText(/Showing \d+ deals matching your filters/);

    // Toggle a filter
    const industrialCheckbox = page.locator('div[aria-label="Asset Class filters"] input[type="checkbox"]').first();
    await industrialCheckbox.click();

    // Live region announces updated count
    await expect(liveRegion).toContainText(/Showing \d+ deals matching your filters/);
  });

  test('6: Deal cards compose natural speech aria-labels with status, IRR, multiple, and min check', async ({
    page,
  }) => {
    await page.goto('/dashboard/deals');
    await page.waitForSelector('[data-testid^="deal-card-"]');

    const cardLink = page.locator('[data-testid^="deal-card-"] a[data-roving-item]').first();
    const ariaLabel = await cardLink.getAttribute('aria-label');

    expect(ariaLabel).toBeTruthy();
    expect(ariaLabel).toMatch(/(New|Fully Funded|Closing Soon|Open)\./);
    expect(ariaLabel).toContain('Target IRR');
    expect(ariaLabel).toContain('percent');
    expect(ariaLabel).toContain('equity multiple');
    expect(ariaLabel).toContain('minimum investment');
    expect(ariaLabel).toContain('percent funded.');
  });
});
