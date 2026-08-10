import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.join(process.cwd(), 'public', 'screenshots', 'ux_audit');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runAudit() {
  console.log('Starting UX Audit browser session...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  // Helper to take screenshot
  async function snap(name) {
    const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
    await page.screenshot({ path: filePath, fullPage: false });
    console.log(`Saved screenshot: ${name}.png`);
  }

  try {
    // ── Flow 1: Landing Page ──
    console.log('\n--- FLOW 1: Landing Page ---');
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    await snap('01_landing_page_above_fold');
    
    // Check wording of primary CTA
    const primaryCta = await page.locator('a[href="/pricing"]').first();
    const ctaText = await primaryCta.textContent();
    console.log('Landing Primary CTA Text:', ctaText?.trim());

    const headline = await page.locator('h1').first().textContent();
    console.log('Hero Headline:', headline?.trim());


    // ── Flow 2: Signup / Account Type Gate ──
    console.log('\n--- FLOW 2: Account Type Gate & Signup ---');
    await page.goto('http://localhost:3000/register', { waitUntil: 'networkidle' });
    await snap('02_account_type_gate');

    // Test back button / picking neither
    await page.goBack();
    await snap('02_account_type_back_button');

    // Return to register
    await page.goto('http://localhost:3000/register', { waitUntil: 'networkidle' });
    
    // Pick investor and continue
    await page.click('button:has-text("Continue")');
    await page.waitForTimeout(1000);
    await snap('02_signup_form_investor');
    console.log('Current URL after Continue:', page.url());


    // ── Flow 3: Email Verification & Pending State ──
    console.log('\n--- FLOW 3: Email Verification State ---');
    await page.goto('http://localhost:3000/login?mode=signup', { waitUntil: 'networkidle' });
    await snap('03_signup_form');


    // ── Flow 4: Onboarding Intent & Wizard ──
    console.log('\n--- FLOW 4: Onboarding Intent & Wizard ---');
    await page.goto('http://localhost:3000/onboarding/intent', { waitUntil: 'networkidle' });
    await snap('04_onboarding_intent');

    await page.goto('http://localhost:3000/onboarding/wizard', { waitUntil: 'networkidle' });
    await snap('04_onboarding_wizard_step1');

    // Test step 1 empty submission
    await page.click('button:has-text("Next")');
    await snap('04_onboarding_step1_error');
    const step1Error = await page.locator('.text-red-400').textContent().catch(() => null);
    console.log('Step 1 validation error:', step1Error);

    // Fill step 1
    await page.fill('input[placeholder*="Street address"]', '123 Main St');
    await page.fill('input[placeholder*="City"]', 'Austin');
    await page.fill('input[placeholder*="State"]', 'TX');
    await page.click('button:has-text("Next")');
    await page.waitForTimeout(500);
    await snap('04_onboarding_wizard_step2');

    // Step 2: Test incomplete numbers / skipping
    await page.click('button:has-text("Next")');
    await page.waitForTimeout(500);
    await snap('04_onboarding_wizard_step3');


    // ── Flow 5: Pricing & Checkout ──
    console.log('\n--- FLOW 5: Pricing & Checkout ---');
    await page.goto('http://localhost:3000/pricing', { waitUntil: 'networkidle' });
    await snap('05_pricing_page');


    // ── Flow 6: Dashboard Landing & Empty States ──
    console.log('\n--- FLOW 6: Dashboard & Empty States ---');
    await page.goto('http://localhost:3000/dashboard/command-center', { waitUntil: 'networkidle' });
    await snap('06_dashboard_command_center');

    await page.goto('http://localhost:3000/dashboard/projects', { waitUntil: 'networkidle' });
    await snap('06_dashboard_projects_empty');

    console.log('\nUX Audit Playwright run complete.');

  } catch (err) {
    console.error('Error during UX audit:', err);
  } finally {
    await browser.close();
  }
}

runAudit();
