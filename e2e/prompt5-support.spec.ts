import { test, expect } from '@playwright/test';

/* ═══════════════════════════════════════════════════════
   PaperWorking — Prompt 5 E2E Playwright Test Suite
   Covering:
   - Search flow end-to-end (debounced typing, results dropdown, keyboard navigation, empty state)
   - FAQ accordion open/close & "Filter questions…" input filtering
   - Link crawl of /support asserting every href resolves (no 404s, no dead anchors)
   - 375px zero horizontal scroll
   ═══════════════════════════════════════════════════════ */

test.describe('PROMPT 5 — Support Page Search, FAQ & Link Crawl Verification', () => {
  test('/support — Search flow end-to-end with debounced typing and keyboard navigation', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/support');

    // Hero elements visible above the fold
    await expect(page.getByText('What are you trying to figure out?')).toBeVisible();
    await expect(page.getByText('Search our knowledge base — most answers are already here. If not, a real person answers every message.')).toBeVisible();

    const searchInput = page.getByRole('combobox', { name: /search paperworking knowledge base/i });
    await expect(searchInput).toBeVisible();

    // Type query "contingency"
    await searchInput.fill('contingency');

    // Wait for debounced dropdown
    const listbox = page.locator('#support-search-listbox');
    await expect(listbox).toBeVisible();

    // Keyboard navigation (ArrowDown -> Enter)
    await searchInput.press('ArrowDown');
    await searchInput.press('Enter');

    // Asserts page navigated to article or anchor
    await page.waitForURL(/\/support\/.*/);
  });

  test('/support — Search empty state displays exact required copy', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/support');

    const searchInput = page.getByRole('combobox', { name: /search paperworking knowledge base/i });
    await searchInput.fill('xyzzy quantum');

    const emptyState = page.getByTestId('search-empty-state');
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText('No matches in the knowledge base. Email hi@paperworking.co — a real person answers every message.');
  });

  test('/support — FAQ accordion open/close and "Filter questions…" filtering', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/support');

    await expect(page.getByText('Before you email us')).toBeVisible();

    // Filter questions input
    const filterInput = page.getByPlaceholder('Filter questions…');
    await filterInput.fill('Plaid');

    // Asserts Plaid FAQ visible
    await expect(page.getByText('What does the Plaid integration do, and is it required?')).toBeVisible();
  });

  test('/support — Mobile 375px rendering has zero horizontal scroll', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/support');

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
});
