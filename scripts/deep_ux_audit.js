import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.join(process.cwd(), 'public', 'screenshots', 'ux_audit');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runDeepAudit() {
  console.log('=== STARTING DEEP UX AUDIT ===\n');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  async function snap(filename) {
    const filePath = path.join(SCREENSHOT_DIR, `${filename}.png`);
    await page.screenshot({ path: filePath, fullPage: false });
    console.log(`[Screenshot Saved] -> public/screenshots/ux_audit/${filename}.png`);
  }

  const findings = {};

  try {
    // ── FLOW 1: LANDING PAGE ──
    console.log('\n--- FLOW 1: Landing Page ---');
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    await snap('01_landing_above_fold');

    const heroH1 = await page.locator('h1').first().textContent();
    const heroSub = await page.locator('section p').first().textContent();
    const heroCtaText = await page.locator('section a.luminous-button').first().textContent();

    console.log('Hero Headline:', heroH1?.trim().replace(/\s+/g, ' '));
    console.log('Hero Subtitle:', heroSub?.trim().replace(/\s+/g, ' '));
    console.log('Primary CTA exact text:', heroCtaText?.trim());

    // Header CTA
    const headerCta = await page.locator('header a[href="/pricing"]').first().textContent().catch(() => null);
    console.log('Header CTA exact text:', headerCta?.trim());


    // ── FLOW 2: SIGNUP & ACCOUNT TYPE GATE ──
    console.log('\n--- FLOW 2: Account Type Gate & Signup ---');
    await page.goto('http://localhost:3000/register', { waitUntil: 'networkidle' });
    await snap('02_account_type_gate');

    const investorTitle = await page.locator('h3:has-text("Real Estate Investor")').textContent().catch(() => null);
    const vendorTitle = await page.locator('h3:has-text("Service Provider")').textContent().catch(() => null);
    console.log('Account Option 1:', investorTitle?.trim());
    console.log('Account Option 2:', vendorTitle?.trim());

    // Test Back button (picking neither)
    console.log('Testing back button without selecting...');
    await page.goBack();
    await snap('02_account_type_gate_back_button');

    // Return to register
    await page.goto('http://localhost:3000/register', { waitUntil: 'networkidle' });

    // Pick Vendor first, then see if we can switch
    await page.click('button:has-text("Service Provider")');
    await snap('02_account_type_vendor_selected');

    // Switch back to Investor
    await page.click('button:has-text("Real Estate Investor")');
    await snap('02_account_type_investor_selected');

    // Click Continue
    await page.click('button:has-text("Continue")');
    await page.waitForTimeout(1000);
    await snap('02_login_signup_form');
    console.log('Destination after gate Continue:', page.url());


    // ── FLOW 3: EMAIL VERIFICATION ──
    console.log('\n--- FLOW 3: Email Verification State ---');
    // Check signup form requirements and text
    const signupHeadline = await page.locator('h1').textContent().catch(() => null);
    console.log('Signup form title:', signupHeadline?.trim());


    // ── FLOW 4: ONBOARDING INTENT & WIZARD ──
    console.log('\n--- FLOW 4: Onboarding Intent & Wizard ---');
    await page.goto('http://localhost:3000/onboarding/intent', { waitUntil: 'networkidle' });
    await snap('04_onboarding_intent');

    // Check Intent questions
    const intentHeadline = await page.locator('h1').textContent().catch(() => null);
    console.log('Onboarding Intent Question:', intentHeadline?.trim());

    const intentCards = await page.locator('h3').allTextContents();
    console.log('Intent choices:', intentCards.map(c => c.trim()));

    // Test Skip link
    const skipLinkText = await page.locator('button:has-text("Skip for now")').textContent().catch(() => null);
    console.log('Skip link text:', skipLinkText?.trim());

    // Go to wizard
    await page.goto('http://localhost:3000/onboarding/wizard', { waitUntil: 'networkidle' });
    await snap('04_wizard_step1');

    // Test submitting step 1 empty
    await page.click('button:has-text("Next")');
    await snap('04_wizard_step1_empty_error');
    const step1Err = await page.locator('p.text-red-400').textContent().catch(() => null);
    console.log('Step 1 empty error message:', step1Err?.trim());

    // Fill Step 1
    await page.fill('input[placeholder*="Street address"]', '742 Evergreen Terrace');
    await page.fill('input[placeholder*="City"]', 'Springfield');
    await page.fill('input[placeholder*="State"]', 'OR');
    await page.click('button:has-text("Next")');
    await page.waitForTimeout(500);
    await snap('04_wizard_step2');

    // Step 2 optional numbers check
    await page.click('button:has-text("Next")');
    await page.waitForTimeout(500);
    await snap('04_wizard_step3_review');


    // ── FLOW 5: PRICING & CHECKOUT ──
    console.log('\n--- FLOW 5: Pricing Page & Checkout ---');
    await page.goto('http://localhost:3000/pricing', { waitUntil: 'networkidle' });
    await snap('05_pricing_page');

    const pricingH1 = await page.locator('h1').textContent().catch(() => null);
    console.log('Pricing Page Headline:', pricingH1?.trim().replace(/\s+/g, ' '));

    const planCards = await page.locator('.glass-panel').allTextContents();
    console.log('Total plan cards found:', planCards.length);


    // ── FLOW 6: DASHBOARD LANDING ──
    console.log('\n--- FLOW 6: First Dashboard Landing ---');
    await page.goto('http://localhost:3000/dashboard/command-center', { waitUntil: 'networkidle' });
    await snap('06_command_center_empty');

    await page.goto('http://localhost:3000/dashboard/projects', { waitUntil: 'networkidle' });
    await snap('06_projects_empty_state');

    console.log('\n=== DEEP UX AUDIT COMPLETE ===');

  } catch (err) {
    console.error('Audit script error:', err);
  } finally {
    await browser.close();
  }
}

runDeepAudit();
