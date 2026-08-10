import { test, expect, type Page } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto } from './mocks';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Predictive search redesign — acceptance + evidence.
 * Sprint: UX/UI Hardening, August 2026 (Prompt 3).
 */

const SHOT_DIR = path.join(process.cwd(), 'screenshots', 'search-redesign');
const HOME = '/dashboard/command-center';
const SEARCH = '[data-testid="global-search-input"]';

/** Greens the redesign forbids anywhere in the dropdown. */
const FORBIDDEN_GREEN = /rgb\(\s*0,\s*(206|221),\s*(142|148)\s*\)|#00ce8e|#00dd94|#10b981|#34d399|emerald/i;

async function openSearch(page: Page, query: string) {
  const input = page.locator(SEARCH);
  await expect(input).toBeVisible();
  await input.click();
  await input.fill(query);
  // Debounce is 150ms; give the fetch a beat to resolve.
  await page.waitForTimeout(600);
}

/**
 * Stub the project search endpoint so keyboard navigation is deterministic
 * rather than dependent on whatever the shared mock state happens to contain.
 */
async function stubProjectResults(page: Page, count = 3) {
  await page.route('**/api/projects**', async (route) => {
    const projects = Array.from({ length: count }, (_, i) => ({
      id: `stub-${i + 1}`,
      address: `42${i}8 Melrose Ave, Los Angeles, CA`,
      propertyName: `Melrose Duplex ${i + 1}`,
    }));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, projects }),
    });
  });
}

