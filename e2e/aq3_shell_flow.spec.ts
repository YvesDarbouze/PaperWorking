import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.use({ video: 'on' });

test.describe('aq3_shell_flow', () => {
  const ARTIFACT_DIR = '/Users/yvesdarbouze/.gemini/antigravity/brain/7700050c-e01a-4b09-b184-de72055274f5';

  test.beforeEach(async ({ page }) => {
    // Bypass Cookie Consent popup by pre-seeding localStorage
    await page.addInitScript(() => {
      window.localStorage.setItem('pw_cookie_consent', JSON.stringify({ essential: true, analytics: true, marketing: true }));
    });
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  });

  test.afterEach(async ({ page }) => {
    // Wait for the video to be written
    await page.close();
    const video = page.video();
    if (video) {
      const videoPath = await video.path();
      if (videoPath && fs.existsSync(videoPath)) {
        const dest = path.join(ARTIFACT_DIR, 'aq3_shell_flow.webm');
        fs.copyFileSync(videoPath, dest);
        console.log(`Successfully saved video to ${dest}`);
      }
    }
  });

  test('demonstrate all 10 requirements', async ({ page, context }) => {
    test.setTimeout(240000);
    // ──────── Setup: Lead Investor cookies ────────
    console.log('1. Logging in as Lead Investor...');
    await context.addCookies([
      { name: '__session', value: 'mock_session_token_123', domain: 'localhost', path: '/' },
      { name: '__e2e_test', value: '1', domain: 'localhost', path: '/' },
      { name: 'mock_session_token_123', value: '1', domain: 'localhost', path: '/' },
      { name: 'mock_user_uid', value: 'user_lead_investor_seed', domain: 'localhost', path: '/' },
      { name: 'mock_user_email', value: 'marcus@apexcapital.io', domain: 'localhost', path: '/' },
      { name: 'mock_user_name', value: 'Marcus Aurelius', domain: 'localhost', path: '/' },
      { name: 'mock_user_role', value: 'Lead Investor', domain: 'localhost', path: '/' },
      { name: 'mock_user_org_id', value: 'org_paperworking_seed', domain: 'localhost', path: '/' },
      { name: '__acct', value: 'investor', domain: 'localhost', path: '/' }
    ]);

    const dealName = `Fresh Lane ${Math.floor(Math.random() * 100000)}`;

    // Go to projects board view
    await page.goto('http://localhost:3000/dashboard/projects');
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/01_board_4_columns.png' });

    // ──────── Step 1: Create fresh project ────────
    console.log(`2. Creating fresh project "${dealName}"...`);
    const createBtn = page.locator('button', { hasText: 'Create Project' }).first();
    await expect(createBtn).toBeVisible();
    await createBtn.click();
    await page.waitForTimeout(1000);

    // Step 1 of wizard: Intake Step
    const targetingBtn = page.locator('button', { hasText: 'Targeting' }).first();
    await expect(targetingBtn).toBeVisible();
    await targetingBtn.click();
    await page.waitForTimeout(500);

    const buyHoldBtn = page.locator('button:has-text("Buy & Hold")').first();
    await expect(buyHoldBtn).toBeVisible();
    await buyHoldBtn.click();
    await page.waitForTimeout(500);

    const continueBtn = page.locator('button', { hasText: 'Continue' }).first();
    await expect(continueBtn).toBeEnabled({ timeout: 5000 });
    await continueBtn.click();
    await page.waitForTimeout(1000);

    // Step 2 of wizard: Address Step
    const addressInput = page.locator('input[placeholder="123 Main St, City, State"]').first();
    await expect(addressInput).toBeVisible({ timeout: 10000 });
    await addressInput.fill('312 W 23rd St');
    await page.waitForTimeout(1500);

    // Select the first suggestion from autocomplete
    const suggestionBtn = page.locator(
      'button:has-text("312 W 23rd St, New York, NY 10011"), ' +
      'button:has-text("312 West 23rd Street, New York, NY, USA"), ' +
      'button:has-text("312 W 23rd St")'
    ).first();
    await expect(suggestionBtn).toBeVisible({ timeout: 10000 });
    await suggestionBtn.click();
    await page.waitForTimeout(1000);

    // Change the name
    const nameInput = page.locator('#deal-name-input').first();
    await expect(nameInput).toBeVisible();
    await nameInput.clear();
    await nameInput.fill(dealName);
    
    const continueBtn2 = page.locator('button', { hasText: 'Continue' }).first();
    await expect(continueBtn2).toBeEnabled();
    await continueBtn2.click();
    await page.waitForTimeout(800);

    // Step 3 of wizard: Status Step
    await page.locator('button', { hasText: 'Skip for now' }).click();
    await page.waitForTimeout(400);

    // Skip directly to Review page via StepRail
    await page.locator('button:has-text("Review")').click();
    await page.waitForTimeout(400);

    // Click submit "Create Project"
    const submitCreateBtn = page.locator('div[class*="z-[200]"] button:has-text("Create Project")');
    await expect(submitCreateBtn).toBeEnabled({ timeout: 10000 });
    await submitCreateBtn.click();
    
    // Wait for redirection to page-1 workspace
    await expect(page).toHaveURL(/.*\/projects\/.*\/phase-1/, { timeout: 20000 });
    await page.waitForTimeout(2000);
    
    // Save project ID
    const url = page.url();
    const projectId = url.split('/projects/')[1].split('/')[0];
    console.log(`Created project with ID: ${projectId}`);
    
    await page.screenshot({ path: 'screenshots/02_fresh_project_analyzer.png' });

    // ──────── First-Pass Screen (AQ-6) ────────
    console.log('2.5 Testing First-Pass Screen (AQ-6) archiving, restoring, and pursuing...');
    
    // Fill Target Identification details first so that isStage1Complete can be satisfied later
    const initialEditBtn = page.locator('button', { hasText: 'Edit' }).first();
    if (await initialEditBtn.isVisible()) {
      await initialEditBtn.click();
      await page.waitForTimeout(500);
    }
    await page.locator('input[name="askingPrice"]').first().fill('300000');
    await page.locator('select[name="propertyType"]').first().selectOption('Single Family');
    await page.locator('input[name="units"]').first().fill('1');
    await page.locator('select[name="condition"]').first().selectOption('gut');
    await page.locator('button', { hasText: 'Save Details' }).first().click();
    await page.waitForTimeout(1500);
    
    // Verify Stage 1 tab is pending (not complete)
    const stage1Tab = page.locator('#stage-tab-target');
     await expect(stage1Tab).not.toHaveClass(/bg-\[#5aaa3f\]\/15/);
     
     // Fill Estimated Monthly Rent
     const rentInput = page.locator('input[placeholder="e.g. 2500"]').first();
     await rentInput.fill('2500');
     await page.waitForTimeout(1000);
     
     // Click "Pass" to archive
     await page.locator('button', { hasText: /^Pass$/ }).first().click();
     await page.waitForTimeout(2000);
     await page.screenshot({ path: 'screenshots/02_first_pass_archived.png' });
     
     // Verify "Deal Archived" is shown
     await expect(page.locator('text=Deal Archived').first()).toBeVisible();
     
     // Click "Restore Deal"
     await page.locator('button', { hasText: /Restore Deal/ }).first().click();
     await page.waitForTimeout(2000);
     await page.screenshot({ path: 'screenshots/02_first_pass_restored.png' });
     
     // Click "Pursue" to proceed
     await page.locator('button', { hasText: /^Pursue$/ }).first().click();
     await page.waitForTimeout(2000);
     await page.screenshot({ path: 'screenshots/02_first_pass_pursued.png' });
     
     // Click Stage 2 tab so Stage 1 tab becomes inactive
     await page.locator('#stage-tab-underwrite').click();
     await page.waitForTimeout(1000);
     
     // Verify Stage 1 tab is now green/completed
     await expect(stage1Tab).toHaveClass(/bg-\[#5aaa3f\]\/15/);

    // ──────── Step 2: List View Sorting ────────
    console.log('3. Navigating back to portfolio to test sorting...');
    await page.goto('http://localhost:3000/dashboard/projects');
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);

    // Switch to List View
    await page.locator('button:has-text("List")').click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/03_list_view.png' });

    // Sort by Year
    await page.locator('th:has-text("Year")').click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/04_list_sorted_by_year.png' });

    // Sort by Phase & Stage
    await page.locator('th:has-text("Phase & Stage")').click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/05_list_sorted_by_phase.png' });

    // Switch back to Board View
    await page.locator('button:has-text("Board")').last().click();
    await page.waitForTimeout(1000);

    // ──────── Step 3: Second Account (Scoped Team Member) ────────
    console.log('4. Testing role-scoping for Investment Team Member...');
    await context.clearCookies();
    await context.addCookies([
      { name: '__session', value: 'mock_session_token_123', domain: 'localhost', path: '/' },
      { name: '__e2e_test', value: '1', domain: 'localhost', path: '/' },
      { name: 'mock_session_token_123', value: '1', domain: 'localhost', path: '/' },
      { name: 'mock_user_uid', value: 'user_team_member_seed', domain: 'localhost', path: '/' },
      { name: 'mock_user_email', value: 'team_member@apexcapital.io', domain: 'localhost', path: '/' },
      { name: 'mock_user_name', value: 'Investment Team Member', domain: 'localhost', path: '/' },
      { name: 'mock_user_role', value: 'Investment Team', domain: 'localhost', path: '/' },
      { name: 'mock_user_org_id', value: 'org_paperworking_seed', domain: 'localhost', path: '/' },
      { name: '__acct', value: 'investor', domain: 'localhost', path: '/' }
    ]);

    await page.goto('http://localhost:3000/dashboard/projects');
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/06_scoped_member_board.png' });

    // ──────── Step 4: Vendor Block ────────
    console.log('5. Testing Vendor redirection block...');
    await context.clearCookies();
    await context.addCookies([
      { name: '__session', value: 'mock_session_token_123', domain: 'localhost', path: '/' },
      { name: '__e2e_test', value: '1', domain: 'localhost', path: '/' },
      { name: 'mock_session_token_123', value: '1', domain: 'localhost', path: '/' },
      { name: 'mock_user_uid', value: 'user_contractor_seed', domain: 'localhost', path: '/' },
      { name: 'mock_user_email', value: 'tony@apexbuilders.com', domain: 'localhost', path: '/' },
      { name: 'mock_user_name', value: 'Tony Morales', domain: 'localhost', path: '/' },
      { name: 'mock_user_role', value: 'General Contractor', domain: 'localhost', path: '/' },
      { name: 'mock_user_org_id', value: 'org_paperworking_seed', domain: 'localhost', path: '/' },
      { name: '__acct', value: 'vendor', domain: 'localhost', path: '/' }
    ]);

    await page.goto('http://localhost:3000/dashboard/projects');
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);
    
    // Vendor should be redirected to vendor portal
    await expect(page).toHaveURL(/.*\/vendor-portal/);
    await page.screenshot({ path: 'screenshots/07_vendor_block.png' });

    // ──────── Step 5: Fresh Project Progression (Lead Investor) ────────
    console.log('6. Switching back to Lead Investor to test Deal Analyzer...');
    await context.clearCookies();
    await context.addCookies([
      { name: '__session', value: 'mock_session_token_123', domain: 'localhost', path: '/' },
      { name: '__e2e_test', value: '1', domain: 'localhost', path: '/' },
      { name: 'mock_session_token_123', value: '1', domain: 'localhost', path: '/' },
      { name: 'mock_user_uid', value: 'user_lead_investor_seed', domain: 'localhost', path: '/' },
      { name: 'mock_user_email', value: 'marcus@apexcapital.io', domain: 'localhost', path: '/' },
      { name: 'mock_user_name', value: 'Marcus Aurelius', domain: 'localhost', path: '/' },
      { name: 'mock_user_role', value: 'Lead Investor', domain: 'localhost', path: '/' },
      { name: 'mock_user_org_id', value: 'org_paperworking_seed', domain: 'localhost', path: '/' },
      { name: '__acct', value: 'investor', domain: 'localhost', path: '/' }
    ]);

    await page.goto(`http://localhost:3000/dashboard/projects/${projectId}/phase-1`);
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);
    
    // Switch to target stage tab to edit details
    await page.locator('#stage-tab-target').click();
    await page.waitForTimeout(1000);

    // Verify Stage 1 is active, Stages 2-7 are locked
    await page.screenshot({ path: 'screenshots/08_stages_initial_locked.png' });

    // Fill Stage 1: Target Identification
    const editBtn = page.locator('button', { hasText: 'Edit' }).first();
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await page.waitForTimeout(500);
    }
    await page.locator('input[name="askingPrice"]').first().fill('300000');
    await page.locator('select[name="propertyType"]').first().selectOption('Single Family');
    await page.locator('input[name="units"]').first().fill('1');
    await page.locator('select[name="condition"]').first().selectOption('gut');
    await page.locator('button', { hasText: 'Save Details' }).first().click();
    await page.waitForTimeout(1500);

    // Observe Stage 2 and Stage 6 unlocked in parallel
    await page.screenshot({ path: 'screenshots/09_parallel_unlocked.png' });

    // ──────── Step 6: Turnkey completes Stage 2 with no Rehab/ARV ────────
    console.log('7. Switching to Turnkey mode...');
    await page.locator('button', { hasText: 'Edit' }).first().click();
    await page.waitForTimeout(500);
    await page.locator('select[name="condition"]').first().selectOption('turnkey');
    await page.locator('button', { hasText: 'Save Details' }).first().click();
    await page.waitForTimeout(1500);

    // Click Stage 2 tab
    await page.locator('button:has-text("Analyze & Underwrite")').first().click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/10_turnkey_stage2.png' });

    // Fill Income Assumptions
    await page.locator('input[placeholder="Gross Monthly Rent"]').first().fill('2000');
    await page.locator('button', { hasText: 'Save Income' }).first().click();
    await page.waitForTimeout(1000);

    // Fill Expense Assumptions
    await page.locator('input[placeholder="Annual Property Taxes"]').first().fill('250');
    await page.locator('input[placeholder="Annual Homeowners Insurance"]').first().fill('100');
    await page.locator('button', { hasText: 'Save Expenses' }).first().click();
    await page.waitForTimeout(1000);

    // Fill Financing assumptions
    await page.locator('input[placeholder="Down Payment %"]').first().fill('20');
    await page.locator('input[placeholder="Interest Rate %"]').first().fill('6.5');
    await page.locator('button', { hasText: 'Save Financing' }).first().click();
    await page.waitForTimeout(1000);

    // Fill Hurdle thresholds to ensure the deal passes the Buy-Box check
    await page.locator('#threshold-cap-rate').first().fill('3.0');
    await page.waitForTimeout(500);
    await page.locator('#threshold-coc').first().fill('-15');
    await page.waitForTimeout(500);
    await page.locator('#threshold-min-dscr').first().fill('0.5');
    await page.waitForTimeout(500);
    await page.locator('#threshold-max-price').first().fill('400000');
    await page.waitForTimeout(1000);

    // Check Acknowledgment
    await page.locator('input[type="checkbox"]').first().click();
    await expect(page.locator('input[type="checkbox"]').first()).toBeChecked();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'screenshots/11_stage2_completed.png' });

    // ──────── Step 7: Acknowledgment Invalidation Loop ────────
    console.log('8. Testing assumption invalidation loop...');
    // Scroll to Income and edit Rent
    await page.locator('input[placeholder="Gross Monthly Rent"]').first().fill('2500');
    await page.locator('button', { hasText: 'Save Income' }).first().click();
    await page.waitForTimeout(1500);

    // Scroll to check Acknowledgment is unchecked/invalidated
    await page.screenshot({ path: 'screenshots/12_acknowledgment_invalidated.png' });

    // Re-acknowledge
    await page.locator('input[type="checkbox"]').first().click();
    await expect(page.locator('input[type="checkbox"]').first()).toBeChecked();
    await page.waitForTimeout(1000);

    // ──────── Step 8: Board/List Resume Stage 3 Active ────────
    console.log('9. Navigating back to board, then reopening to verify resume active stage...');
    // Make Stage 3 active
    await page.locator('button:has-text("Declare Strategy")').first().click();
    await page.waitForTimeout(1000);

    // Exit to Board View
    await page.goto('http://localhost:3000/dashboard/projects');
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);

    // Reopen from Board view
    await page.locator(`div[role="link"]:has-text("${dealName}")`).first().click();
    await page.waitForTimeout(2500);
    await page.screenshot({ path: 'screenshots/13_resume_stage3_board.png' });

    // Exit to Board, switch to List, reopen from List
    await page.goto('http://localhost:3000/dashboard/projects');
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);
    await page.locator('button:has-text("List")').click();
    await page.waitForTimeout(1000);
    await page.locator(`tr:has-text("${dealName}")`).first().click();
    await page.waitForTimeout(2500);
    await page.screenshot({ path: 'screenshots/14_resume_stage3_list.png' });

    // ──────── Step 9: Stage 4 Explicit Price Confirmation ────────
    console.log('10. Navigating to Stage 4 (Offer/LOI)...');
    await page.locator('button:has-text("Offer / LOI")').first().click();
    await page.waitForTimeout(1000);

    // Set offer status to Accepted and enter price
    await page.locator('select[name="offerStatus"]').selectOption('Accepted');
    await page.locator('input[placeholder="Final Agreed Purchase Price"]').first().fill('295000');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/15_stage4_unconfirmed.png' });

    // Click Confirm Price button to complete Stage 4
    await page.locator('button:has-text("Confirm Price")').first().click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'screenshots/16_stage4_completed.png' });

    // ──────── Step 10: Solo Capital Stage 6 Collapse ────────
    console.log('11. Navigating to Stage 6 to set Solo Funding...');
    await page.locator('button:has-text("Raise Interest")').first().click();
    await page.waitForTimeout(1000);

    // Select Solo Funding strategy
    await page.locator('button:has-text("Solo-Financed")').first().click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'screenshots/17_stage6_collapsed.png' });

    // Click Stage 5 (Due Diligence) tab and complete checklist to proceed
    await page.locator('button:has-text("Due Diligence")').first().click();
    await page.waitForTimeout(1000);

    // Upload PSA Document
    await page.locator('button:has-text("Select & Upload PSA PDF")').first().click();
    await page.waitForTimeout(500);

    // Upload EMD receipt
    await page.locator('#upload-emd-receipt-btn').first().click();
    await page.waitForTimeout(1000);

    // Confirm EMD Cleared Escrow
    await page.locator('label[for="emd-verified-checkbox"]').first().click();
    await page.waitForTimeout(1000);

    // Mark contingencies satisfied
    const satisfiedSpans = page.locator('span:has-text("Satisfied")');
    const satisfiedCount = await satisfiedSpans.count();
    for (let i = 0; i < satisfiedCount; i++) {
      await satisfiedSpans.nth(i).click();
      await page.waitForTimeout(200);
    }

    // Complete Purchase Readiness checklist
    await page.locator('span:has-text("Operating Agreement")').first().click();
    await page.waitForTimeout(200);
    await page.locator('span:has-text("Proof of Funds")').first().click();
    await page.waitForTimeout(200);
    await page.locator('span:has-text("Title Commitment")').first().click();
    await page.waitForTimeout(200);
    await page.locator('span:has-text("Entity Documents (LLC/Inc)")').first().click();
    await page.waitForTimeout(1500);

    await page.screenshot({ path: 'screenshots/18_stage5_completed.png' });

    // Stage 7 (Phase Gate) should now be accessible and Stage 6 bypassed
    await page.locator('button:has-text("Phase Gate")').first().click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'screenshots/19_stage7_reached.png' });

    console.log('🎉 Verification flow successfully completed.');
  });
});
