import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto } from './mocks';
import * as fs from 'fs';
import * as path from 'path';

test.use({ video: 'on' });

test.describe('PaperWorking E2E — Comps & ARV Flow (AQ-7)', () => {
  test.beforeEach(async ({ page }) => {
    // Create screenshots directory if it doesn't exist
    const screenshotDir = path.join(process.cwd(), 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir);
    }

    // Bypass Cookie Consent popup by pre-seeding localStorage
    await page.addInitScript(() => {
      window.localStorage.setItem('pw_cookie_consent', JSON.stringify({ essential: true, analytics: true, marketing: true }));
    });
  });

  test('AQ-7 Comps repeater, rollups and ARV card visibility', async ({ page }) => {
    const state = createDefaultState();
    
    // Set project_1 to needs rehab initially so ARV card is visible
    state.projects[0].condition = 'rehab';
    // Clear project_1 comps initially
    state.projects[0].comps = [];

    // Setup network/auth intercepts
    await setupMocks(page, state);

    // Navigate directly to Project 1 Phase 1 Workspace
    await safeGoto(page, '/dashboard/projects/project_1/phase-1');

    // Verify workspace is loaded
    const stageHeader = page.locator('h3', { hasText: 'Stage 1: Property Identity & Target ID' }).first();
    await expect(stageHeader).toBeVisible({ timeout: 15000 });

    // Verify Comps & ARV card is rendered
    const compsCard = page.locator('div.rounded-xl:has(h4:has-text("Comparables & ARV"))').first();
    await expect(compsCard).toBeVisible({ timeout: 10000 });

    // Verify initial count is Comps: 0/3
    await expect(compsCard).toContainText('Comps: 0/3');

    // Add Comp 1
    const addCompBtn = compsCard.locator('button', { hasText: 'Add Comp' }).first();
    await addCompBtn.click();
    
    // Fill first row inputs directly using placeholders
    await compsCard.locator('input[placeholder="123 Comp St"]').first().fill('Comp St 1');
    await compsCard.locator('input[placeholder="Price"]').first().fill('250000');
    await compsCard.locator('input[placeholder="Sqft"]').first().fill('1000');
    await compsCard.locator('input[placeholder="Miles"]').first().fill('0.5');
    await compsCard.locator('select').first().selectOption('Good');

    // Add Comp 2
    await addCompBtn.click();
    await compsCard.locator('input[placeholder="123 Comp St"]').nth(1).fill('Comp St 2');
    await compsCard.locator('input[placeholder="Price"]').nth(1).fill('280000');
    await compsCard.locator('input[placeholder="Sqft"]').nth(1).fill('1200');
    await compsCard.locator('input[placeholder="Miles"]').nth(1).fill('0.8');
    await compsCard.locator('select').nth(1).selectOption('Turnkey');

    // Add Comp 3
    await addCompBtn.click();
    await compsCard.locator('input[placeholder="123 Comp St"]').nth(2).fill('Comp St 3');
    await compsCard.locator('input[placeholder="Price"]').nth(2).fill('320000');
    await compsCard.locator('input[placeholder="Sqft"]').nth(2).fill('1000');
    await compsCard.locator('input[placeholder="Miles"]').nth(2).fill('0.4');
    await compsCard.locator('select').nth(2).selectOption('Needs Rehab');

    // Save comps
    const saveCompsBtn = compsCard.locator('button', { hasText: 'Save Comps' }).first();
    await saveCompsBtn.click();
    await page.waitForTimeout(1500); // Wait for save call & state refresh

    // Verify comps count is now 3/3
    await expect(compsCard).toContainText('Comps: 3/3');

    // Verify Rollups:
    // Comp 1: 250,000 / 1000 = $250/sqft
    // Comp 2: 280,000 / 1200 = $233.33/sqft
    // Comp 3: 320,000 / 1000 = $320/sqft
    // Avg = (250 + 233.33 + 320) / 3 = 803.33 / 3 = $267.78/sqft
    await expect(compsCard).toContainText('$267.78/sqft');

    // Take screenshot for rollup hand-check (AC1)
    await compsCard.screenshot({ path: 'screenshots/comps_rollups_hand_check.png' });

    // Verify ARV card is visible
    const arvHeader = compsCard.locator('span', { hasText: 'After-Repair Value (ARV)' }).first();
    await expect(arvHeader).toBeVisible();

    // Take screenshot of ARV card visible (AC2 - Part 1)
    await compsCard.screenshot({ path: 'screenshots/arv_card_visible.png' });

    // Now edit project condition to 'Turnkey' to verify ARV card disappears
    const targetIdSection = page.locator('div:has(h2:has-text("Target Identification"))').first();
    const editBtn = targetIdSection.locator('button', { hasText: 'Edit' }).first();
    await editBtn.click();

    // Select the condition dropdown specifically
    const conditionSelect = targetIdSection.locator('select:has(option[value="turnkey"])').first();
    await conditionSelect.selectOption('turnkey');

    const saveDetailsBtn = targetIdSection.locator('button', { hasText: 'Save Details' }).first();
    await saveDetailsBtn.click();
    await page.waitForTimeout(1500); // Wait for save call & refresh

    // Verify ARV card is hidden
    await expect(arvHeader).not.toBeVisible();

    // Take screenshot of ARV card hidden (AC2 - Part 2)
    await compsCard.screenshot({ path: 'screenshots/arv_card_hidden.png' });
  });
});