test.describe('Predictive search redesign', () => {
  test.beforeEach(async ({ page }) => {
    fs.mkdirSync(SHOT_DIR, { recursive: true });
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem(
          'pw_cookie_consent',
          JSON.stringify({ essential: true, analytics: true, marketing: true }),
        );
        window.localStorage.removeItem('pw_recent_searches');
      } catch {}
    });
    await setupMocks(page, createDefaultState());
  });

  test('input meets the field standards', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await safeGoto(page, HOME);

    const input = page.locator(SEARCH);
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('placeholder', 'Search deals by name or address...');
    // Combobox semantics for assistive tech.
    await expect(input).toHaveAttribute('role', 'combobox');
    await expect(input).toHaveAttribute('aria-autocomplete', 'list');
  });

  test('does not trigger below 3 characters, then shows the dropdown', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await safeGoto(page, HOME);

    const input = page.locator(SEARCH);
    await input.click();
    await input.fill('42');
    await page.waitForTimeout(500);

    // Under the trigger threshold: no option rows, no loading row.
    await expect(page.locator('[data-testid="global-search-option"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="global-search-loading"]')).toHaveCount(0);

    await input.fill('420');
    await page.waitForTimeout(600);
    await expect(page.locator('[data-testid="global-search-dropdown"]')).toBeVisible();
  });

  test('keyboard: ArrowDown highlights, Enter selects and navigates', async ({ page }) => {
    await stubProjectResults(page, 3);
    await page.setViewportSize({ width: 1440, height: 900 });
    await safeGoto(page, HOME);
    await openSearch(page, '420');

    const options = page.locator('[data-testid="global-search-option"]');
    await expect(options.first()).toBeVisible();
    const count = await options.count();
    expect(count).toBeGreaterThan(0);

    // The typed characters are bolded inside the suggestion — requirement 4.
    await expect(options.first().locator('strong').first()).toHaveText('420');

    // Nothing highlighted before ArrowDown.
    await expect(options.first()).toHaveAttribute('data-active', 'false');

    await page.keyboard.press('ArrowDown');
    await expect(options.first()).toHaveAttribute('data-active', 'true');

    // ArrowUp from the first row wraps to the last.
    if (count > 1) {
      await page.keyboard.press('ArrowUp');
      await expect(options.nth(count - 1)).toHaveAttribute('data-active', 'true');
      await page.keyboard.press('ArrowDown');
    }

    const before = page.url();
    await page.keyboard.press('Enter');
    // Wait on the condition, not a fixed sleep: with several suites sharing one
    // dev server the client-side navigation can exceed a hard timeout and the
    // test flakes even though the behaviour is correct.
    await page.waitForURL(/\/dashboard\/projects\/stub-/, { timeout: 15_000 });
    expect(page.url(), 'Enter on the highlighted row navigates').not.toBe(before);
    expect(page.url()).toContain('/dashboard/projects/stub-');
  });

  test('Escape closes the dropdown and blurs the input', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await safeGoto(page, HOME);
    await openSearch(page, '420');

    await expect(page.locator('[data-testid="global-search-dropdown"]')).toBeVisible();
    await page.keyboard.press('Escape');

    await expect(page.locator('[data-testid="global-search-dropdown"]')).toHaveCount(0);
    const focused = await page.evaluate(
      () => document.activeElement?.getAttribute('data-testid') ?? null,
    );
    expect(focused).not.toBe('global-search-input');
  });

  test('caps suggestions at 7 and never forces a scrollbar', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await safeGoto(page, HOME);
    await openSearch(page, '420');

    const options = page.locator('[data-testid="global-search-option"]');
    expect(await options.count()).toBeLessThanOrEqual(7);

    const dropdown = page.locator('[data-testid="global-search-dropdown"]');
    if (await dropdown.count()) {
      const overflow = await dropdown.evaluate((el) => ({
        scrollH: el.scrollHeight,
        clientH: el.clientHeight,
      }));
      expect(overflow.scrollH).toBeLessThanOrEqual(overflow.clientH + 2);
    }
  });

  test('zero bright green anywhere in the dropdown', async ({ page }) => {
    // Stubbed so this asserts against populated rows, group headers, and the
    // bolded match — not just an empty state.
    await stubProjectResults(page, 3);
    await page.setViewportSize({ width: 1440, height: 900 });
    await safeGoto(page, HOME);
    await openSearch(page, '420');
    await expect(page.locator('[data-testid="global-search-option"]').first()).toBeVisible();

    const dropdown = page.locator('[data-testid="global-search-dropdown"]');
    await expect(dropdown).toBeVisible();

    const paint = await dropdown.evaluate((root) => {
      const out: string[] = [];
      const walk = (el: Element) => {
        const s = getComputedStyle(el);
        out.push(s.backgroundColor, s.color, s.borderTopColor, s.borderLeftColor);
        Array.from(el.children).forEach(walk);
      };
      walk(root);
      return out;
    });

    const offenders = paint.filter((c) => FORBIDDEN_GREEN.test(c));
    expect(offenders, `green found in dropdown: ${offenders.join(', ')}`).toEqual([]);

    // And no emerald/green utility class survived on any descendant.
    const classes = await dropdown.evaluate((root) =>
      Array.from(root.querySelectorAll('*'))
        .map((e) => e.className)
        .filter((c) => typeof c === 'string')
        .join(' '),
    );
    expect(classes).not.toMatch(/emerald|(?:^|\s)(?:bg|text|border)-green-/);

    await dropdown.screenshot({ path: path.join(SHOT_DIR, 'dropdown-desktop.png') });
  });

  test('mobile: full width, overlay with close button, no horizontal scroll', async ({ page }) => {
    await stubProjectResults(page, 3);
    await page.setViewportSize({ width: 375, height: 812 });
    await safeGoto(page, HOME);

    // The desktop field is `hidden md:block`; below that the magnifier button
    // in the header is the entry point.
    const trigger = page.locator('[data-testid="mobile-search-trigger"]');
    await expect(trigger).toBeVisible();
    await trigger.click();

    const input = page.locator('[data-testid="mobile-search-input"]');
    await expect(input).toBeVisible();
    // Requirement 2: the overlay autofocuses its input.
    await expect(input).toBeFocused();

    // Requirement 8: the field spans the viewport minus padding.
    const inputBox = await input.boundingBox();
    expect(inputBox!.width).toBeGreaterThan(375 * 0.85);

    await input.fill('420');
    await page.waitForTimeout(600);

    const overlay = page.locator('[data-testid="mobile-search-dropdown"]');
    await expect(overlay).toBeVisible();
    const closeBtn = page.locator('[data-testid="mobile-search-close"]');
    await expect(closeBtn).toBeVisible();

    const box = await overlay.boundingBox();
    expect(box!.width, 'dropdown spans the full viewport width').toBeGreaterThanOrEqual(374);

    const scrolls = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(scrolls, 'page must not scroll horizontally').toBe(false);

    await page.screenshot({ path: path.join(SHOT_DIR, 'dropdown-mobile.png') });

    // The close button dismisses the whole overlay.
    await closeBtn.click();
    await expect(page.locator('[data-testid="mobile-search-overlay"]')).toHaveCount(0);
  });
});
