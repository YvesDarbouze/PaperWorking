import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto } from './mocks';
import * as fs from 'fs';
import * as path from 'path';

test.use({ video: 'on' });

test.describe('PaperWorking E2E — Top Nav Cleanup (PF-7)', () => {
  test.beforeEach(async ({ page }) => {
    const screenshotDir = path.join(process.cwd(), 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir);
    }

    // Bypass Cookie Consent popup
    await page.addInitScript(() => {
    try {
    
          window.localStorage.setItem('pw_cookie_consent', JSON.stringify({ essential: true, analytics: true, marketing: true }));
        
    } catch (e) {}
  });
  });

  test('PF-7: Top Nav elements removed, space reclaimed, and Project page creation entrypoints work', async ({ page }) => {
    const state = createDefaultState();

    // 1. Initial test with populated projects
    await setupMocks(page, state);
    await safeGoto(page, '/dashboard/projects');

    // Wait for the app page to load
    await expect(page.locator('h2:has-text("Projects")')).toBeVisible();

    // Assert TopNav buttons are REMOVED
    
    // Check "New Project" button is NOT visible in Top Nav
    await expect(page.locator('header button:has-text("New Project")')).not.toBeVisible();
    await expect(page.locator('header button:has-text("add")')).not.toBeVisible();

    // Check Notifications button (icon text "notifications") is NOT visible in Top Nav
    await expect(page.locator('header span:has-text("notifications")')).not.toBeVisible();

    // Check What's New button (icon text "campaign") is NOT visible in Top Nav
    await expect(page.locator('header span:has-text("campaign")')).not.toBeVisible();

    // Check Contextual Help button (icon text "help_outline") is NOT visible in Top Nav
    await expect(page.locator('header span:has-text("help_outline")')).not.toBeVisible();

    // Verify User profile menu button still exists and is visible in Top Nav
    const userMenuButton = page.locator('header button').last();
    await expect(userMenuButton).toBeVisible();

    // Take a screenshot of the clean Top Nav
    await page.screenshot({ path: 'screenshots/pf7-top-nav-after.png' });

    // Verify Project creation is reachable via Projects page header "Create Project" button
    const createProjectHeaderButton = page.locator('button:has-text("Create Project")');
    await expect(createProjectHeaderButton).toBeVisible();

    // Click it to open the creation wizard modal
    await createProjectHeaderButton.click();

    // Wait for the acquisition wizard modal to open
    const modalTitle = page.locator('h3:has-text("Project Intake Router")');
    await expect(modalTitle).toBeVisible();

    // Take screenshot of the opened creation wizard modal
    await page.screenshot({ path: 'screenshots/pf7-create-wizard-opened.png' });

    // Close the modal
    const closeButton = page.locator('button span:has-text("close")').first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }
  });

  test('PF-7: Empty state portfolio view is displayed and Create First Project CTA works', async ({ page }) => {
    const state = createDefaultState();
    state.projects = []; // Clear projects to trigger portfolio empty state

    await setupMocks(page, state);
    await safeGoto(page, '/dashboard/projects');

    // Wait for the page to load
    await expect(page.locator('h2:has-text("Projects")')).toBeVisible();

    // Verify the custom empty state layout
    const emptyStateTitle = page.locator('h3:has-text("Start your real estate portfolio")');
    await expect(emptyStateTitle).toBeVisible();

    const emptyStateDescription = page.locator('p:has-text("Create your first project to analyze financials")');
    await expect(emptyStateDescription).toBeVisible();

    // Capture a screenshot of the portfolio empty state
    await page.screenshot({ path: 'screenshots/pf7-portfolio-empty-state.png' });

    // Verify "Create First Project" button works
    const createFirstButton = page.locator('button:has-text("Create First Project")');
    await expect(createFirstButton).toBeVisible();

    await createFirstButton.click();

    // Wait for the wizard modal to open
    const modalTitle = page.locator('h3:has-text("Project Intake Router")');
    await expect(modalTitle).toBeVisible();
  });
});
