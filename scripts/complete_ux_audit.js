import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.join(process.cwd(), 'public', 'screenshots', 'ux_audit');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runAudit() {
  console.log('=== STARTING COMPLETE UX AUDIT ===\n');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  async function snap(filename) {
    const filePath = path.join(SCREENSHOT_DIR, `${filename}.png`);
    await page.screenshot({ path: filePath, fullPage: false });
    console.log(`[SAVED SCREENSHOT] -> public/screenshots/ux_audit/${filename}.png`);
  }

  try {
    // ── FLOW 1: LANDING PAGE ──
    console.log('--- FLOW 1: Landing Page ---');
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await snap('01_landing_above_fold');

    const h1Text = await page.textContent('h1').catch(() => 'N/A');
    console.log('Hero H1:', h1Text.trim());

    const ctaHero = await page.textContent('a.luminous-button').catch(() => 'N/A');
    console.log('Hero Primary CTA:', ctaHero.trim());

    // ── FLOW 2: SIGNUP & ACCOUNT TYPE GATE ──
    console.log('\n--- FLOW 2: Account Type Gate & Signup ---');
    await page.goto('http://localhost:3000/register', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await snap('02_account_type_gate');

    // Test back button without selecting
    await page.goBack();
    await page.waitForTimeout(500);
    await snap('02_account_type_back_button');

    // Return
    await page.goto('http://localhost:3000/register', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    // Select Investor & Continue
    await page.click('button:has-text("Real Estate Investor")').catch(() => {});
    await page.waitForTimeout(300);
    await snap('02_investor_card_selected');

    await page.click('button:has-text("Continue")').catch(() => {});
    await page.waitForTimeout(1000);
    await snap('02_login_signup_form');

    // ── FLOW 3: EMAIL VERIFICATION ──
    console.log('\n--- FLOW 3: Email Verification State ---');
    await page.goto('http://localhost:3000/login?mode=signup', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await snap('03_email_signup_view');

    // ── FLOW 4: ONBOARDING INTENT & WIZARD ──
    console.log('\n--- FLOW 4: Onboarding Intent & Wizard ---');
    await page.goto('http://localhost:3000/onboarding/intent', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await snap('04_onboarding_intent_selection');

    await page.goto('http://localhost:3000/onboarding/wizard', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await snap('04_wizard_step1_property');

    // Step 1 empty error
    await page.click('button:has-text("Next")').catch(() => {});
    await page.waitForTimeout(300);
    await snap('04_wizard_step1_validation_error');

    // Fill Step 1
    await page.fill('input[placeholder*="Street address"]', '100 Investor Way');
    await page.fill('input[placeholder*="City"]', 'Austin');
    await page.fill('input[placeholder*="State"]', 'TX');
    await page.click('button:has-text("Next")').catch(() => {});
    await page.waitForTimeout(500);
    await snap('04_wizard_step2_financials');

    // Fill Step 2
    await page.click('button:has-text("Next")').catch(() => {});
    await page.waitForTimeout(500);
    await snap('04_wizard_step3_review');

    // ── FLOW 5: PRICING & CHECKOUT ──
    console.log('\n--- FLOW 5: Pricing Page & Checkout ---');
    await page.goto('http://localhost:3000/pricing', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await snap('05_pricing_page');

    await page.goto('http://localhost:3000/checkout/success?session_id=cs_mock_test', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await snap('05_checkout_success_mock');

    // ── FLOW 6: DASHBOARD LANDING ──
    console.log('\n--- FLOW 6: First Dashboard Landing ---');
    await page.goto('http://localhost:3000/dashboard/command-center', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await snap('06_dashboard_command_center_empty');

    await page.goto('http://localhost:3000/dashboard/projects', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await snap('06_dashboard_projects_empty');

    console.log('\n=== COMPLETE UX AUDIT FINISHED SUCCESSFULLY ===');

  } catch (err) {
    console.error('UX Audit execution error:', err);
  } finally {
    await browser.close();
  }
}

runAudit();
