import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto } from './mocks';
import * as fs from 'fs';
import * as path from 'path';

test.use({ video: 'on' });

test.describe('PaperWorking E2E — Search Expansion & Predictive Address Typeahead (PF-6)', () => {
  test.beforeEach(async ({ page }) => {
    // Create screenshots directory if it doesn't exist
    const screenshotDir = path.join(process.cwd(), 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir);
    }

    // Bypass Cookie Consent popup by pre-seeding localStorage
    await page.addInitScript(() => {
    try {
    
          window.localStorage.setItem('pw_cookie_consent', JSON.stringify({ essential: true, analytics: true, marketing: true }));
        
    } catch (e) {}
  });
  });

  test('PF-6 Search Container expanded, Typeahead address search, Keyboard navigation, Empty states', async ({ page }) => {
    const state = createDefaultState();
    
    // Seed projects with specific addresses & phases
    state.projects = [
      {
        id: 'project_alpha',
        propertyName: 'Alpha House',
        address: '123 Alpha Street',
        phaseStatus: 'Phase 1: Find & Fund',
        currentPhase: 1,
        status: 'Lead',
        financials: {},
        members: { user_123: { role: 'owner' } },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'project_beta',
        propertyName: 'Beta Heights',
        address: '456 Beta Avenue',
        phaseStatus: 'Phase 2: Acquisition',
        currentPhase: 2,
        status: 'Under Contract',
        financials: {},
        members: { user_123: { role: 'owner' } },
        createdAt: new Date().toISOString(),
      }
    ];

    await setupMocks(page, state);

    // 1. Load the portfolio / command center
    await safeGoto(page, '/dashboard/command-center');
    await page.waitForLoadState('networkidle');

    // 2. Verify search bar is visually expanded (has max-w-2xl class)
    const searchContainer = page.locator('div.max-w-2xl').first();
    await expect(searchContainer).toBeVisible();

    // 3. Click the search input to focus it
    const searchInput = page.locator('input[type="text"][placeholder*="Search deals"]').first();
    await expect(searchInput).toBeVisible();
    await searchInput.click();

    // 4. Verify empty input state displays search instruction text
    const dropdown = page.locator('#search-results-dropdown');
    await expect(dropdown).toBeVisible();
    await expect(dropdown).toContainText('Type to search deal name or address');

    // Take screenshot of empty search dropdown
    await page.screenshot({ path: 'screenshots/pf6-search-empty-state.png' });

    // 5. Verify no-match state
    await searchInput.fill('Nonexistent Address');
    await page.waitForTimeout(500); // Wait for debounce
    await expect(dropdown).toContainText('No deals match "Nonexistent Address"');
    const searchVendorsBtn = dropdown.locator('button', { hasText: 'Search in Vendors instead' }).first();
    await expect(searchVendorsBtn).toBeVisible();

    // Take screenshot of no-match state
    await page.screenshot({ path: 'screenshots/pf6-search-no-match.png' });

    // 6. Verify match state & details
    await searchInput.fill('123 Alpha');
    await page.waitForTimeout(500); // Wait for debounce
    await expect(dropdown).toContainText('Deals & Projects (1)');
    await expect(dropdown).toContainText('123 Alpha Street');
    await expect(dropdown).toContainText('Phase 1: Find & Fund');

    // Take screenshot of typeahead match result
    await page.screenshot({ path: 'screenshots/pf6-search-match-result.png' });

    // 7. Test keyboard navigation: press ArrowDown to focus the row
    await searchInput.press('ArrowDown');
    
    // Select the Link element representing the matched project
    const matchRow = dropdown.locator('a[href*="/dashboard/projects/project_alpha"]').first();
    await expect(matchRow).toBeVisible();
    
    // Check that it has the active background style (rgba(255,255,255,0.08) in dark / rgba(69,73,85,0.06) in light)
    const backgroundStyle = await matchRow.getAttribute('style');
    expect(backgroundStyle).toContain('background');

    // 8. Press Enter to navigate to the Deal detail view
    await searchInput.press('Enter');

    // Verify navigation occurred to project_alpha page
    await expect(page).toHaveURL(/.*\/dashboard\/projects\/project_alpha/);
    
    // Take screenshot of navigated detail view page
    await page.screenshot({ path: 'screenshots/pf6-deal-navigated.png' });
  });
});
